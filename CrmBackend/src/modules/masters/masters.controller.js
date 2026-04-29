const HTTP_STATUS = require('../../constants/http-status');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/api-response');
const mastersService = require('./masters.service');

function buildListHandler(serviceMethod, message) {
  return asyncHandler(async (req, res) => {
    const result = await serviceMethod(req.query, req.user || {});

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message,
      data: result.data,
      meta: result.meta,
    });
  });
}

function buildCreateHandler(serviceMethod, message) {
  return asyncHandler(async (req, res) => {
    const data = await serviceMethod(req.body, req.user || {});

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message,
      data,
    });
  });
}

function buildUpdateHandler(serviceMethod, message) {
  return asyncHandler(async (req, res) => {
    const data = await serviceMethod(req.params.id, req.body, req.user || {});

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message,
      data,
    });
  });
}

module.exports = {
  listAppointmentTypes: buildListHandler(mastersService.listAppointmentTypes, 'Appointment types fetched successfully.'),
  createAppointmentType: buildCreateHandler(mastersService.createAppointmentType, 'Appointment type created successfully.'),
  updateAppointmentType: buildUpdateHandler(mastersService.updateAppointmentType, 'Appointment type updated successfully.'),
  listServiceCatalog: buildListHandler(mastersService.listServiceCatalog, 'Service catalog fetched successfully.'),
  createServiceCatalog: buildCreateHandler(mastersService.createServiceCatalog, 'Service catalog entry created successfully.'),
  updateServiceCatalog: buildUpdateHandler(mastersService.updateServiceCatalog, 'Service catalog entry updated successfully.'),
  listTestCatalog: buildListHandler(mastersService.listTestCatalog, 'Test catalog fetched successfully.'),
  createTestCatalog: buildCreateHandler(mastersService.createTestCatalog, 'Test catalog entry created successfully.'),
  updateTestCatalog: buildUpdateHandler(mastersService.updateTestCatalog, 'Test catalog entry updated successfully.'),
  listLabReferenceRanges: buildListHandler(mastersService.listLabReferenceRanges, 'Lab reference ranges fetched successfully.'),
  createLabReferenceRange: buildCreateHandler(mastersService.createLabReferenceRange, 'Lab reference range created successfully.'),
  updateLabReferenceRange: buildUpdateHandler(mastersService.updateLabReferenceRange, 'Lab reference range updated successfully.'),
  listHospitalProtocols: buildListHandler(mastersService.listHospitalProtocols, 'Hospital protocols fetched successfully.'),
  createHospitalProtocol: buildCreateHandler(mastersService.createHospitalProtocol, 'Hospital protocol created successfully.'),
  updateHospitalProtocol: buildUpdateHandler(mastersService.updateHospitalProtocol, 'Hospital protocol updated successfully.'),
};
