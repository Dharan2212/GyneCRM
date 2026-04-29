const Doctor = require('../../models/Doctor');
const User = require('../../models/User');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');
const { normalizePagination, buildDoctorFilter } = require('./doctors.query');

async function findDuplicateDoctor({ hospital_id, registration_number, user_id, excludeDoctorId = null }) {
  const checks = [];

  if (registration_number) {
    const registrationFilter = {
      hospital_id,
      registration_number,
    };

    if (excludeDoctorId) {
      registrationFilter._id = { $ne: excludeDoctorId };
    }

    checks.push(
      Doctor.exists(registrationFilter).then((exists) => {
        if (exists) {
          throw new AppError('A doctor with this registration number already exists.', HTTP_STATUS.CONFLICT);
        }
      }),
    );
  }

  if (user_id) {
    const userFilter = { user_id };

    if (excludeDoctorId) {
      userFilter._id = { $ne: excludeDoctorId };
    }

    checks.push(
      Doctor.exists(userFilter).then((exists) => {
        if (exists) {
          throw new AppError('This user is already linked to another doctor.', HTTP_STATUS.CONFLICT);
        }
      }),
    );
  }

  await Promise.all(checks);
}

async function ensureLinkedUser(userId) {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw new AppError('Linked user not found.', HTTP_STATUS.NOT_FOUND);
  }

  return user;
}

async function listDoctors(query = {}, currentUser = {}) {
  const { page, limit, skip } = normalizePagination(query);
  const baseFilter = buildDoctorFilter(query, currentUser);
  const activeFilter = query.is_active;

  const pipeline = [
    { $match: baseFilter },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (activeFilter !== undefined) {
    pipeline.push({
      $match: {
        'user.is_active': activeFilter,
      },
    });
  }

  pipeline.push(
    { $sort: { full_name: 1, _id: 1 } },
    {
      $facet: {
        docs: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              'user.password_hash': 0,
              'user.refresh_token_hash': 0,
              __v: 0,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  );

  const [result] = await Doctor.aggregate(pipeline);
  const total = result?.totalCount?.[0]?.count || 0;

  return {
    doctors: result?.docs || [],
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getDoctorDetail(id, currentUser = {}) {
  assertObjectId(id, 'doctor id');

  const doctor = await Doctor.findById(id).lean();

  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (currentUser.hospital_id && isValidObjectId(currentUser.hospital_id)) {
    if (String(doctor.hospital_id) !== String(currentUser.hospital_id)) {
      throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
    }
  }

  const user = await User.findById(doctor.user_id).lean();

  return {
    ...doctor,
    user: user
      ? {
          _id: user._id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone,
          is_active: user.is_active,
          is_locked: user.is_locked,
          last_login_at: user.last_login_at,
        }
      : null,
  };
}

async function createDoctor(payload = {}, currentUser = {}) {
  const hospitalId = payload.hospital_id || currentUser.hospital_id;

  if (!hospitalId) {
    throw new AppError('hospital_id is required to create doctor.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(hospitalId, 'hospital_id');
  assertObjectId(payload.user_id, 'user_id');

  await ensureLinkedUser(payload.user_id);

  await findDuplicateDoctor({
    hospital_id: hospitalId,
    registration_number: payload.registration_number || null,
    user_id: payload.user_id,
  });

  const doctor = await Doctor.create({
    ...payload,
    hospital_id: hospitalId,
  });

  return doctor.toObject();
}

async function updateDoctor(id, payload = {}, currentUser = {}) {
  assertObjectId(id, 'doctor id');

  const existingDoctor = await Doctor.findById(id).lean();
  if (!existingDoctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (currentUser.hospital_id && isValidObjectId(currentUser.hospital_id)) {
    if (String(existingDoctor.hospital_id) !== String(currentUser.hospital_id)) {
      throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
    }
  }

  const nextUserId = payload.user_id || existingDoctor.user_id;
  const nextHospitalId = existingDoctor.hospital_id;
  const nextRegistrationNumber = Object.prototype.hasOwnProperty.call(payload, 'registration_number')
    ? payload.registration_number
    : existingDoctor.registration_number;

  if (payload.user_id) {
    assertObjectId(payload.user_id, 'user_id');
    await ensureLinkedUser(payload.user_id);
  }

  await findDuplicateDoctor({
    hospital_id: nextHospitalId,
    registration_number: nextRegistrationNumber || null,
    user_id: nextUserId,
    excludeDoctorId: id,
  });

  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  return doctor;
}

module.exports = {
  listDoctors,
  getDoctorDetail,
  createDoctor,
  updateDoctor,
};
