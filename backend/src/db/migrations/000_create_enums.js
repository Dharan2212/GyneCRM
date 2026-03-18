'use strict';

/**
 * Migration 000 — All 33 PostgreSQL ENUM types.
 * MUST run before any table migration. No table references ENUMs not in this file.
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TYPE appointment_status_enum AS ENUM (
      'draft','scheduled','confirmed','arrived','checked_in','waiting',
      'with_doctor','completed','cancelled','rescheduled','no_show',
      'emergency','blocked','doctor_unavailable'
    );
    CREATE TYPE visit_type_enum AS ENUM (
      'new','follow_up','antenatal','postnatal','emergency'
    );
    CREATE TYPE pregnancy_status_enum AS ENUM (
      'active','delivered','miscarriage','terminated'
    );
    CREATE TYPE consultation_status_enum AS ENUM (
      'in_progress','completed'
    );
    CREATE TYPE consultation_outcome_enum AS ENUM (
      'routine_anc','high_risk_referral','delivery_admission',
      'emergency_referral','discharge','postnatal_follow_up','other'
    );
    CREATE TYPE prescription_status_enum AS ENUM (
      'draft','issued','void'
    );
    CREATE TYPE invoice_status_enum AS ENUM (
      'draft','pending','paid','partially_paid','refunded','void'
    );
    CREATE TYPE payment_mode_enum AS ENUM (
      'cash','card','upi','insurance','online'
    );
    CREATE TYPE whatsapp_status_enum AS ENUM (
      'pending','sent','delivered','read','failed'
    );
    CREATE TYPE notification_status_enum AS ENUM (
      'pending','sent','failed','suppressed'
    );
    CREATE TYPE doc_review_status_enum AS ENUM (
      'pending_review','reviewed','no_review_required'
    );
    CREATE TYPE document_type_enum AS ENUM (
      'lab_report','ultrasound','prescription_pdf','invoice_pdf',
      'scan','consent_form','identity_document','other'
    );
    CREATE TYPE test_order_status_enum AS ENUM (
      'ordered','pending','result_uploaded','reviewed','overdue','skipped'
    );
    CREATE TYPE test_category_enum AS ENUM (
      'blood','urine','ultrasound','genetic','culture','hormonal','other'
    );
    CREATE TYPE result_flag_enum AS ENUM (
      'normal','low','high','critical','manual'
    );
    CREATE TYPE reference_applicable_enum AS ENUM (
      'all','pregnant_only','trimester_1','trimester_2','trimester_3'
    );
    CREATE TYPE leave_type_enum AS ENUM (
      'full_day','partial','emergency_reserve'
    );
    CREATE TYPE block_type_enum AS ENUM (
      'lunch','break','reserved','clinic_delay','clinic_paused'
    );
    CREATE TYPE waitlist_status_enum AS ENUM (
      'waiting','offered','accepted','expired','bypassed','removed'
    );
    CREATE TYPE resource_type_enum AS ENUM (
      'room','machine','bed','other'
    );
    CREATE TYPE resource_booking_status_enum AS ENUM (
      'reserved','released','cancelled'
    );
    CREATE TYPE consent_type_enum AS ENUM (
      'data_processing','whatsapp_communication','family_notification',
      'document_sharing','research_data'
    );
    CREATE TYPE consent_status_enum AS ENUM (
      'given','withdrawn'
    );
    CREATE TYPE delivery_type_enum AS ENUM (
      'normal_vaginal','instrumental','elective_cs','emergency_cs','water_birth'
    );
    CREATE TYPE labour_onset_enum AS ENUM (
      'spontaneous','induced','pre_labour_cs'
    );
    CREATE TYPE anaesthesia_type_enum AS ENUM (
      'none','local','spinal','epidural','general'
    );
    CREATE TYPE birth_outcome_enum AS ENUM (
      'live_birth','stillbirth','neonatal_death'
    );
    CREATE TYPE neonate_sex_enum AS ENUM (
      'male','female','ambiguous'
    );
    CREATE TYPE postpartum_visit_enum AS ENUM (
      'day7','week6','week12','as_needed'
    );
    CREATE TYPE followup_status_enum AS ENUM (
      'scheduled','completed','cancelled','missed'
    );
    CREATE TYPE service_category_enum AS ENUM (
      'consultation','test','procedure','package','other'
    );
    CREATE TYPE protocol_type_enum AS ENUM (
      'antenatal','postnatal','gynaecology','custom'
    );
    CREATE TYPE protocol_trigger_enum AS ENUM (
      'trimester','milestone_week','high_risk','custom'
    );
  `);
};

exports.down = async function (knex) {
  const types = [
    'appointment_status_enum','visit_type_enum','pregnancy_status_enum',
    'consultation_status_enum','consultation_outcome_enum','prescription_status_enum',
    'invoice_status_enum','payment_mode_enum','whatsapp_status_enum',
    'notification_status_enum','doc_review_status_enum','document_type_enum',
    'test_order_status_enum','test_category_enum','result_flag_enum',
    'reference_applicable_enum','leave_type_enum','block_type_enum',
    'waitlist_status_enum','resource_type_enum','resource_booking_status_enum',
    'consent_type_enum','consent_status_enum','delivery_type_enum',
    'labour_onset_enum','anaesthesia_type_enum','birth_outcome_enum',
    'neonate_sex_enum','postpartum_visit_enum','followup_status_enum',
    'service_category_enum','protocol_type_enum','protocol_trigger_enum',
  ];
  for (const t of types) {
    await knex.raw(`DROP TYPE IF EXISTS ${t} CASCADE`);
  }
};
