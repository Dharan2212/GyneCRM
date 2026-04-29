const Pregnancy = require('../../models/Pregnancy');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId } = require('../../utils/object-id');

const DETAIL_POPULATE = [
  { path: 'patient_id', select: 'patient_code full_name phone category is_active' },
  { path: 'doctor_id', select: 'full_name speciality registration_number' },
  { path: 'source_consultation_id', select: 'status appointment_id follow_up_required follow_up_date createdAt' },
  { path: 'created_by', select: 'full_name role email' },
  { path: 'updated_by', select: 'full_name role email' },
  { path: 'closed_by', select: 'full_name role email' },
];

const EDITABLE_FIELDS = [
  'pregnancy_number',
  'conception_type',
  'lmp_date',
  'edd',
  'gravida',
  'para',
  'abortions',
  'living_children',
  'pregnancy_notes',
  'current_weight_kg',
  'pre_pregnancy_weight_kg',
  'blood_group',
  'rh_factor',
  'status',
];

function resolveHospitalId(queryHospitalId, currentUser = {}) {
  const hospitalId = currentUser.hospital_id || queryHospitalId;

  if (!hospitalId) {
    throw new AppError('hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(hospitalId, 'hospital_id');
  return hospitalId;
}

function getPregnancyDetailQuery(filter = {}) {
  return Pregnancy.findOne(filter).populate(DETAIL_POPULATE);
}

function formatPregnancyPayload(pregnancyDoc) {
  const pregnancy = typeof pregnancyDoc.toObject === 'function'
    ? pregnancyDoc.toObject({ virtuals: true })
    : { ...pregnancyDoc };

  return {
    pregnancy: {
      _id: pregnancy._id,
      hospital_id: pregnancy.hospital_id,
      patient_id: pregnancy.patient_id?._id || pregnancy.patient_id || null,
      doctor_id: pregnancy.doctor_id?._id || pregnancy.doctor_id || null,
      source_consultation_id: pregnancy.source_consultation_id?._id || pregnancy.source_consultation_id || null,
      pregnancy_number: pregnancy.pregnancy_number,
      status: pregnancy.status,
      conception_type: pregnancy.conception_type,
      lmp_date: pregnancy.lmp_date,
      edd: pregnancy.edd,
      gestational_age_weeks: pregnancy.gestational_age_weeks,
      gestational_age_days: pregnancy.gestational_age_days,
      current_gestational_age: pregnancy.current_gestational_age || null,
      trimester: pregnancy.trimester,
      gravida: pregnancy.gravida,
      para: pregnancy.para,
      abortions: pregnancy.abortions,
      living_children: pregnancy.living_children,
      high_risk: pregnancy.high_risk,
      high_risk_flags: pregnancy.high_risk_flags || [],
      high_risk_notes: pregnancy.high_risk_notes,
      pregnancy_notes: pregnancy.pregnancy_notes,
      current_weight_kg: pregnancy.current_weight_kg,
      pre_pregnancy_weight_kg: pregnancy.pre_pregnancy_weight_kg,
      blood_group: pregnancy.blood_group,
      rh_factor: pregnancy.rh_factor,
      milestones: pregnancy.milestones || [],
      created_by: pregnancy.created_by?._id || pregnancy.created_by || null,
      updated_by: pregnancy.updated_by?._id || pregnancy.updated_by || null,
      closed_at: pregnancy.closed_at,
      closed_by: pregnancy.closed_by?._id || pregnancy.closed_by || null,
      is_active: pregnancy.is_active,
      created_at: pregnancy.createdAt,
      updated_at: pregnancy.updatedAt,
    },
    patient_summary: pregnancy.patient_id
      ? {
          _id: pregnancy.patient_id._id,
          patient_code: pregnancy.patient_id.patient_code,
          full_name: pregnancy.patient_id.full_name,
          phone: pregnancy.patient_id.phone,
          category: pregnancy.patient_id.category,
          is_active: pregnancy.patient_id.is_active,
        }
      : null,
    doctor_summary: pregnancy.doctor_id
      ? {
          _id: pregnancy.doctor_id._id,
          full_name: pregnancy.doctor_id.full_name,
          speciality: pregnancy.doctor_id.speciality,
          registration_number: pregnancy.doctor_id.registration_number,
        }
      : null,
    source_consultation_summary: pregnancy.source_consultation_id
      ? {
          _id: pregnancy.source_consultation_id._id,
          status: pregnancy.source_consultation_id.status,
          appointment_id:
            pregnancy.source_consultation_id.appointment_id?._id || pregnancy.source_consultation_id.appointment_id || null,
          follow_up_required: pregnancy.source_consultation_id.follow_up_required,
          follow_up_date: pregnancy.source_consultation_id.follow_up_date,
          created_at: pregnancy.source_consultation_id.createdAt,
        }
      : null,
  };
}

module.exports = {
  DETAIL_POPULATE,
  EDITABLE_FIELDS,
  resolveHospitalId,
  getPregnancyDetailQuery,
  formatPregnancyPayload,
};
