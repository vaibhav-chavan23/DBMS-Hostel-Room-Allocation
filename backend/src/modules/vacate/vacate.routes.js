const express = require('express');
const { body } = require('express-validator');
const vacateController = require('./vacate.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { isAdmin, isStudent } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/',
  isStudent,
  [
    body('reason').optional().trim().isString().withMessage('Reason must be a valid text string')
  ],
  validate,
  vacateController.submit
);

router.get('/', isAdmin, vacateController.getPending);
router.patch('/:id/approve', isAdmin, vacateController.approve);
router.patch('/:id/reject', isAdmin, vacateController.reject);

module.exports = router;
