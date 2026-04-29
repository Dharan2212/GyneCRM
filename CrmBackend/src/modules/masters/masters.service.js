const AppointmentType = require('../../models/AppointmentType');
const ServiceCatalog = require('../../models/ServiceCatalog');
const TestCatalog = require('../../models/TestCatalog');
const LabReferenceRange = require('../../models/LabReferenceRange');
const HospitalProtocol = require('../../models/HospitalProtocol');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const { normalizePagination, resolveHospitalId, buildBaseFilter } = require('./masters.query');

async function listDocuments(Model, query = {}, currentUser = {}, options = {}) {
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildBaseFilter(query, currentUser);

  if (query.search && Array.isArray(options.searchFields) && options.searchFields.length > 0) {
    filter.$or = options.searchFields.map((field) => ({
      [field]: { $regex: query.search, $options: 'i' },
    }));
  }

  const [docs, total] = await Promise.all([
    Model.find(filter)
      .sort(options.sort || { createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    data: docs,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function assertNoDuplicate(Model, filter, message, excludeId = null) {
  const duplicateFilter = { ...filter };

  if (excludeId) {
    duplicateFilter._id = { $ne: excludeId };
  }

  const exists = await Model.exists(duplicateFilter);
  if (exists) {
    throw new AppError(message, HTTP_STATUS.CONFLICT);
  }
}

async function createDocument(Model, payload = {}, currentUser = {}, options = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const normalizedPayload = {
    ...payload,
    hospital_id: hospitalId,
  };

  if (typeof options.beforeCreate === 'function') {
    await options.beforeCreate(normalizedPayload, hospitalId);
  }

  const doc = await Model.create(normalizedPayload);
  return doc.toObject();
}

async function updateDocument(Model, id, payload = {}, currentUser = {}, options = {}) {
  assertObjectId(id, 'id');

  const existingDoc = await Model.findById(id).lean();
  if (!existingDoc) {
    throw new AppError('Record not found.', HTTP_STATUS.NOT_FOUND);
  }

  const requestHospitalId = currentUser.hospital_id || payload.hospital_id || existingDoc.hospital_id;
  if (requestHospitalId && String(existingDoc.hospital_id) !== String(requestHospitalId)) {
    throw new AppError('Record not found.', HTTP_STATUS.NOT_FOUND);
  }

  const normalizedPayload = { ...payload };
  delete normalizedPayload.hospital_id;

  if (typeof options.beforeUpdate === 'function') {
    await options.beforeUpdate(existingDoc, normalizedPayload);
  }

  const updatedDoc = await Model.findByIdAndUpdate(
    id,
    { $set: normalizedPayload },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  return updatedDoc;
}

function listAppointmentTypes(query, currentUser) {
  return listDocuments(AppointmentType, query, currentUser, {
    searchFields: ['name', 'code', 'description'],
    sort: { name: 1, _id: 1 },
  });
}

function createAppointmentType(payload, currentUser) {
  return createDocument(AppointmentType, payload, currentUser, {
    beforeCreate: async (normalizedPayload, hospitalId) => {
      await assertNoDuplicate(
        AppointmentType,
        { hospital_id: hospitalId, code: normalizedPayload.code.toUpperCase() },
        'An appointment type with this code already exists.',
      );
      await assertNoDuplicate(
        AppointmentType,
        { hospital_id: hospitalId, name: normalizedPayload.name },
        'An appointment type with this name already exists.',
      );
    },
  });
}

function updateAppointmentType(id, payload, currentUser) {
  return updateDocument(AppointmentType, id, payload, currentUser, {
    beforeUpdate: async (existingDoc, normalizedPayload) => {
      if (normalizedPayload.code) {
        normalizedPayload.code = normalizedPayload.code.toUpperCase();
        await assertNoDuplicate(
          AppointmentType,
          { hospital_id: existingDoc.hospital_id, code: normalizedPayload.code },
          'An appointment type with this code already exists.',
          existingDoc._id,
        );
      }

      if (normalizedPayload.name) {
        await assertNoDuplicate(
          AppointmentType,
          { hospital_id: existingDoc.hospital_id, name: normalizedPayload.name },
          'An appointment type with this name already exists.',
          existingDoc._id,
        );
      }
    },
  });
}

function listServiceCatalog(query, currentUser) {
  return listDocuments(ServiceCatalog, query, currentUser, {
    searchFields: ['name', 'category'],
    sort: { name: 1, _id: 1 },
  });
}

function createServiceCatalog(payload, currentUser) {
  return createDocument(ServiceCatalog, payload, currentUser, {
    beforeCreate: async (normalizedPayload, hospitalId) => {
      await assertNoDuplicate(
        ServiceCatalog,
        { hospital_id: hospitalId, name: normalizedPayload.name },
        'A service catalog entry with this name already exists.',
      );
    },
  });
}

function updateServiceCatalog(id, payload, currentUser) {
  return updateDocument(ServiceCatalog, id, payload, currentUser, {
    beforeUpdate: async (existingDoc, normalizedPayload) => {
      if (normalizedPayload.name) {
        await assertNoDuplicate(
          ServiceCatalog,
          { hospital_id: existingDoc.hospital_id, name: normalizedPayload.name },
          'A service catalog entry with this name already exists.',
          existingDoc._id,
        );
      }
    },
  });
}

function listTestCatalog(query, currentUser) {
  return listDocuments(TestCatalog, query, currentUser, {
    searchFields: ['name', 'code', 'category', 'reference_unit'],
    sort: { name: 1, _id: 1 },
  });
}

function createTestCatalog(payload, currentUser) {
  return createDocument(TestCatalog, payload, currentUser, {
    beforeCreate: async (normalizedPayload, hospitalId) => {
      normalizedPayload.code = normalizedPayload.code.toUpperCase();
      await assertNoDuplicate(
        TestCatalog,
        { hospital_id: hospitalId, code: normalizedPayload.code },
        'A test catalog entry with this code already exists.',
      );
      await assertNoDuplicate(
        TestCatalog,
        { hospital_id: hospitalId, name: normalizedPayload.name },
        'A test catalog entry with this name already exists.',
      );
    },
  });
}

function updateTestCatalog(id, payload, currentUser) {
  return updateDocument(TestCatalog, id, payload, currentUser, {
    beforeUpdate: async (existingDoc, normalizedPayload) => {
      if (normalizedPayload.code) {
        normalizedPayload.code = normalizedPayload.code.toUpperCase();
        await assertNoDuplicate(
          TestCatalog,
          { hospital_id: existingDoc.hospital_id, code: normalizedPayload.code },
          'A test catalog entry with this code already exists.',
          existingDoc._id,
        );
      }

      if (normalizedPayload.name) {
        await assertNoDuplicate(
          TestCatalog,
          { hospital_id: existingDoc.hospital_id, name: normalizedPayload.name },
          'A test catalog entry with this name already exists.',
          existingDoc._id,
        );
      }
    },
  });
}

function listLabReferenceRanges(query, currentUser) {
  return listDocuments(LabReferenceRange, query, currentUser, {
    searchFields: ['parameter_name', 'unit', 'notes'],
    sort: { parameter_name: 1, _id: 1 },
  });
}

function createLabReferenceRange(payload, currentUser) {
  return createDocument(LabReferenceRange, payload, currentUser, {
    beforeCreate: async (normalizedPayload, hospitalId) => {
      assertObjectId(normalizedPayload.test_catalog_id, 'test_catalog_id');
      await assertNoDuplicate(
        LabReferenceRange,
        {
          hospital_id: hospitalId,
          test_catalog_id: normalizedPayload.test_catalog_id,
          parameter_name: normalizedPayload.parameter_name,
        },
        'A lab reference range for this parameter already exists.',
      );
    },
  });
}

function updateLabReferenceRange(id, payload, currentUser) {
  return updateDocument(LabReferenceRange, id, payload, currentUser, {
    beforeUpdate: async (existingDoc, normalizedPayload) => {
      const nextTestCatalogId = normalizedPayload.test_catalog_id || existingDoc.test_catalog_id;
      const nextParameterName = normalizedPayload.parameter_name || existingDoc.parameter_name;

      assertObjectId(nextTestCatalogId, 'test_catalog_id');
      await assertNoDuplicate(
        LabReferenceRange,
        {
          hospital_id: existingDoc.hospital_id,
          test_catalog_id: nextTestCatalogId,
          parameter_name: nextParameterName,
        },
        'A lab reference range for this parameter already exists.',
        existingDoc._id,
      );
    },
  });
}

function listHospitalProtocols(query, currentUser) {
  return listDocuments(HospitalProtocol, query, currentUser, {
    searchFields: ['protocol_name', 'category'],
    sort: { protocol_name: 1, _id: 1 },
  });
}

function createHospitalProtocol(payload, currentUser) {
  return createDocument(HospitalProtocol, payload, currentUser, {
    beforeCreate: async (normalizedPayload, hospitalId) => {
      await assertNoDuplicate(
        HospitalProtocol,
        {
          hospital_id: hospitalId,
          protocol_name: normalizedPayload.protocol_name,
          category: normalizedPayload.category,
        },
        'A hospital protocol with this name and category already exists.',
      );
    },
  });
}

function updateHospitalProtocol(id, payload, currentUser) {
  return updateDocument(HospitalProtocol, id, payload, currentUser, {
    beforeUpdate: async (existingDoc, normalizedPayload) => {
      const nextProtocolName = normalizedPayload.protocol_name || existingDoc.protocol_name;
      const nextCategory = normalizedPayload.category || existingDoc.category;

      await assertNoDuplicate(
        HospitalProtocol,
        {
          hospital_id: existingDoc.hospital_id,
          protocol_name: nextProtocolName,
          category: nextCategory,
        },
        'A hospital protocol with this name and category already exists.',
        existingDoc._id,
      );
    },
  });
}

module.exports = {
  listAppointmentTypes,
  createAppointmentType,
  updateAppointmentType,
  listServiceCatalog,
  createServiceCatalog,
  updateServiceCatalog,
  listTestCatalog,
  createTestCatalog,
  updateTestCatalog,
  listLabReferenceRanges,
  createLabReferenceRange,
  updateLabReferenceRange,
  listHospitalProtocols,
  createHospitalProtocol,
  updateHospitalProtocol,
};
