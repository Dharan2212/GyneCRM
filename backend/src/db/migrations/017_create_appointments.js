'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('appointments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('branch_id').nullable().references('id').inTable('branches').onDelete('SET NULL');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('RESTRICT');
    t.uuid('appointment_type_id').nullable().references('id').inTable('appointment_types');
    t.date('appointment_date').notNullable();
    t.time('appointment_time').notNullable();
    t.integer('duration_minutes').notNullable().defaultTo(20);
    t.specificType('status', 'appointment_status_enum').notNullable().defaultTo('scheduled');
    t.specificType('visit_type', 'visit_type_enum').notNullable().defaultTo('new');
    t.text('notes').nullable();
    t.uuid('booked_by').nullable().references('id').inTable('users');
    t.uuid('cancelled_by').nullable().references('id').inTable('users');
    t.text('cancel_reason').nullable();
    t.timestamp('checked_in_at').nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_appointments_hospital_id ON appointments(hospital_id)');
  await knex.raw('CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date)');
  await knex.raw('CREATE INDEX idx_appointments_patient_id ON appointments(patient_id)');
  await knex.raw('CREATE INDEX idx_appointments_status ON appointments(status)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('appointments');
