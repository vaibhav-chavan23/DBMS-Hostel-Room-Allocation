const roomsRepository = require('./rooms.repository');
const asyncHandler = require('../../utils/asyncHandler');

const getAllRooms = asyncHandler(async (req, res) => {
  const hostels = await roomsRepository.getAllRoomsGroupedByHostel();
  return res.status(200).json({
    success: true,
    data: { hostels }
  });
});

module.exports = {
  getAllRooms
};
