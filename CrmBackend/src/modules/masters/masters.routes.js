const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./masters.controller');
const {
  listMastersSchema,
  entityIdSchema,
  appointmentTypeCreateSchema,
  appointmentTypeUpdateSchema,
  serviceCatalogCreateSchema,
  serviceCatalogUpdateSchema,
  testCatalogCreateSchema,
  testCatalogUpdateSchema,
  labReferenceRangeCreateSchema,
  labReferenceRangeUpdateSchema,
  hospitalProtocolCreateSchema,
  hospitalProtocolUpdateSchema,
} = require('./masters.validator');

const router = express.Router();

router.use(auth);

router.get('/appointment-types', validateRequest(listMastersSchema, { source: 'query' }), controller.listAppointmentTypes);
router.post('/appointment-types', requireRole(ROLES.ADMIN), validateRequest(appointmentTypeCreateSchema), controller.createAppointmentType);
router.put('/appointment-types/:id', requireRole(ROLES.ADMIN), validateRequest(entityIdSchema, { source: 'params' }), validateRequest(appointmentTypeUpdateSchema), controller.updateAppointmentType);

router.get('/service-catalog', validateRequest(listMastersSchema, { source: 'query' }), controller.listServiceCatalog);
router.post('/service-catalog', requireRole(ROLES.ADMIN), validateRequest(serviceCatalogCreateSchema), controller.createServiceCatalog);
router.put('/service-catalog/:id', requireRole(ROLES.ADMIN), validateRequest(entityIdSchema, { source: 'params' }), validateRequest(serviceCatalogUpdateSchema), controller.updateServiceCatalog);

router.get('/test-catalog', validateRequest(listMastersSchema, { source: 'query' }), controller.listTestCatalog);
router.post('/test-catalog', requireRole(ROLES.ADMIN), validateRequest(testCatalogCreateSchema), controller.createTestCatalog);
router.put('/test-catalog/:id', requireRole(ROLES.ADMIN), validateRequest(entityIdSchema, { source: 'params' }), validateRequest(testCatalogUpdateSchema), controller.updateTestCatalog);

router.get('/lab-reference-ranges', validateRequest(listMastersSchema, { source: 'query' }), controller.listLabReferenceRanges);
router.post('/lab-reference-ranges', requireRole(ROLES.ADMIN), validateRequest(labReferenceRangeCreateSchema), controller.createLabReferenceRange);
router.put('/lab-reference-ranges/:id', requireRole(ROLES.ADMIN), validateRequest(entityIdSchema, { source: 'params' }), validateRequest(labReferenceRangeUpdateSchema), controller.updateLabReferenceRange);

router.get('/hospital-protocols', validateRequest(listMastersSchema, { source: 'query' }), controller.listHospitalProtocols);
router.post('/hospital-protocols', requireRole(ROLES.ADMIN), validateRequest(hospitalProtocolCreateSchema), controller.createHospitalProtocol);
router.put('/hospital-protocols/:id', requireRole(ROLES.ADMIN), validateRequest(entityIdSchema, { source: 'params' }), validateRequest(hospitalProtocolUpdateSchema), controller.updateHospitalProtocol);

module.exports = router;
