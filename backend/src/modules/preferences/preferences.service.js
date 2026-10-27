const preferencesRepository = require('./preferences.repository');
const groupsRepository = require('../groups/groups.repository');
const AppError = require('../../utils/AppError');

const submitPreferences = async (studentId, roomIds) => {
  const group = await groupsRepository.getGroupByStudentId(studentId);
  if (!group) {
    throw new AppError('You are not in a group', 404, 'NOT_FOUND');
  }

  if (group.leaderId !== studentId) {
    throw new AppError('Only the group leader can submit preferences', 403, 'FORBIDDEN');
  }

  if (group.status !== 'READY') {
    throw new AppError('Group status must be READY to submit preferences', 422, 'BUSINESS_RULE_ERROR');
  }

  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    throw new AppError('At least one room preference is required', 400, 'VALIDATION_ERROR');
  }

  // Ensure room IDs are unique
  const uniqueRoomIds = [...new Set(roomIds)];
  if (uniqueRoomIds.length !== roomIds.length) {
    throw new AppError('Preferences cannot contain duplicate rooms', 400, 'VALIDATION_ERROR');
  }

  // Validate all roomIds exist
  const rooms = await preferencesRepository.findRoomsByIds(roomIds);
  if (rooms.length !== roomIds.length) {
    throw new AppError('One or more specified rooms do not exist', 400, 'VALIDATION_ERROR');
  }

  await preferencesRepository.createPreferences(group.id, roomIds);
  return { message: 'Preferences submitted successfully' };
};

const getMyPreferences = async (studentId) => {
  const group = await groupsRepository.getGroupByStudentId(studentId);
  if (!group) {
    throw new AppError('You are not in a group', 404, 'NOT_FOUND');
  }

  const preferences = await preferencesRepository.findPreferencesByGroupId(group.id);
  return preferences;
};

module.exports = {
  submitPreferences,
  getMyPreferences
};
