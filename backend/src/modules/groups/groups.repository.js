const { pool, withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');

const withMemberCount = r => r ? ({
  id: r.id,
  groupCode: r.groupCode,
  leaderId: r.leaderId,
  status: r.status,
  createdAt: r.createdAt,
  _count: { members: Number(r.memberCount || 0) }
}) : null;

const withApplicant = r => ({
  id: r.id,
  groupId: r.groupId,
  studentId: r.studentId,
  status: r.status,
  createdAt: r.createdAt,
  student: { id: r.s_id, name: r.name, cgpa: r.cgpa, branch: r.branch }
});

const attachGroupMembers = async (items, conn) => {
  for (const item of items) {
    const [members] = await conn.execute(
      `SELECT gm.*, s.id AS s_id, s.name, s.cgpa, s.branch, s.email
       FROM group_members gm
       INNER JOIN students s ON gm.studentId = s.id
       WHERE gm.groupId = ?`,
      [item.groupId]
    );
    item.group = {
      id: item.g_id,
      groupCode: item.groupCode,
      leaderId: item.leaderId,
      status: item.group_status,
      members: members.map(m => ({
        groupId: m.groupId,
        studentId: m.studentId,
        joinedAt: m.joinedAt,
        student: { id: m.s_id, name: m.name, cgpa: m.cgpa, branch: m.branch, email: m.email }
      }))
    };
  }
  return items;
};

// Finds student active group membership with group metadata
const findMembershipByStudentId = async (studentId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT gm.*, g.id AS g_id, g.groupCode, g.leaderId, g.status AS group_status, g.createdAt AS group_createdAt
     FROM group_members gm
     INNER JOIN \`groups\` g ON gm.groupId = g.id
     WHERE gm.studentId = ?`,
    [studentId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    groupId: r.groupId,
    studentId: r.studentId,
    joinedAt: r.joinedAt,
    group: { id: r.g_id, groupCode: r.groupCode, leaderId: r.leaderId, status: r.group_status, createdAt: r.group_createdAt }
  };
};

// Creates a new group and enrolls the creator as leader
const createGroup = async ({ groupCode, leaderId }, externalConn = null) => {
  const executeOperation = async (conn) => {
    const [result] = await conn.execute(
      "INSERT INTO `groups` (groupCode, leaderId, status) VALUES (?, ?, 'FORMING')",
      [groupCode, leaderId]
    );
    const groupId = result.insertId;

    try {
      await conn.execute('INSERT INTO group_members (groupId, studentId) VALUES (?, ?)', [groupId, leaderId]);
    } catch (err) {
      if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
        throw new AppError('Student is already in a group', 409, 'CONFLICT');
      }
      throw err;
    }

    const [rows] = await conn.execute("SELECT * FROM `groups` WHERE id = ?", [groupId]);
    return rows[0];
  };

  return externalConn ? executeOperation(externalConn) : withTransaction(executeOperation);
};

// Finds a group by groupCode with member count
const findGroupByCode = async (groupCode, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT g.*, COUNT(gm.studentId) AS memberCount
     FROM \`groups\` g
     LEFT JOIN group_members gm ON g.id = gm.groupId
     WHERE g.groupCode = ?
     GROUP BY g.id`,
    [groupCode]
  );
  return withMemberCount(rows[0]);
};

// Finds a group by ID with member count
const findGroupById = async (id, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT g.*, COUNT(gm.studentId) AS memberCount
     FROM \`groups\` g
     LEFT JOIN group_members gm ON g.id = gm.groupId
     WHERE g.id = ?
     GROUP BY g.id`,
    [id]
  );
  return withMemberCount(rows[0]);
};

// Adds a student into group_members table
const addMember = async ({ groupId, studentId }, conn = pool) => {
  try {
    await conn.execute('INSERT INTO group_members (groupId, studentId) VALUES (?, ?)', [groupId, studentId]);
  } catch (err) {
    if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
      throw new AppError('Student is already in a group', 409, 'CONFLICT');
    }
    throw err;
  }
};

