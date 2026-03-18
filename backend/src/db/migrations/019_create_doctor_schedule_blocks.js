'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('doctor_schedule_blocks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('doctor_id').notNullable().references('id').inTable('doctors').onDelete('CASCADE');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.date('block_date').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.specificType('block_type', 'block_type_enum').notNullable();
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('doctor_schedule_blocks');
