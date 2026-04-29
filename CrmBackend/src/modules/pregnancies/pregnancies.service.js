const Pregnancy = require('../../models/Pregnancy');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Consultation = require('../../models/Consultation');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');
const {
  EDITABLE_FIELDS,
  resolveHospitalId,
  getPregnancyDetailQuery,
  formatPregnancyPayload,
} = require('./pregnancies.query');
const { mergeMilestones, updateMilestoneStatus } = require('./pregnancies.milestones');

function subtractDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function deriveLmpFromEdd(eddDate) {
  if (!eddDate) {
    return null;
  }

  const edd = eddDate instanceof Date ? eddDate : new Date(eddDate);

  if (Number.isNaN(edd.getTime())) {
    return null;
  }

  return subtractDays(edd, 280);
}

async function ensureScopedReferences({ hospitalId, patientId, doctorId, sourceConsultationId = null }) {
  const [patient, doctor] = await Promise.all([
    Patient.findOne({ _id: patientId, hospital_id: hospitalId, is_deleted: false }).lean(),
    Doctor.findOne({ _id: doctorId, hospital_id: hospitalId }).lean(),
  ]);

  if (!patient) {
    throw new AppError('Patient not found for current hospital scope.', HTTP_STATUS.NOT_FOUND);
  }

  if (!doctor) {
    throw new AppError('Doctor not found for current hospital scope.', HTTP_STATUS.NOT_FOUND);
  }

  if (sourceConsultationId) {
    const consultation = await Consultation.findOne({
      _id: sourceConsultationId,
      hospital_id: hospitalId,
      patient_id: patientId,
      doctor_id: doctorId,
    }).lean();

    if (!consultation) {
      throw new AppError(
        'Source consultation not found for current hospital/patient/doctor scope.',
        HTTP_STATUS.NOT_FOUND,
      );
    }
  }
}

async function loadPregnancyDetail(id, hospitalId) {
  const pregnancy = await getPregnancyDetailQuery({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!pregnancy) {
    throw new AppError('Pregnancy not found.', HTTP_STATUS.NOT_FOUND);
  }

  return formatPregnancyPayload(pregnancy);
}

function buildPregnancyPayload(payload = {}, actorId) {
  const pregnancyPayload = { ...payload };

  if (pregnancyPayload.edd && !pregnancyPayload.lmp_date) {
    pregnancyPayload.lmp_date = deriveLmpFromEdd(pregnancyPayload.edd);
  }

  if (pregnancyPayload.high_risk === false) {
    pregnancyPayload.high_risk_flags = [];
    pregnancyPayload.high_risk_notes = null;
  }

  pregnancyPayload.updated_by = actorId;
  return pregnancyPayload;
}

async function createPregnancy(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id;

  if (!actorId || !isValidObjectId(actorId)) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.UNAUTHORIZED);
  }

  await ensureScopedReferences({
    hospitalId,
    patientId: payload.patient_id,
    doctorId: payload.doctor_id,
    sourceConsultationId: payload.source_consultation_id || null,
  });

  const pregnancy = await Pregnancy.create({
    ...buildPregnancyPayload(payload, actorId),
    hospital_id: hospitalId,
    status: 'active',
    created_by: actorId,
    updated_by: actorId,
    is_active: true,
  });

  return loadPregnancyDetail(pregnancy._id, hospitalId);
}

async function getPregnancyDetail(id, currentUser = {}) {
  assertObjectId(id, 'pregnancy id');
  const hospitalId = resolveHospitalId(null, currentUser);
  return loadPregnancyDetail(id, hospitalId);
}

async function updatePregnancy(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'pregnancy id');
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  const pregnancy = await Pregnancy.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!pregnancy) {
    throw new AppError('Pregnancy not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (pregnancy.status !== 'active') {
    throw new AppError('Only active pregnancies can be updated in this batch.', HTTP_STATUS.CONFLICT);
  }

  const mergedLmp = Object.prototype.hasOwnProperty.call(payload, 'lmp_date') ? payload.lmp_date : pregnancy.lmp_date;
  const mergedEdd = Object.prototype.hasOwnProperty.call(payload, 'edd') ? payload.edd : pregnancy.edd;

  if (!mergedLmp && !mergedEdd) {
    throw new AppError('Either lmp_date or edd must remain available.', HTTP_STATUS.BAD_REQUEST);
  }

  EDITABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      pregnancy[field] = payload[field];
    }
  });

  if (pregnancy.edd && !pregnancy.lmp_date) {
    pregnancy.lmp_date = deriveLmpFromEdd(pregnancy.edd);
  }

  pregnancy.updated_by = actorId;
  await pregnancy.save();

  return loadPregnancyDetail(pregnancy._id, hospitalId);
}

async function updatePregnancyHighRisk(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'pregnancy id');
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  const pregnancy = await Pregnancy.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!pregnancy) {
    throw new AppError('Pregnancy not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (pregnancy.status !== 'active') {
    throw new AppError('High-risk fields can only be updated while pregnancy is active.', HTTP_STATUS.CONFLICT);
  }

  pregnancy.high_risk = payload.high_risk;
  pregnancy.high_risk_flags = payload.high_risk ? (payload.high_risk_flags || []) : [];
  pregnancy.high_risk_notes = payload.high_risk ? (payload.high_risk_notes || null) : null;
  pregnancy.updated_by = actorId;

  await pregnancy.save();
  return loadPregnancyDetail(pregnancy._id, hospitalId);
}

async function updatePregnancyMilestones(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'pregnancy id');
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  const pregnancy = await Pregnancy.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!pregnancy) {
    throw new AppError('Pregnancy not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (pregnancy.status !== 'active') {
    throw new AppError('Milestones can only be updated while pregnancy is active.', HTTP_STATUS.CONFLICT);
  }

  pregnancy.milestones = mergeMilestones(pregnancy.milestones || [], payload.milestones || []);
  pregnancy.updated_by = actorId;

  await pregnancy.save();
  return loadPregnancyDetail(pregnancy._id, hospitalId);
}


async function getPregnancyMilestones(id, currentUser = {}) {
  const pregnancy = await getPregnancyDetail(id, currentUser);
  return pregnancy.milestones || [];
}

async function updatePregnancyMilestoneStatus(id, milestoneCode, payload = {}, currentUser = {}) {
  assertObjectId(id, 'pregnancy id');
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  const pregnancy = await Pregnancy.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!pregnancy) {
    throw new AppError('Pregnancy not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (pregnancy.status !== 'active') {
    throw new AppError('Milestone status can only be updated while pregnancy is active.', HTTP_STATUS.CONFLICT);
  }

  pregnancy.milestones = updateMilestoneStatus(pregnancy.milestones || [], milestoneCode, payload);
  pregnancy.updated_by = actorId;

  await pregnancy.save();
  return loadPregnancyDetail(pregnancy._id, hospitalId);
}

module.exports = {
  createPregnancy,
  getPregnancyDetail,
  updatePregnancy,
  updatePregnancyHighRisk,
  updatePregnancyMilestones,
  getPregnancyMilestones,
  updatePregnancyMilestoneStatus,
};
