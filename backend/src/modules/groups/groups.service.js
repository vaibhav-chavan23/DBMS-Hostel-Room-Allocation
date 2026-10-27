const { withTransaction } = require('../../config/db');
const groupsRepository = require('./groups.repository');
const AppError = require('../../utils/AppError');

const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const createGroup = async (studentId) => {
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (membership) {
    throw new AppError('You are already a member of a group', 422, 'BUSINESS_RULE_ERROR');
  }

  // Generate unique group code
  let groupCode = generateGroupCode();
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    const existing = await groupsRepository.findGroupByCode(groupCode);
    if (!existing) {
      isUnique = true;
    } else {
      groupCode = generateGroupCode();
    }
    attempts++;
  }

  const group = await groupsRepository.createGroup({ groupCode, leaderId: studentId });
  return groupsRepository.getGroupWithMembers(group.id);
};

const joinGroup = async (studentId, groupCode) => {
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (membership) {
    throw new AppError('You are already a member of a group', 422, 'BUSINESS_RULE_ERROR');
  }

  const group = await groupsRepository.findGroupByCode(groupCode);
  if (!group) {
    throw new AppError('Group not found', 404, 'NOT_FOUND');
  }

  if (group.status !== 'FORMING') {
    throw new AppError('This group is no longer accepting members', 422, 'BUSINESS_RULE_ERROR');
  }

  const count = group._count.members;
  if (count >= 4) {
    throw new AppError('Group is already full', 422, 'BUSINESS_RULE_ERROR');
  }

  await groupsRepository.addMember({ groupId: group.id, studentId });

  const newCount = count + 1;
  if (newCount === 4) {
    // Recalculate leader: highest CGPA, tiebreak by studentId asc
    const members = await groupsRepository.getGroupMembersSortedByCgpa(group.id);
    const newLeaderId = members[0].studentId;

    await groupsRepository.updateLeaderAndStatus(group.id, newLeaderId, 'READY');
  }

  return groupsRepository.getGroupWithMembers(group.id);
};

const getMyGroup = async (studentId) => {
  const group = await groupsRepository.getGroupByStudentId(studentId);
  if (!group) {
    throw new AppError('You are not in a group', 404, 'NOT_FOUND');
  }
  return group;
};

const leaveGroup = async (studentId) => {
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (!membership) {
    throw new AppError('You are not in any group', 404, 'NOT_FOUND');
  }

  const group = membership.group;
  if (group.status !== 'FORMING' && group.status !== 'READY') {
    throw new AppError('Cannot leave group: Group is locked or allocated', 422, 'BUSINESS_RULE_ERROR');
  }

  const groupId = group.id;

  await withTransaction(async (conn) => {
    // Remove group membership and handle leader recalculation/group deletion
    await groupsRepository.removeMember({ groupId, studentId }, conn);

    // Cancel pending requests and invitations for this student
    await groupsRepository.deletePendingJoinRequestsByStudent(studentId, conn);
    await groupsRepository.deletePendingInvitationsByStudent(studentId, conn);
  });

  return { message: 'Successfully left the group' };
};

const getDiscoverableGroups = async (studentId) => {
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (membership) {
    return [];
  }

  const openGroups = await groupsRepository.getDiscoverableGroups();
  const pendingGroupIds = new Set(await groupsRepository.getStudentPendingJoinRequestGroupIds(studentId));

  return openGroups.map(group => ({
    id: group.id,
    groupCode: group.groupCode,
    memberCount: group._count.members,
    members: group.members.map(m => ({
      name: m.student.name,
      cgpa: m.student.cgpa
    })),
    isPending: pendingGroupIds.has(group.id)
  }));
};

const getUngroupedStudents = async (studentId) => {
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (!membership) {
    throw new AppError('You are not in a group', 422, 'BUSINESS_RULE_ERROR');
  }
  const groupId = membership.groupId;

  const students = await groupsRepository.getUngroupedStudents();
  const invitedStudentIds = new Set(await groupsRepository.getGroupPendingInvitedStudentIds(groupId));

  return students
    .filter(s => s.id !== studentId)
    .map(s => ({
      ...s,
      isInvited: invitedStudentIds.has(s.id)
    }));
};

