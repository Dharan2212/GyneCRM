const HTTP_STATUS = require('../../constants/http-status');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/api-response');
const doctorsService = require('./doctors.service');

const listDoctors = asyncHandler(async (req, res) => {
  const result = await doctorsService.listDoctors(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Doctors fetched successfully.',
    data: result.doctors,
    meta: result.meta,
  });
});

const getDoctorDetail = asyncHandler(async (req, res) => {
  const doctor = await doctorsService.getDoctorDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Doctor fetched successfully.',
    data: doctor,
  });
});

const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorsService.createDoctor(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Doctor created successfully.',
    data: doctor,
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorsService.updateDoctor(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Doctor updated successfully.',
    data: doctor,
  });
});

module.exports = {
  listDoctors,
  getDoctorDetail,
  createDoctor,
  updateDoctor,
};