// Fetches group with all member student records nested
const getGroupWithMembers = async (groupId, conn = pool) => {
  const [groupRows] = await conn.execute("SELECT * FROM `groups` WHERE id = ?", [groupId]);
  if (!groupRows[0]) return null;
  const group = groupRows[0];

  const [memberRows] = await conn.execute(
    `SELECT gm.*, s.id AS s_id, s.name, s.email, s.cgpa, s.branch, s.role
     FROM group_members gm
     INNER JOIN students s ON gm.studentId = s.id
     WHERE gm.groupId = ?
     ORDER BY gm.joinedAt ASC`,
    [groupId]
  );

  group.members = memberRows.map(m => ({
    groupId: m.groupId,
    studentId: m.studentId,
    joinedAt: m.joinedAt,
    student: {
      id: m.s_id,
      name: m.name,
      email: m.email,
      cgpa: m.cgpa,
      branch: m.branch,
      role: m.role
    }
  }));

  return group;
};

// Retrieves full group details for a student
const getGroupByStudentId = async (studentId, conn = pool) => {
  const membership = await findMembershipByStudentId(studentId, conn);
  return membership ? getGroupWithMembers(membership.groupId, conn) : null;
};

// Removes a member, recalculates leader if needed, or deletes group if empty
const removeMember = async ({ groupId, studentId }, externalConn = null) => {
  const executeOperation = async (conn) => {
    await conn.execute('DELETE FROM group_members WHERE groupId = ? AND studentId = ?', [groupId, studentId]);

    const [countRows] = await conn.execute('SELECT COUNT(*) AS total FROM group_members WHERE groupId = ?', [groupId]);
    if (Number(countRows[0].total || 0) === 0) {
      await conn.execute("DELETE FROM `groups` WHERE id = ?", [groupId]);
      return { groupDeleted: true };
    }

    const [groupRows] = await conn.execute("SELECT leaderId FROM `groups` WHERE id = ?", [groupId]);
    if (groupRows[0]?.leaderId === studentId) {
      const [remaining] = await conn.execute(
        `SELECT gm.studentId, s.cgpa
         FROM group_members gm
         INNER JOIN students s ON gm.studentId = s.id
         WHERE gm.groupId = ?
         ORDER BY s.cgpa DESC, gm.studentId ASC
         LIMIT 1`,
        [groupId]
      );
      const newLeaderId = remaining[0].studentId;
      await conn.execute("UPDATE `groups` SET leaderId = ?, status = 'FORMING' WHERE id = ?", [newLeaderId, groupId]);
      return { groupDeleted: false, newLeaderId };
    }

    await conn.execute("UPDATE `groups` SET status = 'FORMING' WHERE id = ?", [groupId]);
    return { groupDeleted: false };
  };

  return externalConn ? executeOperation(externalConn) : withTransaction(executeOperation);
};

// Updates a group status
const updateGroupStatus = async (groupId, status, conn = pool) => {
  await conn.execute("UPDATE `groups` SET status = ? WHERE id = ?", [status, groupId]);
};

// Updates a group leader and status
const updateLeaderAndStatus = async (groupId, leaderId, status, conn = pool) => {
  await conn.execute("UPDATE `groups` SET leaderId = ?, status = ? WHERE id = ?", [leaderId, status, groupId]);
};

// Counts members in a group
const getMemberCount = async (groupId, conn = pool) => {
  const [rows] = await conn.execute('SELECT COUNT(*) AS total FROM group_members WHERE groupId = ?', [groupId]);
  return Number(rows[0].total || 0);
};

// Retrieves forming groups that can accept new members
const getDiscoverableGroups = async (conn = pool) => {
  const [groups] = await conn.execute("SELECT id, groupCode FROM `groups` WHERE status = 'FORMING' ORDER BY id ASC");
  const result = [];
  for (const g of groups) {
    const [memberRows] = await conn.execute(
      `SELECT s.name, s.cgpa
       FROM group_members gm
       INNER JOIN students s ON gm.studentId = s.id
       WHERE gm.groupId = ?`,
      [g.id]
    );

    result.push({
      id: g.id,
      groupCode: g.groupCode,
      _count: { members: memberRows.length },
      members: memberRows.map(m => ({
        student: { name: m.name, cgpa: m.cgpa }
      }))
    });
  }
  return result;
};

