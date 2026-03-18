'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('patients', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('patient_uid', 50).notNullable();
    t.string('name', 300).notNullable();
    t.date('date_of_birth').nullable();
    t.string('phone', 20);
    t.string('phone_secondary', 20);
    t.string('email', 200).nullable();
    t.text('address');
    t.string('blood_group', 5);
    t.string('emergency_contact_name', 200);
    t.string('emergency_contact_phone', 20);
    t.string('emergency_contact_relation', 100);
    t.string('whatsapp_number', 20);
    t.boolean('whatsapp_consent').notNullable().defaultTo(false);
    t.boolean('family_notification_consent').notNullable().defaultTo(false);
    t.boolean('is_deleted').notNullable().defaultTo(false);
    t.timestamp('deleted_at').nullable();
    t.timestamps(true, true);
    t.unique(['hospital_id', 'patient_uid']);
  });
  await knex.raw('CREATE INDEX idx_patients_hospital_id ON patients(hospital_id)');
  await knex.raw('CREATE INDEX idx_patients_phone ON patients(phone)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('patients');
