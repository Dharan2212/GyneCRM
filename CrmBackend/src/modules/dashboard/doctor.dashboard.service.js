const Appointment = require('../../models/Appointment');
const Consultation = require('../../models/Consultation');
const FollowUp = require('../../models/FollowUp');
const Pregnancy = require('../../models/Pregnancy');
const TestOrder = require('../../models/TestOrder');
const Prescription = require('../../models/Prescription');
const { resolveDashboardDate, resolveDoctorScope, maybeDoctorFilter } = require('./doctor.dashboard.query');

function buildPatientSummary(patient) {
  if (!patient) {
    return {
      patient_id: null,
      patient_name: null,
      patient_code: null,
    };
  }

  return {
    patient_id: patient._id || null,
    patient_name: patient.full_name || null,
    patient_code: patient.patient_code || null,
  };
}

async function getDoctorDashboard(query = {}, currentUser = {}) {
  const scope = await resolveDoctorScope(query, currentUser);
  const { requested_date, day_start, day_end } = resolveDashboardDate(query);
  const doctorFilter = maybeDoctorFilter(scope);
  const todayAppointmentMatch = {
    hospital_id: scope.hospital_id,
    scheduled_at: { $gte: day_start, $lt: day_end },
    ...doctorFilter,
  };

  const [
    appointments_today_total,
    appointments_checked_in,
    appointments_pending,
    consultations_in_progress,
    consultations_finalised_today,
    followups_due_today,
    pending_test_reviews,
    active_high_risk_pregnancies,
    prescriptions_issued_today,
    todayAppointments,
    consultationsNeedingAttention,
    followupsDue,
    testResultsPendingReview,
    highRiskPregnanciesNeedingAttention,
    nextUpcomingAppointments,
    recentlyFinalisedConsultations,
    urgentFollowupsCount,
    urgentPendingTestsCount,
  ] = await Promise.all([
    Appointment.countDocuments(todayAppointmentMatch),
    Appointment.countDocuments({ ...todayAppointmentMatch, status: 'checked_in' }),
    Appointment.countDocuments({ ...todayAppointmentMatch, status: 'scheduled' }),
    Consultation.countDocuments({
      hospital_id: scope.hospital_id,
      status: 'in_progress',
      ...doctorFilter,
    }),
    Consultation.countDocuments({
      hospital_id: scope.hospital_id,
      status: 'finalised',
      finalised_at: { $gte: day_start, $lt: day_end },
      ...doctorFilter,
    }),
    FollowUp.countDocuments({
      hospital_id: scope.hospital_id,
      status: 'pending',
      due_date: { $gte: day_start, $lt: day_end },
      ...doctorFilter,
    }),
    TestOrder.countDocuments({
      hospital_id: scope.hospital_id,
      status: { $in: ['uploaded', 'pending_review'] },
      ...doctorFilter,
    }),
    Pregnancy.countDocuments({
      hospital_id: scope.hospital_id,
      status: 'active',
      high_risk: true,
      ...doctorFilter,
    }),
    Prescription.countDocuments({
      hospital_id: scope.hospital_id,
      issue_status: 'issued',
      issued_at: { $gte: day_start, $lt: day_end },
      ...doctorFilter,
    }),
    Appointment.find(todayAppointmentMatch)
      .populate([
        { path: 'patient_id', select: 'patient_code full_name phone' },
        { path: 'appointment_type_id', select: 'name code' },
      ])
      .sort({ scheduled_at: 1, _id: 1 })
      .limit(15)
      .lean(),
    Consultation.find({
      hospital_id: scope.hospital_id,
      status: { $in: ['draft', 'in_progress'] },
      ...doctorFilter,
    })
      .populate([{ path: 'patient_id', select: 'patient_code full_name' }])
      .sort({ updatedAt: -1, _id: -1 })
      .limit(10)
      .lean(),
    FollowUp.find({
      hospital_id: scope.hospital_id,
      status: 'pending',
      due_date: { $lte: day_end },
      ...doctorFilter,
    })
      .populate([{ path: 'patient_id', select: 'patient_code full_name' }])
      .sort({ due_date: 1, priority: -1, _id: 1 })
      .limit(10)
      .lean(),
    TestOrder.find({
      hospital_id: scope.hospital_id,
      status: { $in: ['uploaded', 'pending_review'] },
      ...doctorFilter,
    })
      .populate([{ path: 'patient_id', select: 'patient_code full_name' }])
      .sort({ updatedAt: -1, _id: -1 })
      .limit(10)
      .lean(),
    Pregnancy.find({
      hospital_id: scope.hospital_id,
      status: 'active',
      high_risk: true,
      ...doctorFilter,
    })
      .populate([{ path: 'patient_id', select: 'patient_code full_name' }])
      .sort({ updatedAt: -1, _id: -1 })
      .limit(10)
      .lean(),
    Appointment.find({
      hospital_id: scope.hospital_id,
      scheduled_at: { $gte: new Date(), $lt: day_end },
      status: 'scheduled',
      ...doctorFilter,
    })
      .populate([{ path: 'patient_id', select: 'patient_code full_name phone' }])
      .sort({ scheduled_at: 1, _id: 1 })
      .limit(5)
      .lean(),
    Consultation.find({
      hospital_id: scope.hospital_id,
      status: 'finalised',
      finalised_at: { $gte: day_start, $lt: day_end },
      ...doctorFilter,
    })
      .populate([{ path: 'patient_id', select: 'patient_code full_name' }])
      .sort({ finalised_at: -1, _id: -1 })
      .limit(5)
      .lean(),
    FollowUp.countDocuments({
      hospital_id: scope.hospital_id,
      status: 'pending',
      priority: { $in: ['high', 'urgent'] },
      due_date: { $lte: day_end },
      ...doctorFilter,
    }),
    TestOrder.countDocuments({
      hospital_id: scope.hospital_id,
      status: { $in: ['uploaded', 'pending_review'] },
      priority: { $in: ['urgent', 'stat'] },
      ...doctorFilter,
    }),
  ]);

  return {
    context: {
      selected_date: requested_date,
      doctor_id: scope.doctor_id,
      hospital_id: scope.hospital_id,
      generated_at: new Date().toISOString(),
      scope_mode: scope.scope_mode,
      doctor: scope.doctor_summary
        ? {
            id: scope.doctor_summary._id,
            full_name: scope.doctor_summary.full_name || null,
            speciality: scope.doctor_summary.speciality || null,
          }
        : null,
    },
    kpis: {
      appointments_today_total,
      appointments_checked_in,
      appointments_pending,
      consultations_in_progress,
      consultations_finalised_today,
      followups_due_today,
      pending_test_reviews,
      active_high_risk_pregnancies,
      prescriptions_issued_today,
    },
    pending_work: {
      today_appointments: todayAppointments.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        scheduled_at: item.scheduled_at,
        status: item.status,
        appointment_type: item.appointment_type_id?.name || null,
        label: item.reason_for_visit || null,
      })),
      consultations_needing_attention: consultationsNeedingAttention.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        status: item.status,
        updated_at: item.updatedAt,
        label: item.chief_complaint || null,
      })),
      followups_due: followupsDue.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        due_date: item.due_date,
        status: item.status,
        priority: item.priority,
        label: item.reason || null,
      })),
      test_results_pending_review: testResultsPendingReview.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        test_order_id: item._id,
        ordered_at: item.ordered_at,
        status: item.status,
        priority: item.priority,
        label: item.indication || item.result_summary || null,
      })),
      high_risk_pregnancies_needing_attention: highRiskPregnanciesNeedingAttention.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        edd: item.edd,
        status: item.status,
        gestational_age_weeks: item.gestational_age_weeks,
        trimester: item.trimester,
        label: item.high_risk_notes || null,
      })),
    },
    summaries: {
      next_upcoming_appointments: nextUpcomingAppointments.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        scheduled_at: item.scheduled_at,
        status: item.status,
        label: item.reason_for_visit || null,
      })),
      recently_finalised_consultations: recentlyFinalisedConsultations.map((item) => ({
        id: item._id,
        patient_id: item.patient_id?._id || item.patient_id || null,
        patient_name: item.patient_id?.full_name || null,
        patient_code: item.patient_id?.patient_code || null,
        finalised_at: item.finalised_at,
        status: item.status,
        label: item.chief_complaint || null,
      })),
      urgent_items_count: urgentFollowupsCount + urgentPendingTestsCount,
    },
    warnings_or_notes: [
      'Notification queue and send history are not included in KPI blocks in this batch to keep the dashboard focused on actionable clinical work.',
    ],
  };
}

module.exports = {
  getDoctorDashboard,
};
