'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('resource_bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('clinic_resources').onDelete('RESTRICT');
    t.uuid('appointment_id').notNullable().references('id').inTable('appointments').onDelete('CASCADE');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.date('booking_date').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.specificType('status', 'resource_booking_status_enum').notNullable().defaultTo('reserved');
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('resource_bookings');
