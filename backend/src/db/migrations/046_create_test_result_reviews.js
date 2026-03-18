'use strict';
/**
 * Migration 046 — test_result_reviews
 * Doctor-authored review record for a patient document (lab result / scan).
 * Linked to patient_documents; one review per document per doctor review cycle.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('test_result_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('document_id').notNullable().references('id').inTable('patient_documents').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('reviewed_by').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.specificType('flag_level', 'result_flag_enum').notNullable().defaultTo('manual');
    t.boolean('abnormal_flag').notNullable().defaultTo(false);
    t.text('review_notes').nullable();
    t.jsonb('annotated_values').nullable();
    t.boolean('admin_alert_sent').notNullable().defaultTo(false);
    t.timestamp('reviewed_at').notNullable().defaultTo(knex.raw('NOW()'));
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_test_result_reviews_hospital_id ON test_result_reviews(hospital_id)');
  await knex.raw('CREATE INDEX idx_test_result_reviews_patient_id ON test_result_reviews(patient_id)');
  await knex.raw('CREATE INDEX idx_test_result_reviews_document_id ON test_result_reviews(document_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('test_result_reviews');
