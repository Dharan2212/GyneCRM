'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('waitlist', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.date('preferred_date').nullable();
    t.specificType('status', 'waitlist_status_enum').notNullable().defaultTo('waiting');
    t.integer('position').nullable();
    t.text('notes').nullable();
    t.uuid('offered_appointment_id').nullable().references('id').inTable('appointments');
    t.timestamp('expires_at').nullable();
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('waitlist');
