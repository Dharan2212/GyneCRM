const HTTP_STATUS = require('../../constants/http-status');
const { sendSuccess } = require('../../utils/api-response');
const asyncHandler = require('../../utils/async-handler');
const dashboardService = require('./reception.dashboard.service');

const getReceptionDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getReceptionDashboard(req.query, req.user || {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Receptionist dashboard fetched successfully.',
    data,
  });
});

module.exports = {
  getReceptionDashboard,
};
