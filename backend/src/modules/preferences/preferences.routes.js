const express = require('express');
const { body } = require('express-validator');
const preferencesController = require('./preferences.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { isStudent } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(isStudent);

router.post(
  '/',
  [
    body('room_ids')
      .isArray({ min: 1 }).withMessage('room_ids must be a non-empty array of integers')
      .custom((value) => {
        return value.every(id => Number.isInteger(id));
      }).withMessage('room_ids must contain only integers')
  ],
  validate,
  preferencesController.submitPreferences
);

router.get('/my', preferencesController.getMyPreferences);

module.exports = router;
