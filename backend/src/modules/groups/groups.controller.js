const groupsService = require('./groups.service');
const asyncHandler = require('../../utils/asyncHandler');

const createGroup = asyncHandler(async (req, res) => {
  const data = await groupsService.createGroup(req.user.id);
  return res.status(201).json({
    success: true,
    data,
    message: 'Group created successfully'
  });
});

const joinGroup = asyncHandler(async (req, res) => {
  const { group_code } = req.body;
  const data = await groupsService.joinGroup(req.user.id, group_code);
  return res.status(200).json({
    success: true,
    data,
    message: 'Joined group successfully'
  });
});

const getMyGroup = asyncHandler(async (req, res) => {
  const data = await groupsService.getMyGroup(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const data = await groupsService.leaveGroup(req.user.id);
  return res.status(200).json({
    success: true,
    data,
    message: data.message
  });
});

const getDiscoverableGroups = asyncHandler(async (req, res) => {
  const data = await groupsService.getDiscoverableGroups(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

const getUngroupedStudents = asyncHandler(async (req, res) => {
  const data = await groupsService.getUngroupedStudents(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

const sendJoinRequest = asyncHandler(async (req, res) => {
  const { groupId } = req.body;
  const data = await groupsService.sendJoinRequest(req.user.id, groupId);
  return res.status(201).json({
    success: true,
    data,
    message: 'Join request sent successfully'
  });
});

const cancelJoinRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const data = await groupsService.cancelJoinRequest(req.user.id, requestId);
  return res.status(200).json({
    success: true,
    data,
    message: 'Join request cancelled successfully'
  });
});

const resolveJoinRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body;
  const data = await groupsService.resolveJoinRequest(req.user.id, requestId, action);
  return res.status(200).json({
    success: true,
    data,
    message: `Join request ${action}ed successfully`
  });
});

const sendInvitation = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const data = await groupsService.sendInvitation(req.user.id, studentId);
  return res.status(201).json({
    success: true,
    data,
    message: 'Invitation sent successfully'
  });
});

const cancelInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const data = await groupsService.cancelInvitation(req.user.id, invitationId);
  return res.status(200).json({
    success: true,
    data,
    message: 'Invitation cancelled successfully'
  });
});

const resolveInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const { action } = req.body;
  const data = await groupsService.resolveInvitation(req.user.id, invitationId, action);
  return res.status(200).json({
    success: true,
    data,
    message: `Invitation ${action}ed successfully`
  });
});

const getPendingReqsAndInvites = asyncHandler(async (req, res) => {
  const data = await groupsService.getPendingReqsAndInvites(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

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
