const { sendSuccess } = require('../../utils/api-response');
const service = require('./doctor.dashboard.service');

async function getDoctorDashboard(req, res, next) {
  try {
    const data = await service.getDoctorDashboard(req.query, req.user);
    return sendSuccess(res, {
      message: 'Doctor dashboard fetched successfully.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDoctorDashboard,
};
