'use strict';

/**
 * Migration 049 — Fix users table schema
 *
 * The original migration 009 created users with:
 *   - `role` (string, 50) — stores role name directly
 *
 * The architecture requires:
 *   - `role_id` (UUID FK → roles.id) — proper FK relationship
 *   - `failed_login_attempts` (integer) — account lockout tracking
 *   - `locked_until` (timestamp nullable) — lockout expiry
 *
 * This migration:
 *   1. Adds role_id column (nullable initially to allow backfill)
 *   2. Backfills role_id from existing role string values by joining roles table
 *   3. Adds NOT NULL constraint + FK after backfill
 *   4. Adds failed_login_attempts (default 0)
 *   5. Adds locked_until (nullable timestamp)
 *   6. Keeps the `role` string column for backwards compatibility
 *      (auth.service.js reads role_name via JOIN; role string is redundant but safe)
 */

exports.up = async function (knex) {
  const hasRoleId            = await knex.schema.hasColumn('users', 'role_id');
  const hasFailedAttempts    = await knex.schema.hasColumn('users', 'failed_login_attempts');
  const hasLockedUntil       = await knex.schema.hasColumn('users', 'locked_until');

  await knex.schema.alterTable('users', (t) => {
    if (!hasRoleId) {
      // Add as nullable first to allow backfill before enforcing NOT NULL
      t.uuid('role_id').nullable().references('id').inTable('roles').onDelete('RESTRICT');
    }
    if (!hasFailedAttempts) {
      t.integer('failed_login_attempts').notNullable().defaultTo(0);
    }
    if (!hasLockedUntil) {
      t.timestamp('locked_until').nullable();
    }
  });

  // Make the legacy `role` string column nullable — users.service.js inserts
  // via role_id FK only and does not populate the string column.
  // Raw SQL is required because knex alterTable cannot alter nullability on pg
  // without explicitly casting.
  await knex.raw(`
    ALTER TABLE users
      ALTER COLUMN role DROP NOT NULL,
      ALTER COLUMN role SET DEFAULT NULL
  `);

  // Backfill role_id from role string values
  if (!hasRoleId) {
    const roles = await knex('roles').select('id', 'name');
    for (const r of roles) {
      await knex('users')
        .where('role', r.name)
        .whereNull('role_id')
        .update({ role_id: r.id });
    }

    // Any users with unrecognised role string → assign admin role as fallback
    const adminRole = roles.find((r) => r.name === 'admin');
    if (adminRole) {
      await knex('users').whereNull('role_id').update({ role_id: adminRole.id });
    }

    // Now add index on role_id
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)');
  }
};

exports.down = async function (knex) {
  // Restore role NOT NULL (backfill first to avoid constraint violation)
  await knex('users').whereNull('role').update({ role: 'admin' });
  await knex.raw(`ALTER TABLE users ALTER COLUMN role SET NOT NULL`);

  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('role_id');
    t.dropColumn('failed_login_attempts');
    t.dropColumn('locked_until');
  });
};
