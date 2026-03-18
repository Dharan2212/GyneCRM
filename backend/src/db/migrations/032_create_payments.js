'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.decimal('amount', 10, 2).notNullable();
    t.specificType('payment_mode', 'payment_mode_enum').notNullable();
    t.string('reference_number', 200).nullable();
    t.date('payment_date').notNullable().defaultTo(knex.raw('CURRENT_DATE'));
    t.timestamp('paid_at').notNullable().defaultTo(knex.raw('NOW()'));
    t.uuid('recorded_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX idx_payments_invoice_id ON payments(invoice_id)');
  await knex.raw('CREATE INDEX idx_payments_hospital_id ON payments(hospital_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('payments');
