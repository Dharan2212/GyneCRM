'use strict';

const bcrypt = require('bcrypt');
const { db } = require('../../db/connection');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 12;

/**
 * USERS SERVICE
 * All queries are scoped to the caller's hospitalId.
 * Password is never returned in any response.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Select list — columns returned on list/detail calls.
 * Excludes password_hash.
 */
const USER_COLUMNS = [
  'users.id',
  'users.hospital_id',
  'users.name',
  'users.email',
  'users.phone',
  'users.is_active',
  'users.last_login_at',
  'users.failed_login_attempts',
  'users.locked_until',
  'users.created_at',
  'users.updated_at',
  'roles.name as role_name',
  'roles.id as role_id',
];

/** Resolve role_id UUID from role name string, scoped to hospital. */
const resolveRoleId = async (roleName) => {
  const role = await db('roles').where({ name: roleName }).first('id');
  if (!role) {
    throw createError(400, 'INVALID_ROLE', `Role '${roleName}' does not exist.`);
  }
  return role.id;
};

/** Append an activity_log entry inside an existing transaction. */
const auditLog = (trx, { hospitalId, actorId, action, entityId, meta = {} }) =>
  trx('activity_logs').insert({
    hospital_id: hospitalId,
    user_id: actorId,
    action,
    module: 'users',
    entity_id: entityId,
    entity_type: 'users',
    meta,
    created_at: new Date(),
  });

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * List users — paginated, filterable by role / is_active / name-email search.
 */
const listUsers = async ({ hospitalId, page, limit, role, is_active, search }) => {
  const offset = (page - 1) * limit;

  let query = db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where('users.hospital_id', hospitalId)
    .where('users.is_deleted', false)
    .select(USER_COLUMNS);

  if (role) {
    query = query.where('roles.name', role);
  }

  if (typeof is_active === 'boolean') {
    query = query.where('users.is_active', is_active);
  }

  if (search) {
    query = query.where((qb) =>
      qb
        .whereILike('users.name', `%${search}%`)
        .orWhereILike('users.email', `%${search}%`)
    );
  }

  const [{ count }] = await query.clone().count({ count: '*' });
  const users = await query.orderBy('users.created_at', 'desc').limit(limit).offset(offset);

  return {
    users,
    pagination: {
      total: parseInt(count, 10),
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get a single user by ID, hospital-scoped.
 */
const getUserById = async (hospitalId, userId) => {
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where({ 'users.id': userId, 'users.hospital_id': hospitalId, 'users.is_deleted': false })
    .select(USER_COLUMNS)
    .first();

  if (!user) {
    throw createError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  return user;
};

/**
 * Create a new user.
 * Hashes the password. Assigns role. Enforces email uniqueness per hospital.
 */
const createUser = async (hospitalId, payload, actorId) => {
  const { name, email, phone, password, role, branch_id } = payload;

  // Email uniqueness check within tenant
  const existing = await db('users')
    .where({ hospital_id: hospitalId, email, is_deleted: false })
    .first('id');

  if (existing) {
    throw createError(409, 'EMAIL_TAKEN', 'A user with this email already exists.');
  }

  const roleId = await resolveRoleId(role);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date();

  const [newUser] = await db.transaction(async (trx) => {
    const inserted = await trx('users')
      .insert({
        hospital_id: hospitalId,
        role_id: roleId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password_hash: passwordHash,
        is_active: true,
        is_deleted: false,
        failed_login_attempts: 0,
        created_at: now,
        updated_at: now,
      })
      .returning([
        'id',
        'hospital_id',
        'name',
        'email',
        'phone',
        'is_active',
        'created_at',
      ]);

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'CREATE_USER',
      entityId: inserted[0].id,
      meta: { email, role },
    });

    return inserted;
  });

  logger.info(`User created: ${newUser.id} by actor ${actorId}`);
  return getUserById(hospitalId, newUser.id);
};

/**
 * Update an existing user. Role change supported.
 * Email change re-validates uniqueness.
 */
const updateUser = async (hospitalId, userId, payload, actorId) => {
  // Verify user exists in tenant
  await getUserById(hospitalId, userId);

  const updates = { updated_at: new Date() };

  if (payload.name) updates.name = payload.name;
  if (payload.phone !== undefined) updates.phone = payload.phone || null;

  if (payload.email) {
    const emailLower = payload.email.toLowerCase();
    const conflict = await db('users')
      .where({ hospital_id: hospitalId, email: emailLower, is_deleted: false })
      .whereNot({ id: userId })
      .first('id');

    if (conflict) {
      throw createError(409, 'EMAIL_TAKEN', 'Email is already in use by another user.');
    }
    updates.email = emailLower;
  }

  if (payload.role) {
    updates.role_id = await resolveRoleId(payload.role);
  }

  if (payload.branch_id !== undefined) {
    updates.branch_id = payload.branch_id || null;
  }

  await db.transaction(async (trx) => {
    await trx('users').where({ id: userId, hospital_id: hospitalId }).update(updates);

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'UPDATE_USER',
      entityId: userId,
      meta: { fields_changed: Object.keys(payload) },
    });
  });

  return getUserById(hospitalId, userId);
};

/**
 * Activate a user account.
 */
const activateUser = async (hospitalId, userId, actorId) => {
  await getUserById(hospitalId, userId);

  await db.transaction(async (trx) => {
    await trx('users')
      .where({ id: userId, hospital_id: hospitalId })
      .update({ is_active: true, updated_at: new Date() });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'ACTIVATE_USER',
      entityId: userId,
    });
  });

  return getUserById(hospitalId, userId);
};

/**
 * Deactivate a user account.
 * Prevents login. Does not delete the record.
 */
const deactivateUser = async (hospitalId, userId, actorId) => {
  const user = await getUserById(hospitalId, userId);

  // Prevent an admin from deactivating themselves
  if (userId === actorId) {
    throw createError(400, 'SELF_DEACTIVATION', 'You cannot deactivate your own account.');
  }

  await db.transaction(async (trx) => {
    await trx('users')
      .where({ id: userId, hospital_id: hospitalId })
      .update({ is_active: false, updated_at: new Date() });

    await auditLog(trx, {
      hospitalId,
      actorId,
      action: 'DEACTIVATE_USER',
      entityId: userId,
    });
  });

  return getUserById(hospitalId, userId);
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  activateUser,
  deactivateUser,
};
