'use strict';
exports.up = async function (knex) {
  await knex.schema.createTable('hospitals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.string('slug', 100).notNullable().unique();
    t.string('phone', 20);
    t.string('email', 200);
    t.text('address');
    t.string('city', 100);
    t.string('state', 100);
    t.string('country', 100).defaultTo('India');
    t.string('pincode', 10);
    t.text('logo_url');
    t.string('timezone', 60).defaultTo('Asia/Kolkata');
    t.string('currency', 10).defaultTo('INR');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('hospitals');
