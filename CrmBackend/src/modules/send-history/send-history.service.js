const SendHistory = require('../../models/SendHistory');
const Patient = require('../../models/Patient');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const {
  resolveHospitalId,
  normalizePagination,
  buildSendHistoryFilter,
  buildSendHistoryResponse,
  getScopedSendHistoryById,
} = require('./send-history.query');

async function ensureScopedPatient(patientId, hospitalId) {
  const patient = await Patient.findOne({
    _id: patientId,
    hospital_id: hospitalId,
    is_deleted: false,
  })
    .select('_id')
    .lean();

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  return patient;
}

async function listSendHistory(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildSendHistoryFilter(query, hospitalId);

  const [rows, total] = await Promise.all([
    SendHistory.find(filter)
      .populate(require('./send-history.query').LIST_POPULATE)
      .sort({ requested_at: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SendHistory.countDocuments(filter),
  ]);

  return {
    records: rows.map(buildSendHistoryResponse),
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getSendHistoryDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const record = await getScopedSendHistoryById(id, hospitalId);
  return buildSendHistoryResponse(record);
}

async function getPatientSendHistory(patientId, query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  await ensureScopedPatient(patientId, hospitalId);

  const result = await listSendHistory({ ...query, patient_id: patientId, hospital_id: hospitalId }, currentUser);
  return result;
}

module.exports = {
  listSendHistory,
  getSendHistoryDetail,
  getPatientSendHistory,
};
