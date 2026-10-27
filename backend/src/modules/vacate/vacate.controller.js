const vacateService = require('./vacate.service');
const vacateRepository = require('./vacate.repository');
const asyncHandler = require('../../utils/asyncHandler');

const submit = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const data = await vacateService.submitVacateRequest(req.user.id, reason);
  return res.status(201).json({
    success: true,
    data,
    message: 'Vacate request submitted successfully'
  });
});

const getPending = asyncHandler(async (req, res) => {
  const data = await vacateRepository.findPendingRequests();
  return res.status(200).json({
    success: true,
    data
  });
});

const approve = asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const data = await vacateService.approveVacateRequest(requestId);
  return res.status(200).json({
    success: true,
    data,
    message: 'Vacate request approved'
  });
});

const reject = asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const data = await vacateService.rejectVacateRequest(requestId);
  return res.status(200).json({
    success: true,
    data,
    message: 'Vacate request rejected'
  });
});

module.exports = {
  submit,
  getPending,
  approve,
  reject
};
