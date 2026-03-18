'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('test_recommendations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('consultation_id').notNullable().references('id').inTable('consultations').onDelete('RESTRICT');
    t.uuid('patient_id').notNullable().references('id').inTable('patients').onDelete('RESTRICT');
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.uuid('test_catalog_id').nullable().references('id').inTable('test_catalog').onDelete('SET NULL');
    t.string('test_name', 300).notNullable();
    t.text('notes').nullable();
    t.boolean('is_urgent').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('test_recommendations');
