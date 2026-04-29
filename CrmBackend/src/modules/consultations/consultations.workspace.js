function buildWorkspacePayload(consultation) {
  return {
    consultation: {
      _id: consultation._id,
      hospital_id: consultation.hospital_id,
      patient_id: consultation.patient_id?._id || consultation.patient_id || null,
      doctor_id: consultation.doctor_id?._id || consultation.doctor_id || null,
      appointment_id: consultation.appointment_id?._id || consultation.appointment_id || null,
      started_at: consultation.started_at,
      ended_at: consultation.ended_at,
      status: consultation.status,
      created_at: consultation.createdAt,
      updated_at: consultation.updatedAt,
      finalised_at: consultation.finalised_at,
      finalised_by: consultation.finalised_by?._id || consultation.finalised_by || null,
      is_active: consultation.is_active,
    },
    patient_summary: consultation.patient_id
      ? {
          _id: consultation.patient_id._id,
          patient_code: consultation.patient_id.patient_code,
          full_name: consultation.patient_id.full_name,
          phone: consultation.patient_id.phone,
          category: consultation.patient_id.category,
          is_active: consultation.patient_id.is_active,
        }
      : null,
    doctor_summary: consultation.doctor_id
      ? {
          _id: consultation.doctor_id._id,
          full_name: consultation.doctor_id.full_name,
          speciality: consultation.doctor_id.speciality,
          registration_number: consultation.doctor_id.registration_number,
        }
      : null,
    appointment_summary: consultation.appointment_id
      ? {
          _id: consultation.appointment_id._id,
          scheduled_at: consultation.appointment_id.scheduled_at,
          status: consultation.appointment_id.status,
          visit_type: consultation.appointment_id.visit_type,
          appointment_type_id:
            consultation.appointment_id.appointment_type_id?._id || consultation.appointment_id.appointment_type_id || null,
          is_active: consultation.appointment_id.is_active,
        }
      : null,
    editable_sections: {
      chief_complaint: consultation.chief_complaint,
      history_of_present_illness: consultation.history_of_present_illness,
      vitals: consultation.vitals,
      examination: consultation.examination,
      diagnosis: consultation.diagnosis,
      provisional_diagnosis: consultation.provisional_diagnosis,
      advice: consultation.advice,
      notes: consultation.notes,
      follow_up_required: consultation.follow_up_required,
      follow_up_date: consultation.follow_up_date,
    },
    current_status: consultation.status,
  };
}

module.exports = {
  buildWorkspacePayload,
};
