'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('patient_medical_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.text('chronic_conditions');
    t.text('past_surgeries');
    t.text('allergies');
    t.text('current_medications');
    t.text('family_history');
    t.text('gynaecological_history');
    t.text('obstetric_summary');
    t.integer('gravida').defaultTo(0);
    t.integer('para').defaultTo(0);
    t.integer('living').defaultTo(0);
    t.integer('abortion').defaultTo(0);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('patient_medical_history');
