'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('prescription_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('prescription_id').notNullable().references('id').inTable('prescriptions').onDelete('CASCADE');
    t.string('medicine_name', 300).notNullable();
    t.string('dosage', 200).notNullable();
    t.string('frequency', 200).notNullable();
    t.string('duration', 200).notNullable();
    t.string('route', 100).nullable();
    t.text('instructions').nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('prescription_items');
