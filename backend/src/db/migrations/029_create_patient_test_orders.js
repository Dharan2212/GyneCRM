'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('patient_test_orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('consultation_id').nullable().references('id').inTable('consultations').onDelete('SET NULL');
    t.uuid('test_catalog_id').nullable().references('id').inTable('test_catalog').onDelete('SET NULL');
    t.uuid('ordered_by').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.string('test_name', 300).notNullable();
    t.string('test_code', 100).nullable();
    t.specificType('status', 'test_order_status_enum').notNullable().defaultTo('ordered');
    t.date('due_date').nullable();
    t.date('result_date').nullable();
    t.uuid('result_document_id').nullable();
    t.text('notes').nullable();
    t.text('skip_reason').nullable();
    t.uuid('skipped_by').nullable().references('id').inTable('users');
    t.timestamp('skipped_at').nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_patient_test_orders_hospital_id ON patient_test_orders(hospital_id)');
  await knex.raw('CREATE INDEX idx_patient_test_orders_patient_id ON patient_test_orders(patient_id)');
  await knex.raw('CREATE INDEX idx_patient_test_orders_status ON patient_test_orders(status)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('patient_test_orders');
