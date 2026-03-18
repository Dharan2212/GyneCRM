'use strict';

/**
 * Seed: 02_roles.js
 *
 * Ensures the 4 locked system roles exist.
 * Migration 002_create_roles.js may already insert these rows, but this seed
 * guarantees idempotent correctness when running seeds on a fresh or partially
 * seeded database.
 *
 * COLUMNS match migration 002_create_roles.js:
 *   id, name, description, created_at, updated_at
 */

const ROLE_IDS = {
  admin: '10000001-0000-0000-0000-000000000001',
  doctor: '10000001-0000-0000-0000-000000000002',
  receptionist: '10000001-0000-0000-0000-000000000003',
  staff: '10000001-0000-0000-0000-000000000004',
};

const ROLES = [
  {
    id: ROLE_IDS.admin,
    name: 'admin',
    description: 'Full system access',
  },
  {
    id: ROLE_IDS.doctor,
    name: 'doctor',
    description: 'Clinical data + own appointments',
  },
  {
    id: ROLE_IDS.receptionist,
    name: 'receptionist',
    description: 'Patient reg, appointments, billing, documents',
  },
  {
    id: ROLE_IDS.staff,
    name: 'staff',
    description: 'Document upload, limited patient read',
  },
];

exports.seed = async function seed(knex) {
  const now = new Date();

  for (const role of ROLES) {
    const existing = await knex('roles').where('name', role.name).first('id');

    if (existing) {
      await knex('roles')
        .where('name', role.name)
        .update({
          description: role.description,
          updated_at: now,
        });

      console.log(`[seed:02] Role '${role.name}' already exists — updated description.`);
    } else {
      await knex('roles').insert({
        id: role.id,
        name: role.name,
        description: role.description,
        created_at: now,
        updated_at: now,
      });

      console.log(`[seed:02] Role '${role.name}' created (id=${role.id})`);
    }
  }
};

exports.ROLE_IDS = ROLE_IDS;