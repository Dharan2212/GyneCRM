const Job = require('../../models/Job');
const { getJobDefinition } = require('./jobs.registry');

async function executeJob(job, currentUser = {}) {
  const definition = getJobDefinition(job.job_type);

  if (!definition) {
    job.status = 'failed';
    job.failed_at = new Date();
    job.last_error_code = 'JOB_TYPE_NOT_REGISTERED';
    job.last_error_message = 'No handler is registered for the requested job_type.';
    await job.save();
    return job;
  }

  job.status = 'running';
  job.started_at = new Date();
  job.attempt_count = (job.attempt_count || 0) + 1;
  await job.save();

  try {
    const result = await definition.handler({
      hospitalId: job.hospital_id,
      job,
      currentUser,
    });

    job.status = result.status || 'completed';
    if (job.status === 'failed') {
      job.failed_at = new Date();
    } else if (job.status === 'cancelled') {
      job.cancelled_at = new Date();
    } else {
      job.completed_at = new Date();
    }

    job.result_summary = result.result_summary || null;
    job.result_counts = result.result_counts || null;
    job.related_event_ids = result.related_event_ids || [];
    job.related_notification_ids = result.related_notification_ids || [];
    job.related_send_history_ids = result.related_send_history_ids || [];
    job.last_error_code = null;
    job.last_error_message = null;
    await job.save();
    return job;
  } catch (error) {
    job.status = 'failed';
    job.failed_at = new Date();
    job.last_error_code = error.code || error.name || 'JOB_EXECUTION_FAILED';
    job.last_error_message = error.message || 'Job execution failed.';
    await job.save();
    throw error;
  }
}

module.exports = {
  executeJob,
};
