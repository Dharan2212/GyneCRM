const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId } = require('../../utils/object-id');

function normalizePagination(query = {}) {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 10;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePhone(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const digits = String(value).replace(/\D/g, '');
  return digits || null;
}

function buildLoosePhoneRegex(value) {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return null;
  }

  const pattern = normalized.split('').map(escapeRegex).join('\\D*');
  return new RegExp(pattern);
}

function resolveHospitalId(queryHospitalId, currentUser = {}) {
  const hospitalId = currentUser.hospital_id || queryHospitalId;

  if (!hospitalId) {
    throw new AppError('hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(hospitalId, 'hospital_id');
  return hospitalId;
}

function buildPatientFilter(query = {}, currentUser = {}) {
  const filter = {
    hospital_id: resolveHospitalId(query.hospital_id, currentUser),
    is_deleted: false,
  };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.is_active !== undefined) {
    filter.is_active = query.is_active;
  }

  if (query.search) {
    const searchValue = String(query.search).trim();
    const searchRegex = new RegExp(escapeRegex(searchValue), 'i');
    const phoneRegex = buildLoosePhoneRegex(searchValue);
    const searchOr = [
      { full_name: searchRegex },
      { patient_code: searchRegex },
    ];

    if (phoneRegex) {
      searchOr.push({ phone: phoneRegex }, { alternate_phone: phoneRegex }, { family_whatsapp: phoneRegex });
    } else {
      searchOr.push({ phone: searchRegex }, { alternate_phone: searchRegex }, { family_whatsapp: searchRegex });
    }

    filter.$or = searchOr;
  }

  return filter;
}

module.exports = {
  normalizePagination,
  escapeRegex,
  normalizePhone,
  buildLoosePhoneRegex,
  resolveHospitalId,
  buildPatientFilter,
};
