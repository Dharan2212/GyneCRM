const mongoose = require('mongoose');
const { assertObjectId } = require('../../utils/object-id');

function normalizePagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function resolveDoctorHospitalId(query = {}, currentUser = {}) {
  const hospitalId = query.hospital_id || currentUser.hospital_id || null;

  if (hospitalId) {
    assertObjectId(hospitalId, 'hospital_id');
    return new mongoose.Types.ObjectId(hospitalId);
  }

  return null;
}

function buildDoctorFilter(query = {}, currentUser = {}) {
  const filter = {};
  const hospitalId = resolveDoctorHospitalId(query, currentUser);

  if (hospitalId) {
    filter.hospital_id = hospitalId;
  }

  if (query.speciality) {
    filter.speciality = query.speciality;
  }

  if (query.search) {
    filter.$or = [
      { full_name: { $regex: query.search, $options: 'i' } },
      { speciality: { $regex: query.search, $options: 'i' } },
      { registration_number: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
}

module.exports = {
  normalizePagination,
  resolveDoctorHospitalId,
  buildDoctorFilter,
};