'use strict';

/**
 * Seed: 03_admin_user.js
 *
 * Creates the default bootstrap admin user for the demo hospital.
 *
 * BOOTSTRAP ADMIN CREDENTIALS (dev only)
 * Email   : admin@gynecrm.local
 * Password: Admin@GyneCRM1
 * Role    : admin
 * Hospital: GyneCRM Demo Hospital
 *
 * IMPORTANT: Change these credentials immediately in any non-local environment.
 */

const bcrypt = require('bcrypt');

const HOSPITAL_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // from seed 01
const ADMIN_USER_ID = '20000001-0000-0000-0000-000000000001';

const ADMIN_EMAIL = 'admin@gynecrm.local';
const ADMIN_PASSWORD = 'Admin@GyneCRM1';
const BCRYPT_ROUNDS = 12;

exports.seed = async function seed(knex) {
  const hospital = await knex('hospitals').where('id', HOSPITAL_ID).first('id');
  if (!hospital) {
    throw new Error('[seed:03] Hospital not found. Run seed 01 first.');
  }

  const adminRole = await knex('roles').where('name', 'admin').first('id');
  if (!adminRole) {
    throw new Error('[seed:03] Admin role not found. Run seed 02 first.');
  }

  const existing = await knex('users')
    .where({ hospital_id: HOSPITAL_ID, email: ADMIN_EMAIL })
    .first('id');

  if (existing) {
    console.log('[seed:03] Admin user already exists — skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date();

  await knex('users').insert({
    id: ADMIN_USER_ID,
    hospital_id: HOSPITAL_ID,
    branch_id: null,
    name: 'System Admin',
    email: ADMIN_EMAIL,
    phone: null,
    password_hash: passwordHash,
    role: null,
    role_id: adminRole.id,
    is_active: true,
    is_deleted: false,
    deleted_at: null,
    refresh_token_hash: null,
    last_login_at: null,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: now,
    updated_at: now,
  });

  console.log('[seed:03] Admin user created:');
  console.log('          Email   :', ADMIN_EMAIL);
  console.log('          Password:', ADMIN_PASSWORD);
  console.log('          Role    : admin');
  console.log('          Hospital: GyneCRM Demo Hospital');
};

exports.ADMIN_USER_ID = ADMIN_USER_ID;
exports.ADMIN_EMAIL = ADMIN_EMAIL;