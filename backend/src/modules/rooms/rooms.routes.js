const express = require('express');
const roomsController = require('./rooms.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { isStudent } = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(isStudent);

router.get('/', roomsController.getAllRooms);

module.exports = router;
