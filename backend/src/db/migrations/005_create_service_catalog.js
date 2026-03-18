'use strict';
exports.up = async function (knex) {
  await knex.schema.createTable('service_catalog', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('service_name', 300).notNullable();
    t.specificType('category', 'service_category_enum').notNullable();
    t.decimal('base_price', 10, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('description');
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('service_catalog');
