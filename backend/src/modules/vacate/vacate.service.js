const { withTransaction } = require('../../config/db');
const vacateRepository = require('./vacate.repository');
const groupsRepository = require('../groups/groups.repository');
const AppError = require('../../utils/AppError');

const submitVacateRequest = async (studentId, reason) => {
  const group = await groupsRepository.getGroupByStudentId(studentId);
  if (!group) {
    throw new AppError('You are not in a group', 404, 'NOT_FOUND');
  }

  if (group.status !== 'ALLOCATED') {
    throw new AppError('Only groups with allocated rooms can submit vacate requests', 422, 'BUSINESS_RULE_ERROR');
  }

  const existingRequest = await vacateRepository.findPendingRequestByGroupId(group.id);
  if (existingRequest) {
    throw new AppError('You already have a pending vacate request', 422, 'BUSINESS_RULE_ERROR');
  }

  return vacateRepository.createRequest({
    groupId: group.id,
    requestedBy: studentId,
    reason
  });
};

const approveVacateRequest = async (requestId) => {
  const request = await vacateRepository.findRequestById(requestId);
  if (!request) {
    throw new AppError('Vacate request not found', 404, 'NOT_FOUND');
  }

  if (request.status !== 'pending') {
    throw new AppError('Vacate request is not pending', 422, 'BUSINESS_RULE_ERROR');
  }

  const groupId = request.groupId;

  await withTransaction(async (conn) => {
    const allocation = await vacateRepository.getAllocationByGroupId(groupId, conn);
    if (!allocation) {
      throw new AppError('No room allocation found for this group', 404, 'NOT_FOUND');
    }

    const roomId = allocation.roomId;
    const room = await vacateRepository.getRoomWithHostel(roomId, conn);

    // Delete current allocation
    await vacateRepository.deleteAllocation(groupId, conn);

    // Mark room available
    await vacateRepository.freeRoom(roomId, conn);

    // Disband vacating group back to FORMING
    await vacateRepository.updateGroupStatus(groupId, 'FORMING', conn);

    const roomName = room ? `${room.hostel.name} - Room ${room.roomNumber}` : `Room ID ${roomId}`;
    await vacateRepository.logActivity('VACATE_APPROVE', `Vacate Request Approved — Room [${roomName}] freed`, conn);

    // Check waiting list for top candidate
    const firstWaiting = await vacateRepository.getFirstWaitingGroup(conn);

    if (firstWaiting) {
      const waitingGroupId = firstWaiting.groupId;
      const removedPosition = firstWaiting.position;

      // Allocate room to top waitlisted group
      await vacateRepository.allocateRoom({ groupId: waitingGroupId, roomId }, conn);

      // Remove from waitlist
      await vacateRepository.removeFromWaitingList(waitingGroupId, conn);

      // Shift remaining waiting list positions
      await vacateRepository.decrementWaitingPositions(removedPosition, conn);

      await vacateRepository.logActivity(
        'PROMOTION',
        `Waiting Group [${firstWaiting.group.groupCode}] Promoted to Room [${room ? room.roomNumber : roomId}]`,
        conn
      );
    }

    // Mark request approved
    await vacateRepository.approveRequest(requestId, conn);
  });

  return { message: 'Vacate request approved successfully' };
};

const rejectVacateRequest = async (requestId) => {
  const request = await vacateRepository.findRequestById(requestId);
  if (!request) {
    throw new AppError('Vacate request not found', 404, 'NOT_FOUND');
  }

  if (request.status !== 'pending') {
    throw new AppError('Vacate request is not pending', 422, 'BUSINESS_RULE_ERROR');
  }

  await vacateRepository.rejectRequest(requestId);
  return { message: 'Vacate request rejected successfully' };
};

module.exports = {
  submitVacateRequest,
  approveVacateRequest,
  rejectVacateRequest
};
