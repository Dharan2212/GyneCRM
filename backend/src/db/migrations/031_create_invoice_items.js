'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('invoice_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    t.uuid('service_catalog_id').nullable().references('id').inTable('service_catalog').onDelete('SET NULL');
    t.string('item_name', 300).notNullable();
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_price', 10, 2).notNullable();
    t.decimal('discount_amount', 10, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 10, 2).notNullable().defaultTo(0);
    t.decimal('line_total', 10, 2).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('invoice_items');
