'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('doctor_branch_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('CASCADE');
    t.uuid('branch_id').notNullable().references('id').inTable('branches').onDelete('CASCADE');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.unique(['doctor_id', 'branch_id']);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('doctor_branch_assignments');
