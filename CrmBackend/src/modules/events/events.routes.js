const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./events.controller');
const {
  dispatchEventSchema,
  listEventsSchema,
  eventDetailParamSchema,
} = require('./events.validator');

const router = express.Router();

router.use(auth);
router.use(requireRole(ROLES.ADMIN));

router.post('/dispatch', validateRequest(dispatchEventSchema), controller.dispatchEvent);
router.get('/types', controller.getEventTypes);
router.get('/template-map', controller.getTemplateMap);
router.get('/', validateRequest(listEventsSchema, { source: 'query' }), controller.listEvents);
router.get('/:id', validateRequest(eventDetailParamSchema, { source: 'params' }), controller.getEventDetail);

module.exports = router;
