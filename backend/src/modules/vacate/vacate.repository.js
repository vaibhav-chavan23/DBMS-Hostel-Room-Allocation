const { pool } = require('../../config/db');

// Helper to map joined vacate request row to nested object
const mapVacateRequest = (row) => ({
  id: row.id,
  groupId: row.groupId,
  requestedBy: row.requestedBy,
  reason: row.reason,
  status: row.status,
  requestedAt: row.requestedAt,
  resolvedAt: row.resolvedAt,
  group: {
    id: row.groupId,
    groupCode: row.groupCode,
    leaderId: row.leaderId,
    status: row.groupStatus,
    createdAt: row.groupCreatedAt,
    allocation: row.allocId ? {
      id: row.allocId,
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
    } : null
  },
  ...(row.studentId ? {
    student: {
      id: row.studentId,
      name: row.studentName,
      email: row.studentEmail,
      branch: row.studentBranch,
      cgpa: row.studentCgpa
    }
  } : {})
});

// Creates a new pending vacate request
const createRequest = async ({ groupId, requestedBy, reason }, conn = pool) => {
  const [result] = await conn.execute(
    "INSERT INTO vacate_requests (groupId, requestedBy, reason, status) VALUES (?, ?, ?, 'pending')",
    [groupId, requestedBy, reason || null]
  );
  const [rows] = await conn.execute('SELECT * FROM vacate_requests WHERE id = ?', [result.insertId]);
  return rows[0];
};

// Retrieves all pending vacate requests with nested group, allocation, room, and student
const findPendingRequests = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT vr.*,
            g.groupCode, g.leaderId, g.status AS groupStatus, g.createdAt AS groupCreatedAt,
            a.id AS allocId, a.allocatedAt, a.allocatedBy,
            r.id AS roomId, r.hostelId, r.roomNumber, r.capacity, r.status AS roomStatus,
            h.name AS hostelName,
            s.id AS studentId, s.name AS studentName, s.email AS studentEmail, s.branch AS studentBranch, s.cgpa AS studentCgpa
     FROM vacate_requests vr
     INNER JOIN \`groups\` g ON vr.groupId = g.id
     INNER JOIN students s ON vr.requestedBy = s.id
     LEFT JOIN allocations a ON g.id = a.groupId
     LEFT JOIN rooms r ON a.roomId = r.id
     LEFT JOIN hostels h ON r.hostelId = h.id
     WHERE vr.status = 'pending'
     ORDER BY vr.requestedAt DESC`
  );
  return rows.map(mapVacateRequest);
};

// Finds a specific vacate request by ID with nested room and group data
const findRequestById = async (id, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT vr.*,
            g.groupCode, g.leaderId, g.status AS groupStatus, g.createdAt AS groupCreatedAt,
            a.id AS allocId, a.allocatedAt, a.allocatedBy,
            r.id AS roomId, r.hostelId, r.roomNumber, r.capacity, r.status AS roomStatus,
            h.name AS hostelName
     FROM vacate_requests vr
     INNER JOIN \`groups\` g ON vr.groupId = g.id
     LEFT JOIN allocations a ON g.id = a.groupId
     LEFT JOIN rooms r ON a.roomId = r.id
     LEFT JOIN hostels h ON r.hostelId = h.id
     WHERE vr.id = ?`,
    [id]
  );
  return rows.length ? mapVacateRequest(rows[0]) : null;
};

// Checks if a group already has an active pending vacate request
const findPendingRequestByGroupId = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    "SELECT * FROM vacate_requests WHERE groupId = ? AND status = 'pending' LIMIT 1",
    [groupId]
  );
  return rows[0] || null;
};

// Fetches allocation for a given group
const getAllocationByGroupId = async (groupId, conn = pool) => {
  const [rows] = await conn.execute('SELECT * FROM allocations WHERE groupId = ?', [groupId]);
  return rows[0] || null;
};

// Fetches room details including hostel for logging
const getRoomWithHostel = async (roomId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT r.*, h.name AS hostelName
     FROM rooms r
     INNER JOIN hostels h ON r.hostelId = h.id
     WHERE r.id = ?`,
    [roomId]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    hostelId: r.hostelId,
    roomNumber: r.roomNumber,
    capacity: r.capacity,
    status: r.status,
    hostel: {
      name: r.hostelName
    }
  };
};

// Marks a vacate request as approved
const approveRequest = async (id, conn = pool) => {
  await conn.execute(
    "UPDATE vacate_requests SET status = 'approved', resolvedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [id]
  );
};

// Marks a vacate request as rejected
const rejectRequest = async (id, conn = pool) => {
  await conn.execute(
    "UPDATE vacate_requests SET status = 'rejected', resolvedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [id]
  );
};

// Gets the first group in the waiting list (position = 1) for promotion
const getFirstWaitingGroup = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT wl.*, g.groupCode
     FROM waiting_list wl
     INNER JOIN \`groups\` g ON wl.groupId = g.id
     ORDER BY wl.position ASC
     LIMIT 1`
  );
  if (!rows.length) return null;
  return {
    id: rows[0].id,
    groupId: rows[0].groupId,
    position: rows[0].position,
    group: {
      groupCode: rows[0].groupCode
    }
  };
};

// Removes a group from the waiting list
const removeFromWaitingList = async (groupId, conn = pool) => {
  await conn.execute('DELETE FROM waiting_list WHERE groupId = ?', [groupId]);
};

// Decrements positions of all waiting groups behind the promoted group
const decrementWaitingPositions = async (afterPosition, conn = pool) => {
  await conn.execute(
    'UPDATE waiting_list SET position = position - 1 WHERE position > ?',
    [afterPosition]
  );
};

// Updates room status back to available
const freeRoom = async (roomId, conn = pool) => {
  await conn.execute("UPDATE rooms SET status = 'available' WHERE id = ?", [roomId]);
};

// Deletes the allocation entry for a vacating group
const deleteAllocation = async (groupId, conn = pool) => {
  await conn.execute('DELETE FROM allocations WHERE groupId = ?', [groupId]);
};

// Updates group lifecycle status
const updateGroupStatus = async (groupId, status, conn = pool) => {
  await conn.execute("UPDATE `groups` SET status = ? WHERE id = ?", [status, groupId]);
};

// Assigns room to promoted group and updates room and group status
const allocateRoom = async ({ groupId, roomId }, conn = pool) => {
  await conn.execute("INSERT INTO allocations (groupId, roomId, allocatedBy) VALUES (?, ?, 'system')", [groupId, roomId]);
  await conn.execute("UPDATE rooms SET status = 'allocated' WHERE id = ?", [roomId]);
  await conn.execute("UPDATE `groups` SET status = 'ALLOCATED' WHERE id = ?", [groupId]);
};

// Logs system actions to activity_log table
const logActivity = async (eventType, description, conn = pool) => {
  await conn.execute('INSERT INTO activity_log (eventType, description) VALUES (?, ?)', [eventType, description]);
};

module.exports = {
  createRequest,
  findPendingRequests,
  findRequestById,
  findPendingRequestByGroupId,
  getAllocationByGroupId,
  getRoomWithHostel,
  approveRequest,
  rejectRequest,
  getFirstWaitingGroup,
  removeFromWaitingList,
  decrementWaitingPositions,
  freeRoom,
  deleteAllocation,
  updateGroupStatus,
  allocateRoom,
  logActivity
};
