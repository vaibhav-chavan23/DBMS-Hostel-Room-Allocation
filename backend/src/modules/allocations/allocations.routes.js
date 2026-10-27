const express = require('express');
const allocationsController = require('./allocations.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { isAdmin, isStudent } = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/run', isAdmin, allocationsController.runAllocation);
router.post('/merge-allocate', isAdmin, allocationsController.mergeAndAutoAllocate);
router.get('/result', isStudent, allocationsController.getMyResult);
router.get('/', isAdmin, allocationsController.getAllAllocations);

module.exports = router;
