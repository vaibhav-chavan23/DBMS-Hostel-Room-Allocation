const { pool } = require('../../config/db');

// Helpers for nested mapping
const withLeader = (r) => ({
  id: r.id,
  groupCode: r.groupCode,
  leaderId: r.leaderId,
  status: r.status,
  createdAt: r.createdAt,
  leader: {
    id: r.leaderId,
    name: r.leaderName,
    email: r.leaderEmail,
    cgpa: r.leaderCgpa,
    branch: r.leaderBranch
  }
});

const withRoom = (r) => ({
  id: r.id,
  groupId: r.groupId,
  roomId: r.roomId,
  preferenceOrder: r.preferenceOrder,
  room: {
    id: r.roomId,
    hostelId: r.hostelId,
    roomNumber: r.roomNumber,
    capacity: r.capacity,
    status: r.roomStatus || r.status
  }
});

// Retrieves groups that submitted preferences, ordered by Leader CGPA DESC
const getEligibleGroups = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT g.*, s.name AS leaderName, s.email AS leaderEmail, s.cgpa AS leaderCgpa, s.branch AS leaderBranch
     FROM \`groups\` g
     INNER JOIN students s ON g.leaderId = s.id
     WHERE g.status = 'PREFERENCES_SUBMITTED'
     ORDER BY s.cgpa DESC, g.id ASC`
  );
  return rows.map(withLeader);
};

// Gets ranked preferences for a specific group
const getPreferencesForGroup = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT rp.*, r.roomNumber, r.capacity, r.status AS roomStatus, r.hostelId
     FROM room_preferences rp
     INNER JOIN rooms r ON rp.roomId = r.id
     WHERE rp.groupId = ?
     ORDER BY rp.preferenceOrder ASC`,
    [groupId]
  );
  return rows.map(withRoom);
};

// Fetches room with exclusive FOR UPDATE lock
const getRoomForUpdate = async (roomId, conn = pool) => {
  const [rows] = await conn.execute('SELECT * FROM rooms WHERE id = ? FOR UPDATE', [roomId]);
  return rows[0] || null;
};

// Checks if a room is available
const isRoomAvailable = async (roomId, conn = pool) => {
  const room = await getRoomForUpdate(roomId, conn);
  return room?.status === 'available';
};

// Allocates room to a group and updates statuses
const allocateRoom = async ({ groupId, roomId }, conn = pool) => {
  await conn.execute("INSERT INTO allocations (groupId, roomId, allocatedBy) VALUES (?, ?, 'system')", [groupId, roomId]);
  await conn.execute("UPDATE rooms SET status = 'allocated' WHERE id = ?", [roomId]);
  await conn.execute("UPDATE `groups` SET status = 'ALLOCATED' WHERE id = ?", [groupId]);
};

// Adds group to waiting list at specified position
const addToWaitingList = async (groupId, position, conn = pool) => {
  await conn.execute('INSERT INTO waiting_list (groupId, position) VALUES (?, ?)', [groupId, position]);
  await conn.execute("UPDATE `groups` SET status = 'WAITING' WHERE id = ?", [groupId]);
};

// Retrieves current maximum waiting list position
const getMaxWaitingPosition = async (conn = pool) => {
  const [rows] = await conn.execute('SELECT COALESCE(MAX(position), 0) AS maxPos FROM waiting_list');
  return Number(rows[0].maxPos || 0);
};

// Finds allocation details by group ID
const getAllocationByGroupId = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT a.*, r.hostelId, r.roomNumber, r.capacity, r.status AS roomStatus,
            h.name AS hostelName
     FROM allocations a
     INNER JOIN rooms r ON a.roomId = r.id
     INNER JOIN hostels h ON r.hostelId = h.id
     WHERE a.groupId = ?`,
    [groupId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    groupId: row.groupId,
    roomId: row.roomId,
    allocatedAt: row.allocatedAt,
    allocatedBy: row.allocatedBy,
    room: {
      id: row.roomId,
      hostelId: row.hostelId,
      roomNumber: row.roomNumber,
      capacity: row.capacity,
      status: row.roomStatus,
      hostel: {
        id: row.hostelId,
        name: row.hostelName
      }
    }
  };
};

// Finds waiting list position for a group
const getWaitingPositionByGroupId = async (groupId, conn = pool) => {
  const [rows] = await conn.execute('SELECT * FROM waiting_list WHERE groupId = ?', [groupId]);
  return rows[0] || null;
};

// Retrieves most recent vacate request for a group
const getLatestVacateRequestByGroupId = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    'SELECT * FROM vacate_requests WHERE groupId = ? ORDER BY requestedAt DESC LIMIT 1',
    [groupId]
  );
  return rows[0] || null;
};

