'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('day_close_summaries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('branch_id').nullable().references('id').inTable('branches').onDelete('SET NULL');
    t.date('close_date').notNullable();
    t.integer('total_appointments').notNullable().defaultTo(0);
    t.integer('completed_appointments').notNullable().defaultTo(0);
    t.integer('no_show_appointments').notNullable().defaultTo(0);
    t.integer('cancelled_appointments').notNullable().defaultTo(0);
    t.decimal('total_revenue', 12, 2).notNullable().defaultTo(0);
    t.decimal('cash_collected', 12, 2).notNullable().defaultTo(0);
    t.decimal('card_collected', 12, 2).notNullable().defaultTo(0);
    t.decimal('upi_collected', 12, 2).notNullable().defaultTo(0);
    t.decimal('insurance_collected', 12, 2).notNullable().defaultTo(0);
    t.decimal('online_collected', 12, 2).notNullable().defaultTo(0);
    t.integer('new_patients').notNullable().defaultTo(0);
    t.integer('invoices_generated').notNullable().defaultTo(0);
    t.integer('invoices_paid').notNullable().defaultTo(0);
    t.uuid('closed_by').nullable().references('id').inTable('users');
    t.jsonb('meta').nullable();
    t.timestamps(true, true);
    t.unique(['hospital_id', 'close_date', 'branch_id']);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('day_close_summaries');
