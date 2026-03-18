'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('clinic_resources', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('branch_id').nullable().references('id').inTable('branches').onDelete('SET NULL');
    t.string('name', 200).notNullable();
    t.specificType('resource_type', 'resource_type_enum').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('clinic_resources');
