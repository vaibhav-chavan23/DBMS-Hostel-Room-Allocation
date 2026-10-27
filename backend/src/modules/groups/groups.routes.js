const express = require('express');
const { body } = require('express-validator');
const groupsController = require('./groups.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { isStudent } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(isStudent);

router.post('/', groupsController.createGroup);

router.post(
  '/join',
  [
    body('group_code').trim().notEmpty().withMessage('Group code is required')
  ],
  validate,
  groupsController.joinGroup
);

router.get('/my', groupsController.getMyGroup);

router.delete('/leave', groupsController.leaveGroup);

// New discovery, requests and invitations routes
router.get('/discover', groupsController.getDiscoverableGroups);
router.get('/students-without-groups', groupsController.getUngroupedStudents);

router.get('/pending', groupsController.getPendingReqsAndInvites);

router.post(
  '/requests',
  [
    body('groupId').isInt().withMessage('groupId must be an integer')
  ],
  validate,
  groupsController.sendJoinRequest
);
router.delete('/requests/:requestId', groupsController.cancelJoinRequest);
router.post(
  '/requests/:requestId/resolve',
  [
    body('action').isIn(['accept', 'reject']).withMessage('action must be accept or reject')
  ],
  validate,
  groupsController.resolveJoinRequest
);

router.post(
  '/invitations',
  [
    body('studentId').isInt().withMessage('studentId must be an integer')
  ],
  validate,
  groupsController.sendInvitation
);
router.delete('/invitations/:invitationId', groupsController.cancelInvitation);
router.post(
  '/invitations/:invitationId/resolve',
  [
    body('action').isIn(['accept', 'reject']).withMessage('action must be accept or reject')
  ],
  validate,
  groupsController.resolveInvitation
);

module.exports = router;
