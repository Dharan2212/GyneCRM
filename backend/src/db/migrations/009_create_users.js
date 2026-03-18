'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('branch_id').nullable().references('id').inTable('branches').onDelete('SET NULL');
    t.string('name', 300).notNullable();
    t.string('email', 200).notNullable();
    t.string('phone', 20);
    t.string('password_hash', 500).notNullable();
    t.string('role', 50).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_deleted').notNullable().defaultTo(false);
    t.timestamp('deleted_at').nullable();
    t.string('refresh_token_hash', 500).nullable();
    t.timestamp('last_login_at').nullable();
    t.timestamps(true, true);
    t.unique(['hospital_id', 'email']);
  });
  await knex.raw('CREATE INDEX idx_users_hospital_id ON users(hospital_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('users');
