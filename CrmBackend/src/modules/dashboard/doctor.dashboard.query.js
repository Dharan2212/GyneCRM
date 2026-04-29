const mongoose = require('mongoose');
const Doctor = require('../../models/Doctor');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId } = require('../../utils/object-id');
const { resolveHospitalId } = require('../appointments/appointments.query');

function resolveDashboardDate(query = {}) {
  const base = query.date ? new Date(query.date) : new Date();
  const start = new Date(base);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    requested_date: base.toISOString(),
    day_start: start,
    day_end: end,
  };
}

async function resolveDoctorScope(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  if (currentUser.role === 'doctor') {
    const doctor = await Doctor.findOne({
      hospital_id: hospitalObjectId,
      user_id: currentUser.id,
    })
      .select('_id full_name speciality user_id')
      .lean();

    if (!doctor) {
      throw new AppError('Doctor profile not found for the current user.', HTTP_STATUS.NOT_FOUND);
    }

    return {
      hospital_id: hospitalId,
      hospital_object_id: hospitalObjectId,
      doctor_id: String(doctor._id),
      doctor_object_id: new mongoose.Types.ObjectId(String(doctor._id)),
      doctor_summary: doctor,
      scope_mode: 'self',
    };
  }

  if (query.doctor_id) {
    assertObjectId(query.doctor_id, 'doctor_id');

    const doctor = await Doctor.findOne({
      _id: query.doctor_id,
      hospital_id: hospitalObjectId,
    })
      .select('_id full_name speciality user_id')
      .lean();

    if (!doctor) {
      throw new AppError('Doctor not found for the provided doctor_id.', HTTP_STATUS.NOT_FOUND);
    }

    return {
      hospital_id: hospitalId,
      hospital_object_id: hospitalObjectId,
      doctor_id: String(doctor._id),
      doctor_object_id: new mongoose.Types.ObjectId(String(doctor._id)),
      doctor_summary: doctor,
      scope_mode: 'doctor_override',
    };
  }

  return {
    hospital_id: hospitalId,
    hospital_object_id: hospitalObjectId,
    doctor_id: null,
    doctor_object_id: null,
    doctor_summary: null,
    scope_mode: 'hospital',
  };
}

function maybeDoctorFilter(scope = {}) {
  if (scope.doctor_id) {
    return { doctor_id: scope.doctor_object_id || scope.doctor_id };
  }

  return {};
}

module.exports = {
  resolveDashboardDate,
  resolveDoctorScope,
  maybeDoctorFilter,
};
