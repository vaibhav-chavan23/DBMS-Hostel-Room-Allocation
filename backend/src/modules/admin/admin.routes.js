const express = require('express');
const adminController = require('./admin.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(isAdmin);

router.get('/students', adminController.getStudents);
router.get('/groups', adminController.getGroups);
router.get('/rooms', adminController.getRooms);
router.get('/waiting-list', adminController.getWaitingList);
router.get('/stats', adminController.getStats);
router.get('/activity', adminController.getActivity);

module.exports = router;
