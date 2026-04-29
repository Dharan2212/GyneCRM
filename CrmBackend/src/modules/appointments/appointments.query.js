const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId } = require('../../utils/object-id');

function normalizePagination(query = {}) {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 10;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function resolveHospitalId(queryHospitalId, currentUser = {}) {
  const hospitalId = currentUser.hospital_id || queryHospitalId;

  if (!hospitalId) {
    throw new AppError('hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(hospitalId, 'hospital_id');
  return hospitalId;
}

function buildAppointmentFilter(query = {}, currentUser = {}) {
  const filter = {
    hospital_id: resolveHospitalId(query.hospital_id, currentUser),
    is_active: true,
  };

  if (query.doctor_id) {
    assertObjectId(query.doctor_id, 'doctor_id');
    filter.doctor_id = query.doctor_id;
  }

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.appointment_type_id) {
    assertObjectId(query.appointment_type_id, 'appointment_type_id');
    filter.appointment_type_id = query.appointment_type_id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.date) {
    const start = new Date(query.date);
    const end = new Date(query.date);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.scheduled_at = { $gte: start, $lt: end };
  }

  if (query.scheduled_from || query.scheduled_to) {
    filter.scheduled_at = filter.scheduled_at || {};

    if (query.scheduled_from) {
      filter.scheduled_at.$gte = new Date(query.scheduled_from);
    }

    if (query.scheduled_to) {
      filter.scheduled_at.$lte = new Date(query.scheduled_to);
    }
  }

  return filter;
}

module.exports = {
  normalizePagination,
  resolveHospitalId,
  buildAppointmentFilter,
};
