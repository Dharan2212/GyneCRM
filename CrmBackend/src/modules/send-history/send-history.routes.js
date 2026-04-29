const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./send-history.controller');
const {
  listSendHistorySchema,
  sendHistoryDetailParamSchema,
  patientSendHistoryParamSchema,
  patientSendHistoryAliasParamSchema,
} = require('./send-history.validator');

const historyRouter = express.Router();
const patientHistoryRouter = express.Router();

historyRouter.use(auth);
patientHistoryRouter.use(auth);

historyRouter.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(listSendHistorySchema, { source: 'query' }),
  controller.listSendHistory,
);


historyRouter.get(
  '/patients/:patientId',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(patientSendHistoryAliasParamSchema, { source: 'params' }),
  validateRequest(listSendHistorySchema, { source: 'query' }),
  controller.getPatientSendHistory,
);

historyRouter.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(sendHistoryDetailParamSchema, { source: 'params' }),
  controller.getSendHistoryDetail,
);

patientHistoryRouter.get(
  '/:id/send-history',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(patientSendHistoryParamSchema, { source: 'params' }),
  validateRequest(listSendHistorySchema, { source: 'query' }),
  controller.getPatientSendHistory,
);

module.exports = {
  historyRouter,
  patientHistoryRouter,
};
