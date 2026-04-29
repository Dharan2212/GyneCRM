const { assertObjectId } = require('../../utils/object-id');
const { normalizePagination, resolveHospitalId } = require('./appointments.query');

function buildWaitlistFilter(query = {}, currentUser = {}) {
  const filter = {
    hospital_id: resolveHospitalId(query.hospital_id, currentUser),
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.preferred_doctor_id) {
    assertObjectId(query.preferred_doctor_id, 'preferred_doctor_id');
    filter.preferred_doctor_id = query.preferred_doctor_id;
  }

  if (query.desired_date) {
    const start = new Date(query.desired_date);
    const end = new Date(query.desired_date);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.desired_date = { $gte: start, $lt: end };
  }

  if (query.is_active !== undefined) {
    filter.is_active = query.is_active;
  }

  return filter;
}

module.exports = {
  normalizePagination,
  buildWaitlistFilter,
};
