'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('hospital_protocols', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('name', 300).notNullable();
    t.specificType('protocol_type', 'protocol_type_enum').notNullable();
    t.integer('version').notNullable().defaultTo(1);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('description').nullable();
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('hospital_protocols');
