'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('deliveries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('pregnancy_id').notNullable().references('id').inTable('pregnancies').onDelete('RESTRICT').unique();
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.date('delivery_date').notNullable();
    t.time('delivery_time').nullable();
    t.specificType('delivery_type', 'delivery_type_enum').notNullable();
    t.integer('gestational_age_weeks').nullable();
    t.specificType('onset_of_labour', 'labour_onset_enum').nullable();
    t.specificType('anaesthesia_type', 'anaesthesia_type_enum').nullable();
    t.text('complications').nullable();
    t.specificType('birth_outcome', 'birth_outcome_enum').notNullable();
    t.text('notes').nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_deliveries_hospital_id ON deliveries(hospital_id)');
  await knex.raw('CREATE INDEX idx_deliveries_patient_id ON deliveries(patient_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('deliveries');
