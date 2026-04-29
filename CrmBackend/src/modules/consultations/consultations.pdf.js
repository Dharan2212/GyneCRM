function buildConsultationPdfPayload(consultation) {
  const patient = consultation.patient_id || null;
  const doctor = consultation.doctor_id || null;
  const appointment = consultation.appointment_id || null;

  return {
    foundation_type: 'pdf_ready_payload',
    filename: `consultation-${consultation._id}.pdf`,
    content_type: 'application/json',
    finalised_only_rule: false,
    document: {
      title: 'Consultation Summary',
      consultation_id: consultation._id,
      status: consultation.status || null,
      chief_complaint: consultation.chief_complaint || null,
      history_of_present_illness: consultation.history_of_present_illness || null,
      vitals: consultation.vitals || {},
      examination: consultation.examination || {},
      diagnosis: consultation.diagnosis || {},
      provisional_diagnosis: consultation.provisional_diagnosis || null,
      advice: consultation.advice || null,
      notes: consultation.notes || null,
      follow_up_required: consultation.follow_up_required || false,
      follow_up_date: consultation.follow_up_date || null,
      patient_summary: patient ? {
        _id: patient._id,
        patient_code: patient.patient_code || null,
        full_name: patient.full_name || null,
        phone: patient.phone || null,
        category: patient.category || null,
      } : null,
      doctor_summary: doctor ? {
        _id: doctor._id,
        full_name: doctor.full_name || null,
        speciality: doctor.speciality || null,
        registration_number: doctor.registration_number || null,
      } : null,
      appointment_summary: appointment ? {
        _id: appointment._id,
        scheduled_at: appointment.scheduled_at || null,
        status: appointment.status || null,
        visit_type: appointment.visit_type || null,
      } : null,
      follow_up_summary: consultation.follow_up_summary || null,
    },
  };
}

module.exports = {
  buildConsultationPdfPayload,
};
