const allocationsService = require('./allocations.service');
const allocationsRepository = require('./allocations.repository');
const asyncHandler = require('../../utils/asyncHandler');

const runAllocation = asyncHandler(async (req, res) => {
  const result = await allocationsService.runAllocation();
  return res.status(200).json({
    success: true,
    data: result,
    message: `Allocation run complete. Allocated: ${result.allocatedCount}, Waiting: ${result.waitingCount}`
  });
});

const getMyResult = asyncHandler(async (req, res) => {
  const data = await allocationsService.getMyResult(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

const getAllAllocations = asyncHandler(async (req, res) => {
  const data = await allocationsRepository.getAllAllocations();
  return res.status(200).json({
    success: true,
    data
  });
});

const mergeAndAutoAllocate = asyncHandler(async (req, res) => {
  const result = await allocationsService.mergeAndAutoAllocate();
  return res.status(200).json({
    success: true,
    data: result,
    message: `Merge completed. Formed: ${result.FormedGroupsCount} groups. Allocated: ${result.allocatedCount}, Waiting: ${result.waitingCount}`
  });
});

module.exports = {
  runAllocation,
  getMyResult,
  getAllAllocations,
  mergeAndAutoAllocate
};
