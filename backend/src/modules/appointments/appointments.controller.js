'use strict';

const appointmentsService = require('./appointments.service');
const { sendSuccess } = require('../../utils/response-helper');
const {
  createAppointmentSchema,
  listAppointmentsSchema,
  updateStatusSchema,
  checkInSchema,
  rescheduleSchema,
} = require('./appointments.validator');

/**
 * APPOINTMENTS CONTROLLER
 * Thin request handlers — all business logic in appointments.service.js.
 * Role guards enforced in appointments.routes.js.
 */

/**
 * GET /api/v1/appointments
 */
const listAppointments = async (req, res, next) => {
  try {
    const { error, value } = listAppointmentsSchema.validate(req.query, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, message: 'Invalid query parameters.', errors: error.details.map((d) => d.message) });
    }
    const result = await appointmentsService.listAppointments({
      hospitalId: req.user.hospitalId,
      ...value,
    });
    return sendSuccess(res, { data: result, message: 'Appointments retrieved.', statusCode: 200 });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/appointments
 * Fires APPOINTMENT_CREATED to N8N on success.
 */
const createAppointment = async (req, res, next) => {
  try {
    const { error, value } = createAppointmentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, message: 'Invalid appointment payload.', errors: error.details.map((d) => d.message) });
    }
    const appointment = await appointmentsService.createAppointment(
      req.user.hospitalId,
      value,
      req.user.userId,
    );
    return sendSuccess(res, { data: { appointment }, message: 'Appointment booked successfully.', statusCode: 201 });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/appointments/:id
 */
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentsService.getAppointmentById(
      req.user.hospitalId,
      req.params.id,
    );
    return sendSuccess(res, { data: { appointment }, message: 'Appointment retrieved.', statusCode: 200 });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/appointments/:id/status
 * Fires APPOINTMENT_CANCELLED when newStatus = 'cancelled'.
 * Fires APPOINTMENT_CHECKED_IN when newStatus = 'checked_in'.
 */
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, message: 'Invalid status payload.', errors: error.details.map((d) => d.message) });
    }
    const appointment = await appointmentsService.updateAppointmentStatus(
      req.user.hospitalId,
      req.params.id,
      value,
      req.user.userId,
    );
    return sendSuccess(res, { data: { appointment }, message: 'Appointment status updated.', statusCode: 200 });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/appointments/:id/check-in
 * Dedicated check-in endpoint.
 * Transitions appointment to checked_in, generates Q-NNN queue token,
 * fires APPOINTMENT_CHECKED_IN event to N8N.
 */
const checkInAppointment = async (req, res, next) => {
  try {
    // Body is optional (notes field only)
    const { error } = checkInSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, message: 'Invalid check-in payload.', errors: error.details.map((d) => d.message) });
    }
    const appointment = await appointmentsService.checkInAppointment(
      req.user.hospitalId,
      req.params.id,
      req.user.userId,
    );
    return sendSuccess(res, { data: { appointment }, message: 'Patient checked in successfully.', statusCode: 200 });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/appointments/:id/reschedule
 * Marks original as 'rescheduled', creates a new confirmed appointment.
 * Fires APPOINTMENT_CREATED for the new slot.
 */
const rescheduleAppointment = async (req, res, next) => {
  try {
    const { error, value } = rescheduleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ success: false, message: 'Invalid reschedule payload.', errors: error.details.map((d) => d.message) });
    }
    const appointment = await appointmentsService.rescheduleAppointment(
      req.user.hospitalId,
      req.params.id,
      value,
      req.user.userId,
    );
    return sendSuccess(res, { data: { appointment }, message: 'Appointment rescheduled. New appointment created.', statusCode: 200 });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/appointments/:id
 * Soft-delete an appointment record. Admin only.
 */
const deleteAppointment = async (req, res, next) => {
  try {
    const result = await appointmentsService.deleteAppointment(
      req.user.hospitalId,
      req.params.id,
      req.user.userId,
    );
    return sendSuccess(res, { data: result, message: 'Appointment deleted.', statusCode: 200 });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointmentStatus,
  checkInAppointment,
  rescheduleAppointment,
  deleteAppointment,
};
