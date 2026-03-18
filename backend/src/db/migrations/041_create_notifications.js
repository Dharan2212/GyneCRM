'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('patient_id').nullable().references('id').inTable('patients').onDelete('SET NULL');
    t.string('event_type', 100).notNullable();
    t.text('message_body').notNullable();
    t.specificType('status', 'notification_status_enum').notNullable().defaultTo('pending');
    t.string('channel', 30).notNullable().defaultTo('whatsapp');
    t.string('recipient_phone', 20).notNullable();
    t.jsonb('payload').nullable();
    t.text('failure_reason').nullable();
    t.timestamp('sent_at').nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_notifications_hospital_id ON notifications(hospital_id)');
  await knex.raw('CREATE INDEX idx_notifications_patient_id ON notifications(patient_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('notifications');
