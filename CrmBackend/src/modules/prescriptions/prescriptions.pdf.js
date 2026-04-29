function buildPrescriptionPdfPayload(prescription) {
  const patient = prescription.patient_id || null;
  const doctor = prescription.doctor_id || null;
  const consultation = prescription.consultation_id || null;
  const appointment = prescription.appointment_id || null;

  const printableItems = Array.isArray(prescription.items)
    ? prescription.items.map((item) => ({
        item_no: item.item_no,
        medicine_name: item.medicine_name,
        generic_name: item.generic_name,
        formulation: item.formulation,
        strength: item.strength,
        dose: item.dose,
        route: item.route,
        frequency: item.frequency,
        duration_value: item.duration_value,
        duration_unit: item.duration_unit,
        quantity: item.quantity,
        instructions: item.instructions,
        before_food: item.before_food,
        after_food: item.after_food,
        morning: item.morning,
        afternoon: item.afternoon,
        evening: item.evening,
        night: item.night,
        is_prn: item.is_prn,
        prn_reason: item.prn_reason,
        notes: item.notes,
        status: item.status,
      }))
    : [];

  return {
    foundation_type: 'pdf_ready_payload',
    filename: `prescription-${prescription._id}.pdf`,
    content_type: 'application/json',
    issued_only_rule: true,
    document: {
      title: 'Prescription',
      prescription_id: prescription._id,
      prescription_date: prescription.prescription_date,
      diagnosis_summary: prescription.diagnosis_summary || null,
      advice_notes: prescription.advice_notes || null,
      general_instructions: prescription.general_instructions || null,
      patient_summary: patient
        ? {
            _id: patient._id,
            patient_code: patient.patient_code || null,
            full_name: patient.full_name || null,
            phone: patient.phone || null,
          }
        : null,
      doctor_summary: doctor
        ? {
            _id: doctor._id,
            full_name: doctor.full_name || null,
            speciality: doctor.speciality || null,
            registration_number: doctor.registration_number || null,
          }
        : null,
      consultation_summary: consultation
        ? {
            _id: consultation._id,
            status: consultation.status || null,
            chief_complaint: consultation.chief_complaint || null,
          }
        : null,
      appointment_summary: appointment
        ? {
            _id: appointment._id,
            scheduled_at: appointment.scheduled_at || null,
            status: appointment.status || null,
            visit_type: appointment.visit_type || null,
          }
        : null,
      items: printableItems,
      total_items: printableItems.length,
    },
  };
}

module.exports = {
  buildPrescriptionPdfPayload,
};