// Retrieves all ungrouped students
const getUngroupedStudents = async (conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT s.id, s.name, s.cgpa, s.branch
     FROM students s
     WHERE s.role = 'student'
       AND NOT EXISTS (
         SELECT 1 FROM group_members gm WHERE gm.studentId = s.id
       )
     ORDER BY s.id ASC`
  );
  return rows;
};

// Creates an inbound join request
const createJoinRequest = async (groupId, studentId, conn = pool) => {
  const [res] = await conn.execute(
    "INSERT INTO join_requests (groupId, studentId, status) VALUES (?, ?, 'PENDING')",
    [groupId, studentId]
  );
  const [rows] = await conn.execute('SELECT * FROM join_requests WHERE id = ?', [res.insertId]);
  return rows[0];
};

// Finds pending join request for a student
const findPendingRequestByStudentId = async (studentId, conn = pool) => {
  const [rows] = await conn.execute(
    "SELECT * FROM join_requests WHERE studentId = ? AND status = 'PENDING' LIMIT 1",
    [studentId]
  );
  return rows[0] || null;
};

// Finds a join request by ID including group metadata
const findPendingRequestById = async (id, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT jr.*, g.id AS g_id, g.groupCode, g.leaderId, g.status AS group_status
     FROM join_requests jr
     INNER JOIN \`groups\` g ON jr.groupId = g.id
     WHERE jr.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    groupId: r.groupId,
    studentId: r.studentId,
    status: r.status,
    createdAt: r.createdAt,
    group: { id: r.g_id, groupCode: r.groupCode, leaderId: r.leaderId, status: r.group_status }
  };
};

// Deletes a join request by ID
const deleteJoinRequest = async (id, conn = pool) => {
  await conn.execute('DELETE FROM join_requests WHERE id = ?', [id]);
};

// Updates join request status
const updateJoinRequestStatus = async (id, status, conn = pool) => {
  await conn.execute('UPDATE join_requests SET status = ? WHERE id = ?', [status, id]);
};

// Clears pending join requests for a student
const deletePendingJoinRequestsByStudent = async (studentId, conn = pool) => {
  await conn.execute("DELETE FROM join_requests WHERE studentId = ? AND status = 'PENDING'", [studentId]);
};

// Clears pending join requests for a group
const deletePendingJoinRequestsByGroup = async (groupId, conn = pool) => {
  await conn.execute("DELETE FROM join_requests WHERE groupId = ? AND status = 'PENDING'", [groupId]);
};

// Creates an outbound invitation from a group to a student
const createInvitation = async (groupId, studentId, conn = pool) => {
  const [res] = await conn.execute(
    "INSERT INTO group_invitations (groupId, studentId, status) VALUES (?, ?, 'PENDING')",
    [groupId, studentId]
  );
  const [rows] = await conn.execute('SELECT * FROM group_invitations WHERE id = ?', [res.insertId]);
  return rows[0];
};

// Checks if an invitation is already pending for a student from a group
const findPendingInvitationByGroupAndStudent = async (groupId, studentId, conn = pool) => {
  const [rows] = await conn.execute(
    "SELECT * FROM group_invitations WHERE groupId = ? AND studentId = ? AND status = 'PENDING' LIMIT 1",
    [groupId, studentId]
  );
  return rows[0] || null;
};

// Finds an invitation by ID including group metadata
const findPendingInvitationById = async (id, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT gi.*, g.id AS g_id, g.groupCode, g.leaderId, g.status AS group_status
     FROM group_invitations gi
     INNER JOIN \`groups\` g ON gi.groupId = g.id
     WHERE gi.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    groupId: r.groupId,
    studentId: r.studentId,
    status: r.status,
    createdAt: r.createdAt,
    group: { id: r.g_id, groupCode: r.groupCode, leaderId: r.leaderId, status: r.group_status }
  };
};

// Deletes an invitation by ID
const deleteInvitation = async (id, conn = pool) => {
  await conn.execute('DELETE FROM group_invitations WHERE id = ?', [id]);
};

// Updates invitation status
const updateInvitationStatus = async (id, status, conn = pool) => {
  await conn.execute('UPDATE group_invitations SET status = ? WHERE id = ?', [status, id]);
};

// Clears pending invitations for a student
const deletePendingInvitationsByStudent = async (studentId, conn = pool) => {
  await conn.execute("DELETE FROM group_invitations WHERE studentId = ? AND status = 'PENDING'", [studentId]);
};

// Clears pending invitations sent by a group
const deletePendingInvitationsByGroup = async (groupId, conn = pool) => {
  await conn.execute("DELETE FROM group_invitations WHERE groupId = ? AND status = 'PENDING'", [groupId]);
};

// Finds group IDs where a student has a pending join request
const getStudentPendingJoinRequestGroupIds = async (studentId, conn = pool) => {
  const [rows] = await conn.execute(
    "SELECT groupId FROM join_requests WHERE studentId = ? AND status = 'PENDING'",
    [studentId]
  );
  return rows.map(r => r.groupId);
};

// Finds student IDs who have pending invitations from a group
const getGroupPendingInvitedStudentIds = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    "SELECT studentId FROM group_invitations WHERE groupId = ? AND status = 'PENDING'",
    [groupId]
  );
  return rows.map(r => r.studentId);
};

// Retrieves group members sorted by CGPA DESC for leader election
const getGroupMembersSortedByCgpa = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT gm.studentId, s.cgpa
     FROM group_members gm
     INNER JOIN students s ON gm.studentId = s.id
     WHERE gm.groupId = ?
     ORDER BY s.cgpa DESC, gm.studentId ASC`,
    [groupId]
  );
  return rows;
};