const sendJoinRequest = async (studentId, groupId) => {
  const groupIntId = parseInt(groupId, 10);
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (membership) {
    throw new AppError('You are already a member of a group', 422, 'BUSINESS_RULE_ERROR');
  }

  const pendingRequest = await groupsRepository.findPendingRequestByStudentId(studentId);
  if (pendingRequest) {
    throw new AppError('You already have a pending join request. Cancel it first.', 422, 'BUSINESS_RULE_ERROR');
  }

  const pendingInvitations = await groupsRepository.getIncomingInvitations(studentId);
  if (pendingInvitations.length > 0) {
    throw new AppError('You have pending group invitations. Resolve them first.', 422, 'BUSINESS_RULE_ERROR');
  }

  const group = await groupsRepository.findGroupById(groupIntId);
  if (!group) {
    throw new AppError('Group not found', 404, 'NOT_FOUND');
  }

  if (group.status !== 'FORMING' || group._count.members >= 4) {
    throw new AppError('This group is not accepting members', 422, 'BUSINESS_RULE_ERROR');
  }

  return groupsRepository.createJoinRequest(groupIntId, studentId);
};

const cancelJoinRequest = async (studentId, requestId) => {
  const reqId = parseInt(requestId, 10);
  const request = await groupsRepository.findPendingRequestById(reqId);

  if (!request) {
    throw new AppError('Request not found', 404, 'NOT_FOUND');
  }

  if (request.studentId !== studentId) {
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  if (request.status !== 'PENDING') {
    throw new AppError('Request is already resolved', 422, 'BUSINESS_RULE_ERROR');
  }

  await groupsRepository.deleteJoinRequest(reqId);
  return { success: true };
};

const resolveJoinRequest = async (studentId, requestId, action) => {
  const reqId = parseInt(requestId, 10);
  const request = await groupsRepository.findPendingRequestById(reqId);

  if (!request || request.status !== 'PENDING') {
    throw new AppError('Request not found or already resolved', 404, 'NOT_FOUND');
  }

  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (!membership || membership.groupId !== request.groupId) {
    throw new AppError('You are not a member of the target group', 403, 'UNAUTHORIZED');
  }

  const groupId = request.groupId;
  const applicantId = request.studentId;

  if (action === 'reject') {
    await groupsRepository.updateJoinRequestStatus(reqId, 'REJECTED');
    return { success: true };
  }

  if (action !== 'accept') {
    throw new AppError('Invalid action', 400, 'BAD_REQUEST');
  }

  await withTransaction(async (conn) => {
    const applicantMembership = await groupsRepository.findMembershipByStudentId(applicantId, conn);
    if (applicantMembership) {
      throw new AppError('Applicant is already in a group', 422, 'BUSINESS_RULE_ERROR');
    }

    const count = await groupsRepository.getMemberCount(groupId, conn);
    if (count >= 4) {
      throw new AppError('Group is already full', 422, 'BUSINESS_RULE_ERROR');
    }

    await groupsRepository.addMember({ groupId, studentId: applicantId }, conn);
    await groupsRepository.updateJoinRequestStatus(reqId, 'ACCEPTED', conn);

    await groupsRepository.deletePendingJoinRequestsByStudent(applicantId, conn);
    await groupsRepository.deletePendingInvitationsByStudent(applicantId, conn);

    const newCount = count + 1;
    if (newCount === 4) {
      const groupMembers = await groupsRepository.getGroupMembersSortedByCgpa(groupId, conn);
      const newLeaderId = groupMembers[0].studentId;

      await groupsRepository.updateLeaderAndStatus(groupId, newLeaderId, 'READY', conn);
      await groupsRepository.deletePendingJoinRequestsByGroup(groupId, conn);
      await groupsRepository.deletePendingInvitationsByGroup(groupId, conn);
    }
  });

  return { success: true };
};

const sendInvitation = async (studentId, targetStudentId) => {
  const targetId = parseInt(targetStudentId, 10);
  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (!membership) {
    throw new AppError('You are not in a group', 422, 'BUSINESS_RULE_ERROR');
  }
  const groupId = membership.groupId;

  const targetMembership = await groupsRepository.findMembershipByStudentId(targetId);
  if (targetMembership) {
    throw new AppError('Student is already in a group', 422, 'BUSINESS_RULE_ERROR');
  }

  const group = await groupsRepository.findGroupById(groupId);
  if (group.status !== 'FORMING' || group._count.members >= 4) {
    throw new AppError('Group is not accepting members', 422, 'BUSINESS_RULE_ERROR');
  }

  const existingInvitation = await groupsRepository.findPendingInvitationByGroupAndStudent(groupId, targetId);
  if (existingInvitation) {
    throw new AppError('Invitation already sent to this student', 422, 'BUSINESS_RULE_ERROR');
  }

  return groupsRepository.createInvitation(groupId, targetId);
};

const cancelInvitation = async (studentId, invitationId) => {
  const inviteId = parseInt(invitationId, 10);
  const invitation = await groupsRepository.findPendingInvitationById(inviteId);

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'NOT_FOUND');
  }

  const membership = await groupsRepository.findMembershipByStudentId(studentId);
  if (!membership || membership.groupId !== invitation.groupId) {
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError('Invitation is already resolved', 422, 'BUSINESS_RULE_ERROR');
  }

  await groupsRepository.deleteInvitation(inviteId);
  return { success: true };
};

