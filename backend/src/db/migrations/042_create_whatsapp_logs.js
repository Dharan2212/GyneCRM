'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('whatsapp_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('branch_id').nullable().references('id').inTable('branches').onDelete('SET NULL');
    t.uuid('patient_id').nullable().references('id').inTable('patients').onDelete('SET NULL');
    t.uuid('notification_id').nullable().references('id').inTable('notifications').onDelete('SET NULL');
    t.string('event_type', 100).notNullable();
    t.string('recipient_phone', 20).notNullable();
    t.text('message_body').nullable();
    t.specificType('status', 'whatsapp_status_enum').notNullable().defaultTo('pending');
    t.string('n8n_workflow_id', 200).nullable();
    t.string('whatsapp_message_id', 500).nullable();
    t.text('failure_reason').nullable();
    t.timestamp('sent_at').nullable();
    t.timestamp('delivered_at').nullable();
    t.timestamp('read_at').nullable();
    t.jsonb('payload').nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_whatsapp_logs_hospital_id ON whatsapp_logs(hospital_id)');
  await knex.raw('CREATE INDEX idx_whatsapp_logs_patient_id ON whatsapp_logs(patient_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('whatsapp_logs');
