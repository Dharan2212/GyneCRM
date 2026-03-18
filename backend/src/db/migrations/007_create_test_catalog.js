'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('test_catalog', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').nullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('test_name', 300).notNullable();
    t.string('test_code', 100);
    t.specificType('category', 'test_category_enum').notNullable();
    t.text('description');
    t.decimal('default_price', 10, 2).defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_system_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('test_catalog');
