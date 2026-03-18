'use strict';
exports.up = async function (knex) {
  await knex.schema.createTable('roles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 50).notNullable().unique();
    t.text('description');
    t.timestamps(true, true);
  });
  await knex('roles').insert([
    { name: 'admin',        description: 'Full system access' },
    { name: 'doctor',       description: 'Clinical data + own appointments' },
    { name: 'receptionist', description: 'Patient reg, appointments, billing, documents' },
    { name: 'staff',        description: 'Document upload, limited patient read' },
  ]);
};
exports.down = (knex) => knex.schema.dropTableIfExists('roles');
