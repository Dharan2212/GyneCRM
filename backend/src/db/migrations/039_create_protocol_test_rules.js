'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('protocol_test_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('protocol_id').notNullable().references('id').inTable('hospital_protocols').onDelete('CASCADE');
    t.uuid('test_catalog_id').nullable().references('id').inTable('test_catalog').onDelete('SET NULL');
    t.string('test_name', 300).notNullable();
    t.specificType('trigger_type', 'protocol_trigger_enum').notNullable();
    t.integer('trigger_week').nullable();
    t.boolean('is_mandatory').notNullable().defaultTo(true);
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('protocol_test_rules');
