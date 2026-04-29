const FollowUp = require('../../models/FollowUp');
const { assertObjectId } = require('../../utils/object-id');
const { normalizePagination, resolveHospitalId } = require('../appointments/appointments.query');

const FOLLOW_UP_DETAIL_POPULATE = [
  { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
  { path: 'doctor_id', select: 'full_name speciality registration_number' },
  { path: 'consultation_id', select: 'status follow_up_required follow_up_date chief_complaint appointment_id' },
  { path: 'appointment_id', select: 'scheduled_at status visit_type appointment_type_id is_active' },
  { path: 'created_by', select: 'full_name role email' },
  { path: 'updated_by', select: 'full_name role email' },
  { path: 'completed_by', select: 'full_name role email' },
  { path: 'cancelled_by', select: 'full_name role email' },
];

function buildFollowUpFilter(query = {}, currentUser = {}) {
  const filter = {
    hospital_id: resolveHospitalId(query.hospital_id, currentUser),
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.doctor_id) {
    assertObjectId(query.doctor_id, 'doctor_id');
    filter.doctor_id = query.doctor_id;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.due_from || query.due_to) {
    filter.due_date = {};

    if (query.due_from) {
      filter.due_date.$gte = new Date(query.due_from);
    }

    if (query.due_to) {
      filter.due_date.$lte = new Date(query.due_to);
    }
  }

  return filter;
}

function getFollowUpDetailQuery(filter = {}) {
  return FollowUp.findOne(filter).populate(FOLLOW_UP_DETAIL_POPULATE);
}

module.exports = {
  FOLLOW_UP_DETAIL_POPULATE,
  buildFollowUpFilter,
  getFollowUpDetailQuery,
  normalizePagination,
  resolveHospitalId,
};