// Retrieves outgoing join requests sent by a student with nested group and member details
const getOutgoingRequests = async (studentId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT jr.*, g.id AS g_id, g.groupCode, g.leaderId, g.status AS group_status
     FROM join_requests jr
     INNER JOIN \`groups\` g ON jr.groupId = g.id
     WHERE jr.studentId = ? AND jr.status = 'PENDING'
     ORDER BY jr.createdAt DESC`,
    [studentId]
  );
  return attachGroupMembers(rows, conn);
};

// Retrieves incoming group invitations for a student with nested group and member details
const getIncomingInvitations = async (studentId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT gi.*, g.id AS g_id, g.groupCode, g.leaderId, g.status AS group_status
     FROM group_invitations gi
     INNER JOIN \`groups\` g ON gi.groupId = g.id
     WHERE gi.studentId = ? AND gi.status = 'PENDING'
     ORDER BY gi.createdAt DESC`,
    [studentId]
  );
  return attachGroupMembers(rows, conn);
};

// Retrieves incoming join requests for a group
const getIncomingRequests = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT jr.*, s.id AS s_id, s.name, s.cgpa, s.branch
     FROM join_requests jr
     INNER JOIN students s ON jr.studentId = s.id
     WHERE jr.groupId = ? AND jr.status = 'PENDING'
     ORDER BY jr.createdAt DESC`,
    [groupId]
  );
  return rows.map(withApplicant);
};

// Retrieves outgoing invitations sent by a group
const getOutgoingInvitations = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT gi.*, s.id AS s_id, s.name, s.cgpa, s.branch
     FROM group_invitations gi
     INNER JOIN students s ON gi.studentId = s.id
     WHERE gi.groupId = ? AND gi.status = 'PENDING'
     ORDER BY gi.createdAt DESC`,
    [groupId]
  );
  return rows.map(withApplicant);
};

module.exports = {
  findMembershipByStudentId,
  createGroup,
  findGroupByCode,
  findGroupById,
  addMember,
  getGroupWithMembers,
  getGroupByStudentId,
  removeMember,
  updateGroupStatus,
  updateLeaderAndStatus,
  getMemberCount,
  getDiscoverableGroups,
  getUngroupedStudents,
  createJoinRequest,
  findPendingRequestByStudentId,
  findPendingRequestById,
  deleteJoinRequest,
  updateJoinRequestStatus,
  deletePendingJoinRequestsByStudent,
  deletePendingJoinRequestsByGroup,
  createInvitation,
  findPendingInvitationByGroupAndStudent,
  findPendingInvitationById,
  deleteInvitation,
  updateInvitationStatus,
  deletePendingInvitationsByStudent,
  deletePendingInvitationsByGroup,
  getStudentPendingJoinRequestGroupIds,
  getGroupPendingInvitedStudentIds,
  getGroupMembersSortedByCgpa,
  getOutgoingRequests,
  getIncomingInvitations,
  getIncomingRequests,
  getOutgoingInvitations
};
