'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('neonates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('delivery_id').notNullable().references('id').inTable('deliveries').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.integer('birth_order').notNullable().defaultTo(1);
    t.specificType('sex', 'neonate_sex_enum').nullable();
    t.decimal('birth_weight_kg', 4, 3).nullable();
    t.integer('apgar_1min').nullable();
    t.integer('apgar_5min').nullable();
    t.decimal('head_circumference_cm', 4, 1).nullable();
    t.decimal('birth_length_cm', 4, 1).nullable();
    t.boolean('nicu_required').notNullable().defaultTo(false);
    t.text('nicu_reason').nullable();
    t.text('outcome_notes').nullable();
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('neonates');
