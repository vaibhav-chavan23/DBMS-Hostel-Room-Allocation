const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  return res.status(201).json({
    success: true,
    data,
    message: 'Student registered successfully'
  });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return res.status(200).json({
    success: true,
    data,
    message: 'Logged in successfully'
  });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user.id);
  return res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  register,
  login,
  me
};
