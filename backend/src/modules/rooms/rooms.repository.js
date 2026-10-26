const { pool } = require('../../config/db');

/**
 * Retrieves all hostels along with their associated rooms,
 * grouped in the exact nested structure expected by the frontend.
 */
const getAllRoomsGroupedByHostel = async (conn = pool) => {
  // Join hostels with rooms and sort by roomNumber
  const [rows] = await conn.execute(
    `SELECT 
       h.id AS hostel_id,
       h.name AS hostel_name,
       h.gender AS hostel_gender,
       r.id AS room_id,
       r.hostelId AS room_hostelId,
       r.roomNumber AS room_roomNumber,
       r.capacity AS room_capacity,
       r.status AS room_status
     FROM hostels h
     LEFT JOIN rooms r ON h.id = r.hostelId
     ORDER BY h.id ASC, CAST(r.roomNumber AS UNSIGNED) ASC, r.roomNumber ASC`
  );

  const hostelMap = new Map();

  for (const row of rows) {
    if (!hostelMap.has(row.hostel_id)) {
      hostelMap.set(row.hostel_id, {
        id: row.hostel_id,
        name: row.hostel_name,
        gender: row.hostel_gender,
        rooms: []
      });
    }

    if (row.room_id !== null) {
      hostelMap.get(row.hostel_id).rooms.push({
        id: row.room_id,
        hostelId: row.room_hostelId,
        roomNumber: row.room_roomNumber,
        capacity: row.room_capacity,
        status: row.room_status
      });
    }
  }

  return Array.from(hostelMap.values());
};

module.exports = {
  getAllRoomsGroupedByHostel
};