// Retrieves all allocations with nested group, leader, room, and hostel
const getAllAllocations = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT a.*, 
            g.groupCode, g.leaderId, g.status AS groupStatus,
            s.name AS leaderName, s.email AS leaderEmail, s.cgpa AS leaderCgpa, s.branch AS leaderBranch,
            r.roomNumber, r.capacity, r.status AS roomStatus, r.hostelId,
            h.name AS hostelName
     FROM allocations a
     INNER JOIN \`groups\` g ON a.groupId = g.id
     INNER JOIN students s ON g.leaderId = s.id
     INNER JOIN rooms r ON a.roomId = r.id
     INNER JOIN hostels h ON r.hostelId = h.id
     ORDER BY a.allocatedAt DESC`
  );

  return rows.map(row => ({
    id: row.id,
    groupId: row.groupId,
    roomId: row.roomId,
    allocatedAt: row.allocatedAt,
    allocatedBy: row.allocatedBy,
    group: {
      id: row.groupId,
      groupCode: row.groupCode,
      leaderId: row.leaderId,
      status: row.groupStatus,
      leader: {
        name: row.leaderName,
        email: row.leaderEmail,
        cgpa: row.leaderCgpa,
        branch: row.leaderBranch
      }
    },
    room: {
      id: row.roomId,
      hostelId: row.hostelId,
      roomNumber: row.roomNumber,
      capacity: row.capacity,
      status: row.roomStatus,
      hostel: {
        id: row.hostelId,
        name: row.hostelName
      }
    }
  }));
};

// Counts groups with status = 'PREFERENCES_SUBMITTED'
const countPreferencesSubmittedGroups = async (conn = pool) => {
  const [rows] = await conn.execute("SELECT COUNT(*) AS total FROM `groups` WHERE status = 'PREFERENCES_SUBMITTED'");
  return Number(rows[0].total || 0);
};

// Finds incomplete groups eligible for auto-merging
const getIncompleteGroups = async (conn = pool) => {
  const [rows] = await conn.execute("SELECT id FROM `groups` WHERE status IN ('FORMING', 'READY')");
  return rows;
};

// Disbands incomplete groups by deleting from `groups` (group_members cascades)
const disbandIncompleteGroups = async (groupIds, conn = pool) => {
  if (!groupIds?.length) return;
  await conn.query("DELETE FROM `groups` WHERE id IN (?)", [groupIds]);
};

// Finds students without any group membership
const getUngroupedStudents = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT s.id, s.name, s.email, s.cgpa, s.branch, s.role
     FROM students s
     WHERE s.role = 'student'
       AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.studentId = s.id)`
  );
  return rows;
};

// Fetches available rooms with hostel info with FOR UPDATE lock
const getAvailableRoomsWithHostel = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT r.*, h.name AS hostelName
     FROM rooms r
     INNER JOIN hostels h ON r.hostelId = h.id
     WHERE r.status = 'available'
     FOR UPDATE`
  );

  return rows.map(r => ({
    id: r.id,
    hostelId: r.hostelId,
    roomNumber: r.roomNumber,
    capacity: r.capacity,
    status: r.status,
    hostel: {
      id: r.hostelId,
      name: r.hostelName
    }
  }));
};

// Checks whether a given groupCode already exists
const checkGroupCodeExists = async (groupCode, conn = pool) => {
  const [rows] = await conn.execute("SELECT id FROM `groups` WHERE groupCode = ?", [groupCode]);
  return rows.length > 0;
};

// Creates a merged group and attaches members in bulk
const createGroupWithMembers = async ({ groupCode, leaderId, memberIds }, conn = pool) => {
  const [res] = await conn.execute(
    "INSERT INTO `groups` (groupCode, leaderId, status) VALUES (?, ?, 'FORMING')",
    [groupCode, leaderId]
  );
  const groupId = res.insertId;

  try {
    await conn.query(
      'INSERT INTO group_members (groupId, studentId) VALUES ?',
      [memberIds.map(id => [groupId, id])]
    );
  } catch (err) {
    if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
      const AppError = require('../../utils/AppError');
      throw new AppError('Student is already in a group', 409, 'CONFLICT');
    }
    throw err;
  }

  return { id: groupId, groupCode, leaderId };
};

// Records activity in system audit log
const logActivity = async (eventType, description, conn = pool) => {
  await conn.execute('INSERT INTO activity_log (eventType, description) VALUES (?, ?)', [eventType, description]);
};

module.exports = {
  getEligibleGroups,
  getPreferencesForGroup,
  getRoomForUpdate,
  isRoomAvailable,
  allocateRoom,
  addToWaitingList,
  getMaxWaitingPosition,
  getAllocationByGroupId,
  getWaitingPositionByGroupId,
  getLatestVacateRequestByGroupId,
  getAllAllocations,
  countPreferencesSubmittedGroups,
  getIncompleteGroups,
  disbandIncompleteGroups,
  getUngroupedStudents,
  getAvailableRoomsWithHostel,
  checkGroupCodeExists,
  createGroupWithMembers,
  logActivity
};
