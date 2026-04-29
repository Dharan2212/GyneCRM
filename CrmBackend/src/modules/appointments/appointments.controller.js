const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const appointmentsService = require('./appointments.service');

const listAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentsService.listAppointments(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Appointments fetched successfully.',
    data: result.appointments,
    meta: result.meta,
  });
});

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentsService.createAppointment(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Appointment created successfully.',
    data: appointment,
  });
});

const getAppointmentDetail = asyncHandler(async (req, res) => {
  const appointment = await appointmentsService.getAppointmentDetail(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Appointment detail fetched successfully.',
    data: appointment,
  });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await appointmentsService.updateAppointmentStatus(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Appointment status updated successfully.',
    data: appointment,
  });
});

const checkInAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentsService.checkInAppointment(req.params.id, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Appointment checked in successfully.',
    data: appointment,
  });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const result = await appointmentsService.rescheduleAppointment(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Appointment rescheduled successfully.',
    data: result,
  });
});

const listWaitlist = asyncHandler(async (req, res) => {
  const result = await appointmentsService.listWaitlist(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Waitlist entries fetched successfully.',
    data: result.items,
    meta: result.meta,
  });
});

const createWaitlist = asyncHandler(async (req, res) => {
  const item = await appointmentsService.createWaitlist(req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Waitlist entry created successfully.',
    data: item,
  });
});

const updateWaitlistStatus = asyncHandler(async (req, res) => {
  const item = await appointmentsService.updateWaitlistStatus(req.params.id, req.body, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Waitlist status updated successfully.',
    data: item,
  });
});

module.exports = {
  listAppointments,
  createAppointment,
  getAppointmentDetail,
  updateAppointmentStatus,
  checkInAppointment,
  rescheduleAppointment,
  listWaitlist,
  createWaitlist,
  updateWaitlistStatus,
};
