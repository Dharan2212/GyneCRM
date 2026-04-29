const mongoose = require('mongoose');
const Appointment = require('../../models/Appointment');
const Waitlist = require('../../models/Waitlist');
const Doctor = require('../../models/Doctor');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId } = require('../../utils/object-id');
const { resolveHospitalId } = require('../appointments/appointments.query');
const { resolveDashboardDate } = require('./reception.dashboard.query');

const APPOINTMENT_STATUSES = ['scheduled', 'checked_in', 'cancelled', 'no_show', 'completed'];
const WAITLIST_STATUSES = ['waiting', 'contacted', 'converted'];

async function getReceptionDashboard(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(query.hospital_id, currentUser);
  assertObjectId(hospitalId, 'hospital_id');
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);
  const { requested_date, day_start, day_end } = resolveDashboardDate(query);

  const appointmentRows = await Appointment.aggregate([
    {
      $match: {
        hospital_id: hospitalObjectId,
        scheduled_at: { $gte: day_start, $lt: day_end },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const appointment_summary = APPOINTMENT_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  appointmentRows.forEach((row) => {
    if (appointment_summary[row._id] !== undefined) {
      appointment_summary[row._id] = row.count;
    }
  });

  const today_appointments = await Appointment.find({
    hospital_id: hospitalId,
    scheduled_at: { $gte: day_start, $lt: day_end },
  })
    .populate([
      { path: 'patient_id', select: 'patient_code full_name phone' },
      { path: 'doctor_id', select: 'full_name speciality' },
      { path: 'appointment_type_id', select: 'name code' },
    ])
    .sort({ scheduled_at: 1, _id: 1 })
    .limit(20)
    .lean();

  const waitlistRows = await Waitlist.aggregate([
    {
      $match: {
        hospital_id: hospitalObjectId,
        is_active: true,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const waitlist_summary = WAITLIST_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  waitlistRows.forEach((row) => {
    if (waitlist_summary[row._id] !== undefined) {
      waitlist_summary[row._id] = row.count;
    }
  });

  const doctorSummaryRows = await Appointment.aggregate([
    {
      $match: {
        hospital_id: hospitalObjectId,
        scheduled_at: { $gte: day_start, $lt: day_end },
      },
    },
    {
      $group: {
        _id: '$doctor_id',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, _id: 1 } },
  ]);

  const doctorIds = doctorSummaryRows.map((row) => row._id).filter(Boolean);
  const doctors = await Doctor.find({ _id: { $in: doctorIds } })
    .select('_id full_name speciality')
    .lean();
  const doctorMap = new Map(doctors.map((doctor) => [String(doctor._id), doctor]));

  const doctor_wise_summary = doctorSummaryRows.map((row) => {
    const doctor = doctorMap.get(String(row._id));
    return {
      doctor_id: row._id,
      full_name: doctor?.full_name || null,
      speciality: doctor?.speciality || null,
      count: row.count,
    };
  });

  return {
    date_context: {
      requested_date,
      day_start: day_start.toISOString(),
      day_end: day_end.toISOString(),
    },
    appointment_summary,
    today_appointments: {
      total: today_appointments.length,
      items: today_appointments,
    },
    waitlist_summary,
    doctor_wise_summary,
  };
}

module.exports = {
  getReceptionDashboard,
};
