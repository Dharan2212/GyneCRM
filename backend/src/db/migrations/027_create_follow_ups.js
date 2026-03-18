'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('follow_ups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('consultation_id').nullable().references('id').inTable('consultations').onDelete('SET NULL');
    t.date('due_date').notNullable();
    t.specificType('status', 'followup_status_enum').notNullable().defaultTo('scheduled');
    t.text('reason').nullable();
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL');
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('follow_ups');
