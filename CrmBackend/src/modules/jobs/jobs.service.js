const Job = require('../../models/Job');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { getJobDefinition, JOB_REGISTRY } = require('./jobs.registry');
const { executeJob } = require('./jobs.runner');
const {
  resolveHospitalId,
  normalizePagination,
  buildJobFilter,
  buildJobResponse,
  getScopedJobById,
} = require('./jobs.query');
const { normalizeJobScheduling, buildQueueKey, getScopeDayParts } = require('./jobs.helpers');

async function dispatchJob(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id || null;
  const definition = getJobDefinition(payload.job_type);

  if (!definition) {
    throw new AppError('Unsupported job_type.', HTTP_STATUS.BAD_REQUEST);
  }

  const scheduling = normalizeJobScheduling(payload);
  const scopeDate = payload.scope_date ? getScopeDayParts(payload.scope_date).start : null;

  const job = await Job.create({
    hospital_id: hospitalId,
    job_type: payload.job_type,
    scope_date: scopeDate,
    run_mode: scheduling.run_mode,
    status: scheduling.status,
    payload_snapshot: payload.payload_snapshot ?? null,
    scheduled_for: scheduling.scheduled_for,
    available_at: scheduling.available_at,
    queue_key: payload.queue_key || buildQueueKey(payload.job_type, hospitalId, scopeDate),
    attempt_count: 0,
    max_attempts: Number.isFinite(Number(payload.max_attempts)) ? Number(payload.max_attempts) : 3,
    triggered_by: actorId,
    metadata: payload.metadata ?? null,
    is_active: true,
  });

  const saved = await getScopedJobById(String(job._id), hospitalId);
  return buildJobResponse(saved.toObject ? saved.toObject() : saved);
}

async function runJob(jobType, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id || null;
  const definition = getJobDefinition(jobType);

  if (!definition) {
    throw new AppError('Unsupported job_type.', HTTP_STATUS.BAD_REQUEST);
  }

  const scopeDate = payload.scope_date ? getScopeDayParts(payload.scope_date).start : new Date(new Date().setHours(0, 0, 0, 0));

  const job = await Job.create({
    hospital_id: hospitalId,
    job_type: jobType,
    scope_date: scopeDate,
    run_mode: 'manual',
    status: 'queued',
    payload_snapshot: payload.payload_snapshot ?? null,
    scheduled_for: null,
    available_at: new Date(),
    queue_key: payload.queue_key || buildQueueKey(jobType, hospitalId, scopeDate),
    attempt_count: 0,
    max_attempts: 1,
    triggered_by: actorId,
    metadata: payload.metadata ?? null,
    is_active: true,
  });

  await executeJob(job, currentUser);
  const saved = await getScopedJobById(String(job._id), hospitalId);
  return buildJobResponse(saved.toObject ? saved.toObject() : saved);
}

async function listJobs(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildJobFilter(query, hospitalId);

  const [rows, total] = await Promise.all([
    Job.find(filter)
      .populate(require('./jobs.query').LIST_POPULATE)
      .sort({ scheduled_for: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  return {
    records: rows.map(buildJobResponse),
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getJobDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const record = await getScopedJobById(id, hospitalId);
  return buildJobResponse(record.toObject ? record.toObject() : record);
}

async function cancelJob(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id || null;
  const record = await getScopedJobById(id, hospitalId);

  if (!['queued', 'scheduled'].includes(record.status)) {
    throw new AppError('Only queued or scheduled jobs can be cancelled.', HTTP_STATUS.CONFLICT);
  }

  record.status = 'cancelled';
  record.cancelled_at = new Date();
  record.is_active = false;
  record.metadata = {
    ...(record.metadata || {}),
    cancelled_by: actorId,
  };

  await record.save();
  const saved = await getScopedJobById(String(record._id), hospitalId);
  return buildJobResponse(saved.toObject ? saved.toObject() : saved);
}

function listJobTypes() {
  return Object.values(JOB_REGISTRY).map((item) => ({
    job_type: item.job_type,
    label: item.label,
    description: item.description,
  }));
}

module.exports = {
  dispatchJob,
  runJob,
  listJobs,
  getJobDetail,
  cancelJob,
  listJobTypes,
};
