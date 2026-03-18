'use strict';
exports.up = async (knex) => {
  await knex.schema.createTable('protocol_milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('protocol_id').notNullable().references('id').inTable('hospital_protocols').onDelete('CASCADE');
    t.integer('week_number').notNullable();
    t.string('milestone_name', 300).notNullable();
    t.text('description').nullable();
    t.boolean('is_critical').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('protocol_milestones');
