'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('doctors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('primary_branch_id').nullable().references('id').inTable('branches').onDelete('SET NULL');
    t.string('specialization', 200);
    t.string('qualification', 500);
    t.string('registration_number', 100);
    t.text('signature_url');
    t.integer('default_slot_duration_minutes').defaultTo(20);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_doctors_hospital_id ON doctors(hospital_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('doctors');
