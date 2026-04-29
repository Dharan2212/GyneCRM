function pickCategoryHistorySummary(history = []) {
  const latest = Array.isArray(history) && history.length > 0 ? history[0] : null;

  return {
    total_changes: Array.isArray(history) ? history.length : 0,
    latest_change: latest
      ? {
          previous_category: latest.previous_category,
          new_category: latest.new_category,
          changed_by: latest.changed_by,
          reason: latest.reason || null,
          changed_at: latest.changed_at || latest.createdAt || null,
        }
      : null,
  };
}

function pickRecentAppointmentsSummary(appointments = []) {
  return {
    total_recent: Array.isArray(appointments) ? appointments.length : 0,
    items: (appointments || []).map((appointment) => ({
      _id: appointment._id,
      scheduled_at: appointment.scheduled_at,
      status: appointment.status,
      visit_type: appointment.visit_type,
      doctor_id: appointment.doctor_id,
      appointment_type_id: appointment.appointment_type_id,
      reason_for_visit: appointment.reason_for_visit || null,
    })),
  };
}

function buildPatientHub(patient, categoryHistory = [], recentAppointments = []) {
  return {
    patient,
    category: {
      current: patient.category || 'uncategorized',
      history_summary: pickCategoryHistorySummary(categoryHistory),
    },
    recent_appointments: pickRecentAppointmentsSummary(recentAppointments),
    summary: {
      patient_id: patient._id,
      patient_code: patient.patient_code,
      full_name: patient.full_name,
      current_category: patient.category || 'uncategorized',
      is_active: patient.is_active,
      registered_at: patient.createdAt || null,
      updated_at: patient.updatedAt || null,
    },
  };
}

module.exports = {
  buildPatientHub,
};
