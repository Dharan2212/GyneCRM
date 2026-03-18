'use strict';

/**
 * Seed: 01_hospital.js
 *
 * Creates the default bootstrap hospital record.
 * All other seeds (roles via migration, users) depend on this record's ID.
 *
 * The hospital ID is deterministic (hardcoded UUID) so subsequent seeds and
 * local development scripts can reference it without querying the DB first.
 *
 * COLUMNS match migration 001_create_hospitals.js exactly:
 *   id, name, slug, phone, email, address, city, state, country,
 *   pincode, logo_url, timezone, currency, is_active, created_at, updated_at
 */

const HOSPITAL_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

exports.seed = async function (knex) {
  // Idempotent: skip if hospital already exists
  const existing = await knex('hospitals').where('id', HOSPITAL_ID).first('id');
  if (existing) {
    console.log('[seed:01] Hospital already exists — skipping.');
    return;
  }

  await knex('hospitals').insert({
    id:         HOSPITAL_ID,
    name:       'GyneCRM Demo Hospital',
    slug:       'gynecrm-demo',
    phone:      '+91-9000000000',
    email:      'admin@gynecrm.local',
    address:    '1, Demo Street, Health District',
    city:       'Coimbatore',
    state:      'Tamil Nadu',
    country:    'India',
    pincode:    '641001',
    logo_url:   null,
    timezone:   'Asia/Kolkata',
    currency:   'INR',
    is_active:  true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log('[seed:01] Hospital created: GyneCRM Demo Hospital (id=' + HOSPITAL_ID + ')');
};

// Export the ID so other seed files can import it without a DB query
exports.HOSPITAL_ID = HOSPITAL_ID;
