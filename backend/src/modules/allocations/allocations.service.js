const { withTransaction } = require('../../config/db');
const allocationsRepository = require('./allocations.repository');
const groupsRepository = require('../groups/groups.repository');
const AppError = require('../../utils/AppError');

const runAllocation = async () => {
  return withTransaction(async (conn) => {
    const eligibleGroups = await allocationsRepository.getEligibleGroups(conn);

    let allocatedCount = 0;
    let waitingCount = 0;
    const allocatedRoomIds = new Set();
    let maxWaitingPos = await allocationsRepository.getMaxWaitingPosition(conn);

    for (const group of eligibleGroups) {
      const preferences = await allocationsRepository.getPreferencesForGroup(group.id, conn);

      let allocated = false;
      for (const pref of preferences) {
        const freshRoom = await allocationsRepository.getRoomForUpdate(pref.roomId, conn);

        if (freshRoom && freshRoom.status === 'available' && !allocatedRoomIds.has(freshRoom.id)) {
          await allocationsRepository.allocateRoom({ groupId: group.id, roomId: freshRoom.id }, conn);
          allocatedRoomIds.add(freshRoom.id);

          await allocationsRepository.logActivity(
            'ALLOCATION',
            `Group [${group.groupCode}] Allocated Room [${freshRoom.roomNumber}]`,
            conn
          );

          allocatedCount++;
          allocated = true;
          break;
        }
      }

      if (!allocated) {
        maxWaitingPos++;
        await allocationsRepository.addToWaitingList(group.id, maxWaitingPos, conn);

        await allocationsRepository.logActivity(
          'WAITING_LIST',
          `Group [${group.groupCode}] Added to Waiting List`,
          conn
        );

        waitingCount++;
      }
    }

    await allocationsRepository.logActivity(
      'ALLOCATION_RUN',
      `Allocation Run Completed. Allocated: ${allocatedCount}, Waiting: ${waitingCount}`,
      conn
    );

    return { allocatedCount, waitingCount };
  });
};

const getMyResult = async (studentId) => {
  const group = await groupsRepository.getGroupByStudentId(studentId);
  if (!group) {
    throw new AppError('You are not in a group', 404, 'NOT_FOUND');
  }

  if (group.status === 'ALLOCATED') {
    const allocation = await allocationsRepository.getAllocationByGroupId(group.id);
    const vacateRequest = await allocationsRepository.getLatestVacateRequestByGroupId(group.id);
    return {
      status: 'ALLOCATED',
      allocation,
      vacateRequest
    };
  }

  if (group.status === 'WAITING') {
    const waitingEntry = await allocationsRepository.getWaitingPositionByGroupId(group.id);
    return {
      status: 'WAITING',
      position: waitingEntry ? waitingEntry.position : null
    };
  }

  return null;
};

const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const mergeAndAutoAllocate = async () => {
  // 1. Ensure all groups who submitted preferences are already allocated
  const preferencesSubmittedCount = await allocationsRepository.countPreferencesSubmittedGroups();

  if (preferencesSubmittedCount > 0) {
    throw new AppError(
      'Standard allocation has not been completed. Please run standard allocation first to allot rooms to groups who submitted preferences.',
      422,
      'BUSINESS_RULE_ERROR'
    );
  }

  return withTransaction(async (conn) => {
    // 2. Disband all incomplete groups (status FORMING or READY)
    const incompleteGroups = await allocationsRepository.getIncompleteGroups(conn);
    const incompleteGroupIds = incompleteGroups.map(g => g.id);
    if (incompleteGroupIds.length > 0) {
      await allocationsRepository.disbandIncompleteGroups(incompleteGroupIds, conn);
    }

    // 3. Find all students without groups
    const ungroupedStudents = await allocationsRepository.getUngroupedStudents(conn);

    if (ungroupedStudents.length < 4) {
      throw new AppError(
        `Not enough ungrouped students to form a group of 4 (only ${ungroupedStudents.length} available).`,
        422,
        'BUSINESS_RULE_ERROR'
      );
    }

    // Shuffle students
    const shuffleArray = (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const shuffledStudents = shuffleArray(ungroupedStudents);

    // 4. Fetch available rooms
    const availableRooms = await allocationsRepository.getAvailableRoomsWithHostel(conn);
    const shuffledRooms = shuffleArray(availableRooms);

    let maxWaitingPos = await allocationsRepository.getMaxWaitingPosition(conn);
    let FormedGroupsCount = 0;
    let allocatedCount = 0;
    let waitingCount = 0;

    // 5. Partition students into groups of 4
    for (let i = 0; i < shuffledStudents.length - 3; i += 4) {
      const groupStudents = shuffledStudents.slice(i, i + 4);

      // Elect leader: highest CGPA, tiebreak lower student ID
      groupStudents.sort((a, b) => {
        const cgpaA = parseFloat(a.cgpa);
        const cgpaB = parseFloat(b.cgpa);
        if (cgpaB !== cgpaA) return cgpaB - cgpaA;
        return a.id - b.id;
      });

      const leaderId = groupStudents[0].id;

      // Generate unique group code
      let groupCode = generateGroupCode();
      let isUnique = false;
      while (!isUnique) {
        const exists = await allocationsRepository.checkGroupCodeExists(groupCode, conn);
        if (!exists) {
          isUnique = true;
        } else {
          groupCode = generateGroupCode();
        }
      }

      // Create group and members
      const group = await allocationsRepository.createGroupWithMembers({
        groupCode,
        leaderId,
        memberIds: groupStudents.map(s => s.id)
      }, conn);

      // Allocate room or add to waitlist
      if (shuffledRooms.length > 0) {
        const room = shuffledRooms.pop();

        await allocationsRepository.allocateRoom({ groupId: group.id, roomId: room.id }, conn);

        await allocationsRepository.logActivity(
          'MERGE_ALLOCATE',
          `Randomly Formed Group [${groupCode}] Allocated Room [${room.roomNumber}]`,
          conn
        );

        allocatedCount++;
      } else {
        maxWaitingPos++;
        await allocationsRepository.addToWaitingList(group.id, maxWaitingPos, conn);

        await allocationsRepository.logActivity(
          'MERGE_WAITING',
          `Randomly Formed Group [${groupCode}] Added to Waiting List`,
          conn
        );

        waitingCount++;
      }

      FormedGroupsCount++;
    }

    await allocationsRepository.logActivity(
      'MERGE_RUN',
      `Merge & Auto-allocate Run Completed. Formed: ${FormedGroupsCount} groups. Allocated: ${allocatedCount}, Waiting: ${waitingCount}`,
      conn
    );

    return { FormedGroupsCount, allocatedCount, waitingCount };
  });
};

module.exports = {
  runAllocation,
  getMyResult,
  mergeAndAutoAllocate
};
