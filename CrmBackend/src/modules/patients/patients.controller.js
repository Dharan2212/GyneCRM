const HTTP_STATUS = require('../../constants/http-status');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/api-response');
const patientsService = require('./patients.service');

const listPatients = asyncHandler(async (req, res) => {
  const result = await patientsService.listPatients(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patients fetched successfully.',
    data: result.patients,
    meta: result.meta,
  });
});

const registerPatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.registerPatient(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Patient registered successfully.',
    data: patient,
  });
});

const getPatientDetail = asyncHandler(async (req, res) => {
  const patient = await patientsService.getPatientDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient fetched successfully.',
    data: patient,
  });
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.updatePatient(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient updated successfully.',
    data: patient,
  });
});

const updatePatientCategory = asyncHandler(async (req, res) => {
  const patient = await patientsService.updatePatientCategory(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient category updated successfully.',
    data: patient,
  });
});

const getPatientCategoryHistory = asyncHandler(async (req, res) => {
  const history = await patientsService.getPatientCategoryHistory(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient category history fetched successfully.',
    data: history,
  });
});


const getPatientHub = asyncHandler(async (req, res) => {
  const hub = await patientsService.getPatientHub(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient hub fetched successfully.',
    data: hub,
  });
});

const getPatientCategoryCounts = asyncHandler(async (req, res) => {
  const result = await patientsService.getPatientCategoryCounts(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Patient category counts fetched successfully.',
    data: result,
  });
});

module.exports = {
  listPatients,
  registerPatient,
  getPatientDetail,
  updatePatient,
  updatePatientCategory,
  getPatientCategoryHistory,
  getPatientHub,
  getPatientCategoryCounts,
};
