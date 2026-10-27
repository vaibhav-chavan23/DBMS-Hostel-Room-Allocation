const express = require('express');
const { body } = require('express-validator');
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('cgpa').isFloat({ min: 0.0, max: 10.0 }).withMessage('CGPA must be between 0.0 and 10.0'),
    body('branch').trim().notEmpty().withMessage('Branch is required')
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

router.get('/me', authMiddleware, authController.me);

module.exports = router;
