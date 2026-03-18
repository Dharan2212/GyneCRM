'use strict';

const { db } = require('../../db/connection');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * HOSPITAL SERVICE
 * All queries are scoped to req.user.hospitalId.
 * Manages hospital profile and the hospital_settings key-value store.
 */

/**
 * Fetch the hospital record for the authenticated tenant.
 */
const getHospital = async (hospitalId) => {
  const hospital = await db('hospitals').where({ id: hospitalId }).first();

  if (!hospital) {
    throw createError(404, 'HOSPITAL_NOT_FOUND', 'Hospital record not found.');
  }

  return hospital;
};

/**
 * Fetch all settings for the authenticated hospital.
 * Returns an array of { setting_key, setting_value, description } rows.
 */
const getSettings = async (hospitalId) => {
  const settings = await db('hospital_settings')
    .where({ hospital_id: hospitalId })
    .select('setting_key', 'setting_value', 'description', 'updated_at')
    .orderBy('setting_key', 'asc');

  return settings;
};

/**
 * Upsert one or more hospital settings.
 * Uses PostgreSQL ON CONFLICT ... DO UPDATE so callers can mix new and
 * existing keys in the same request.
 *
 * @param {string}   hospitalId
 * @param {Array}    settingsArray  [{ key, value, description? }]
 * @param {string}   actorId       user_id performing the action
 */
const updateSettings = async (hospitalId, settingsArray, actorId) => {
  const now = new Date();

  const rows = settingsArray.map((s) => ({
    hospital_id: hospitalId,
    setting_key: s.key,
    setting_value: s.value,
    description: s.description || null,
    created_at: now,
    updated_at: now,
  }));

  await db.transaction(async (trx) => {
    for (const row of rows) {
      await trx.raw(
        `INSERT INTO hospital_settings
           (hospital_id, setting_key, setting_value, description, created_at, updated_at)
         VALUES (:hospital_id, :setting_key, :setting_value, :description, :created_at, :updated_at)
         ON CONFLICT (hospital_id, setting_key)
         DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           description   = COALESCE(EXCLUDED.description, hospital_settings.description),
           updated_at    = EXCLUDED.updated_at`,
        row
      );
    }

    // Audit log
    await trx('activity_logs').insert({
      hospital_id: hospitalId,
      user_id: actorId,
      action: 'UPDATE_HOSPITAL_SETTINGS',
      module: 'hospital',
      entity_id: hospitalId,
      entity_type: 'hospital_settings',
      meta: { keys_updated: settingsArray.map((s) => s.key) },
      created_at: now,
    });
  });

  logger.info(`Hospital settings updated by user ${actorId} for hospital ${hospitalId}`);

  return getSettings(hospitalId);
};

module.exports = {
  getHospital,
  getSettings,
  updateSettings,
};
