const { pool, withTransaction } = require('../../config/db');

/**
 * Retrieves the ranked room preferences for a given group,
 * including nested room and hostel details.
 */
const findPreferencesByGroupId = async (groupId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT 
       rp.id AS pref_id,
       rp.groupId AS pref_groupId,
       rp.roomId AS pref_roomId,
       rp.preferenceOrder AS pref_order,
       r.id AS room_id,
       r.hostelId AS room_hostelId,
       r.roomNumber AS room_roomNumber,
       r.capacity AS room_capacity,
       r.status AS room_status,
       h.id AS hostel_id,
       h.name AS hostel_name,
       h.gender AS hostel_gender
     FROM room_preferences rp
     INNER JOIN rooms r ON rp.roomId = r.id
     INNER JOIN hostels h ON r.hostelId = h.id
     WHERE rp.groupId = ?
     ORDER BY rp.preferenceOrder ASC`,
    [groupId]
  );

  return rows.map(row => ({
    id: row.pref_id,
    groupId: row.pref_groupId,
    roomId: row.pref_roomId,
    preferenceOrder: row.pref_order,
    room: {
      id: row.room_id,
      hostelId: row.room_hostelId,
      roomNumber: row.room_roomNumber,
      capacity: row.room_capacity,
      status: row.room_status,
      hostel: {
        id: row.hostel_id,
        name: row.hostel_name,
        gender: row.hostel_gender
      }
    }
  }));
};

/**
 * Finds room records matching an array of IDs.
 * Used to validate that submitted preference room IDs exist.
 */
const findRoomsByIds = async (ids, conn = pool) => {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT id, hostelId, roomNumber, capacity, status FROM rooms WHERE id IN (${placeholders})`,
    ids
  );
  return rows;
};

/**
 * Clears old preferences, inserts new ordered preferences, and updates group status to PREFERENCES_SUBMITTED.
 * Atomic transaction wrapper ensures all steps succeed or all rollback.
 */
const createPreferences = async (groupId, roomIds, externalConn = null) => {
  const executeOperation = async (conn) => {
    // 1. Delete previous preferences for this group
    await conn.execute('DELETE FROM room_preferences WHERE groupId = ?', [groupId]);

    // 2. Insert new preferences
    for (let i = 0; i < roomIds.length; i++) {
      await conn.execute(
        `INSERT INTO room_preferences (groupId, roomId, preferenceOrder)
         VALUES (?, ?, ?)`,
        [groupId, roomIds[i], i + 1]
      );
    }

    // 3. Transition group status to PREFERENCES_SUBMITTED
    await conn.execute(
      "UPDATE `groups` SET status = 'PREFERENCES_SUBMITTED' WHERE id = ?",
      [groupId]
    );
  };

  if (externalConn) {
    return executeOperation(externalConn);
  } else {
    return withTransaction(executeOperation);
  }
};

module.exports = {
  findPreferencesByGroupId,
  findRoomsByIds,
  createPreferences
};
