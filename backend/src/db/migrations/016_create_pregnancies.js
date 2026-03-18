'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('pregnancies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.date('lmp_date').notNullable();
    t.date('edd').nullable();
    t.integer('pregnancy_week').notNullable().defaultTo(0);
    t.integer('gravida').notNullable().defaultTo(1);
    t.integer('para').notNullable().defaultTo(0);
    t.specificType('status', 'pregnancy_status_enum').notNullable().defaultTo('active');
    t.boolean('is_high_risk').notNullable().defaultTo(false);
    t.text('high_risk_reason').nullable();
    t.date('delivery_date').nullable();
    t.text('notes').nullable();
    t.uuid('closed_by').nullable().references('id').inTable('users');
    t.timestamp('closed_at').nullable();
    t.string('close_reason', 200).nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_pregnancies_patient_id ON pregnancies(patient_id)');
  await knex.raw('CREATE INDEX idx_pregnancies_hospital_id ON pregnancies(hospital_id)');
  await knex.raw('CREATE INDEX idx_pregnancies_status ON pregnancies(status)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('pregnancies');
