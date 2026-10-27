const { pool } = require('../../config/db');

// Retrieves all registered students with their groupCode if any
const getAllStudents = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT s.id, s.name, s.email, s.cgpa, s.branch, s.role, s.createdAt, g.groupCode
     FROM students s
     LEFT JOIN group_members gm ON s.id = gm.studentId
     LEFT JOIN \`groups\` g ON gm.groupId = g.id
     WHERE s.role = 'student'
     ORDER BY s.id ASC`
  );
  return rows;
};

// Retrieves all groups with leader info and member counts
const getAllGroups = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT g.id, g.groupCode, s.name AS leaderName, s.cgpa AS leaderCgpa,
            COUNT(gm.studentId) AS memberCount, g.status, g.createdAt
     FROM \`groups\` g
     LEFT JOIN students s ON g.leaderId = s.id
     LEFT JOIN group_members gm ON g.id = gm.groupId
     GROUP BY g.id, g.groupCode, s.name, s.cgpa, g.status, g.createdAt
     ORDER BY g.id ASC`
  );
  return rows;
};

// Retrieves all rooms joined with hostel building names
const getAllRooms = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT r.*, h.name AS hostelName
     FROM rooms r
     INNER JOIN hostels h ON r.hostelId = h.id
     ORDER BY r.hostelId ASC, CAST(r.roomNumber AS UNSIGNED) ASC, r.roomNumber ASC`
  );
  return rows;
};

// Retrieves the ordered waiting list with group and leader details
const getWaitingList = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT wl.id, wl.position, g.groupCode, s.name AS leaderName, s.cgpa AS leaderCgpa, wl.addedAt
     FROM waiting_list wl
     INNER JOIN \`groups\` g ON wl.groupId = g.id
     LEFT JOIN students s ON g.leaderId = s.id
     ORDER BY wl.position ASC`
  );
  return rows;
};

// Fetches dashboard statistics in a single subquery block
const getStats = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT 
       (SELECT COUNT(*) FROM students WHERE role = 'student') AS totalStudents,
       (SELECT COUNT(*) FROM \`groups\`) AS totalGroups,
       (SELECT COUNT(*) FROM rooms) AS totalRooms,
       (SELECT COUNT(*) FROM \`groups\` WHERE status = 'ALLOCATED') AS allocatedGroups,
       (SELECT COUNT(*) FROM \`groups\` WHERE status = 'WAITING') AS waitingGroups`
  );

  const row = rows[0] || {};
  return {
    totalStudents: Number(row.totalStudents || 0),
    totalGroups: Number(row.totalGroups || 0),
    totalRooms: Number(row.totalRooms || 0),
    allocatedGroups: Number(row.allocatedGroups || 0),
    waitingGroups: Number(row.waitingGroups || 0)
  };
};

// Retrieves the 20 most recent system activity logs
const getRecentActivity = async (conn = pool) => {
  const [rows] = await conn.execute(
    'SELECT * FROM activity_log ORDER BY createdAt DESC LIMIT 20'
  );
  return rows;
};

module.exports = {
  getAllStudents,
  getAllGroups,
  getAllRooms,
  getWaitingList,
  getStats,
  getRecentActivity
};
