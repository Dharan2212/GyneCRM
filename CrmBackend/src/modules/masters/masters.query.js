const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');

function normalizePagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function resolveHospitalId(inputHospitalId, currentUser = {}) {
  const hospitalId = inputHospitalId || currentUser.hospital_id;

  if (!hospitalId) {
    throw new AppError('hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(hospitalId, 'hospital_id');
  return hospitalId;
}

function buildBaseFilter(query = {}, currentUser = {}) {
  const filter = {
    hospital_id: resolveHospitalId(query.hospital_id, currentUser),
  };

  if (query.is_active !== undefined) {
    filter.is_active = query.is_active;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.test_catalog_id) {
    assertObjectId(query.test_catalog_id, 'test_catalog_id');
    filter.test_catalog_id = query.test_catalog_id;
  }

  return filter;
}

module.exports = {
  normalizePagination,
  resolveHospitalId,
  buildBaseFilter,
};
