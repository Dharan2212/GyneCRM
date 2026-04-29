const Consultation = require('../../models/Consultation');

const DETAIL_POPULATE = [
  { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
  { path: 'doctor_id', select: 'full_name speciality registration_number' },
  { path: 'appointment_id', select: 'scheduled_at status visit_type appointment_type_id is_active' },
  { path: 'created_by', select: 'full_name role email' },
  { path: 'updated_by', select: 'full_name role email' },
  { path: 'finalised_by', select: 'full_name role email' },
];

const EDITABLE_FIELDS = [
  'chief_complaint',
  'history_of_present_illness',
  'vitals',
  'examination',
  'diagnosis',
  'provisional_diagnosis',
  'advice',
  'notes',
  'follow_up_required',
  'follow_up_date',
];

function getConsultationDetailQuery(filter = {}) {
  return Consultation.findOne(filter).populate(DETAIL_POPULATE);
}

module.exports = {
  DETAIL_POPULATE,
  EDITABLE_FIELDS,
  getConsultationDetailQuery,
};
