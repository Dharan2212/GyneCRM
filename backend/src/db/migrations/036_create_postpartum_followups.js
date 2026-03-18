'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('postpartum_followups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('delivery_id').notNullable().references('id').inTable('deliveries').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.date('due_date').notNullable();
    t.specificType('visit_type', 'postpartum_visit_enum').notNullable();
    t.specificType('status', 'followup_status_enum').notNullable().defaultTo('scheduled');
    t.uuid('appointment_id').nullable().references('id').inTable('appointments').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_postpartum_followups_patient_id ON postpartum_followups(patient_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('postpartum_followups');
