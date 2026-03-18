'use strict';
exports.up = async function (knex) {
  await knex.schema.createTable('hospital_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('key', 100).notNullable();
    t.text('value');
    t.string('data_type', 20).defaultTo('string');
    t.text('description');
    t.timestamps(true, true);
    t.unique(['hospital_id', 'key']);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('hospital_settings');