const resolveInvitation = async (studentId, invitationId, action) => {
  const inviteId = parseInt(invitationId, 10);
  const invitation = await groupsRepository.findPendingInvitationById(inviteId);

  if (!invitation || invitation.status !== 'PENDING') {
    throw new AppError('Invitation not found or already resolved', 404, 'NOT_FOUND');
  }

  if (invitation.studentId !== studentId) {
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  const groupId = invitation.groupId;

  if (action === 'reject') {
    await groupsRepository.updateInvitationStatus(inviteId, 'REJECTED');
    return { success: true };
  }

  if (action !== 'accept') {
    throw new AppError('Invalid action', 400, 'BAD_REQUEST');
  }

  await withTransaction(async (conn) => {
    const membership = await groupsRepository.findMembershipByStudentId(studentId, conn);
    if (membership) {
      throw new AppError('You are already in a group', 422, 'BUSINESS_RULE_ERROR');
    }

    const count = await groupsRepository.getMemberCount(groupId, conn);
    if (count >= 4) {
      throw new AppError('Group is already full', 422, 'BUSINESS_RULE_ERROR');
    }

    await groupsRepository.addMember({ groupId, studentId }, conn);
    await groupsRepository.updateInvitationStatus(inviteId, 'ACCEPTED', conn);

    await groupsRepository.deletePendingJoinRequestsByStudent(studentId, conn);
    await groupsRepository.deletePendingInvitationsByStudent(studentId, conn);

    const newCount = count + 1;
    if (newCount === 4) {
      const groupMembers = await groupsRepository.getGroupMembersSortedByCgpa(groupId, conn);
      const newLeaderId = groupMembers[0].studentId;

      await groupsRepository.updateLeaderAndStatus(groupId, newLeaderId, 'READY', conn);
      await groupsRepository.deletePendingJoinRequestsByGroup(groupId, conn);
      await groupsRepository.deletePendingInvitationsByGroup(groupId, conn);
    }
  });

  return { success: true };
};

const getPendingReqsAndInvites = async (studentId) => {
  const membership = await groupsRepository.findMembershipByStudentId(studentId);

  const outgoingRequests = await groupsRepository.getOutgoingRequests(studentId);
  const incomingInvitations = await groupsRepository.getIncomingInvitations(studentId);

  let incomingRequests = [];
  let outgoingInvitations = [];

  if (membership) {
    const groupId = membership.groupId;
    incomingRequests = await groupsRepository.getIncomingRequests(groupId);
    outgoingInvitations = await groupsRepository.getOutgoingInvitations(groupId);
  }

  return {
    outgoingRequests,
    incomingInvitations,
    incomingRequests,
    outgoingInvitations
  };
};

module.exports = {
  createGroup,
  joinGroup,
  getMyGroup,
  leaveGroup,
  getDiscoverableGroups,
  getUngroupedStudents,
  sendJoinRequest,
  cancelJoinRequest,
  resolveJoinRequest,
  sendInvitation,
  cancelInvitation,
  resolveInvitation,
  getPendingReqsAndInvites
};
