'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('doctor_leaves', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('CASCADE');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.date('leave_date').notNullable();
    t.specificType('leave_type', 'leave_type_enum').notNullable();
    t.time('start_time').nullable();
    t.time('end_time').nullable();
    t.text('reason').nullable();
    t.uuid('approved_by').nullable().references('id').inTable('users');
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('doctor_leaves');
