'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('prescriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('consultation_id').notNullable().references('id').inTable('consultations').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.specificType('status', 'prescription_status_enum').notNullable().defaultTo('draft');
    t.timestamp('issued_at').nullable();
    t.timestamp('voided_at').nullable();
    t.text('void_reason').nullable();
    t.uuid('voided_by').nullable().references('id').inTable('users');
    t.uuid('reissued_from_id').nullable().references('id').inTable('prescriptions');
    t.text('pdf_url').nullable();
    t.text('notes').nullable();
    t.uuid('created_by').nullable().references('id').inTable('users');
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_prescriptions_hospital_id ON prescriptions(hospital_id)');
  await knex.raw('CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('prescriptions');
