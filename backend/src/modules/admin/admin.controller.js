const adminRepository = require('./admin.repository');
const asyncHandler = require('../../utils/asyncHandler');

const getStudents = asyncHandler(async (req, res) => {
  const data = await adminRepository.getAllStudents();
  return res.status(200).json({
    success: true,
    data
  });
});

const getGroups = asyncHandler(async (req, res) => {
  const data = await adminRepository.getAllGroups();
  return res.status(200).json({
    success: true,
    data
  });
});

const getRooms = asyncHandler(async (req, res) => {
  const data = await adminRepository.getAllRooms();
  return res.status(200).json({
    success: true,
    data
  });
});

const getWaitingList = asyncHandler(async (req, res) => {
  const data = await adminRepository.getWaitingList();
  return res.status(200).json({
    success: true,
    data
  });
});

const getStats = asyncHandler(async (req, res) => {
  const data = await adminRepository.getStats();
  return res.status(200).json({
    success: true,
    data
  });
});

const getActivity = asyncHandler(async (req, res) => {
  const data = await adminRepository.getRecentActivity();
  return res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getStudents,
  getGroups,
  getRooms,
  getWaitingList,
  getStats,
  getActivity
};
