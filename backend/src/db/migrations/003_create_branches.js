'use strict';
exports.up = async function (knex) {
  await knex.schema.createTable('branches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hospital_id').notNullable().references('id').inTable('hospitals').onDelete('RESTRICT');
    t.string('name', 200).notNullable();
    t.string('code', 20);
    t.text('address');
    t.string('phone', 20);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_primary').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_branches_hospital_id ON branches(hospital_id)');
};
exports.down = (knex) => knex.schema.dropTableIfExists('branches');
