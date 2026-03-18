'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('patient_consents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.specificType('consent_type', 'consent_type_enum').notNullable();
    t.specificType('status', 'consent_status_enum').notNullable().defaultTo('given');
    t.uuid('recorded_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('notes');
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_patient_consents_patient_id ON patient_consents(patient_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('patient_consents');
