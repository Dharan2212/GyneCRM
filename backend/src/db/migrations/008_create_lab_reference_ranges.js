'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('lab_reference_ranges', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').nullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('test_code', 100).notNullable();
    t.string('parameter_name', 200).notNullable();
    t.string('unit', 50);
    t.decimal('normal_min', 10, 4).nullable();
    t.decimal('normal_max', 10, 4).nullable();
    t.decimal('critical_low', 10, 4).nullable();
    t.decimal('critical_high', 10, 4).nullable();
    t.specificType('applicable_to', 'reference_applicable_enum').notNullable().defaultTo('all');
    t.boolean('is_system_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('lab_reference_ranges');
