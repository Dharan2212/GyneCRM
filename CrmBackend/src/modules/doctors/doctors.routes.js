const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./doctors.controller');
const {
  listDoctorsSchema,
  doctorDetailSchema,
  createDoctorSchema,
  updateDoctorSchema,
} = require('./doctors.validator');

const router = express.Router();

router.use(auth);

router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(listDoctorsSchema, { source: 'query' }),
  controller.listDoctors,
);
router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  validateRequest(doctorDetailSchema, { source: 'params' }),
  controller.getDoctorDetail,
);
router.post('/', requireRole(ROLES.ADMIN), validateRequest(createDoctorSchema), controller.createDoctor);
router.put(
  '/:id',
  requireRole(ROLES.ADMIN),
  validateRequest(doctorDetailSchema, { source: 'params' }),
  validateRequest(updateDoctorSchema),
  controller.updateDoctor,
);

module.exports = router;
