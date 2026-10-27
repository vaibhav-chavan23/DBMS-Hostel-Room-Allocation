const preferencesService = require('./preferences.service');
const asyncHandler = require('../../utils/asyncHandler');

const submitPreferences = asyncHandler(async (req, res) => {
  const { room_ids } = req.body;
  const data = await preferencesService.submitPreferences(req.user.id, room_ids);
  return res.status(200).json({
    success: true,
    data,
    message: 'Preferences submitted successfully'
  });
});

const getMyPreferences = asyncHandler(async (req, res) => {
  const data = await preferencesService.getMyPreferences(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  submitPreferences,
  getMyPreferences
};
