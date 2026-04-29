const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/require-role');
const validateRequest = require('../../middleware/validate-request');
const ROLES = require('../../constants/roles');
const controller = require('./jobs.controller');
const {
  dispatchJobSchema,
  runJobSchema,
  runJobParamSchema,
  listJobsSchema,
  jobDetailParamSchema,
  cancelJobSchema,
} = require('./jobs.validator');

const router = express.Router();

router.use(auth);
router.use(requireRole(ROLES.ADMIN));

router.post('/dispatch', validateRequest(dispatchJobSchema), controller.dispatchJob);
router.post('/run/:jobType', validateRequest(runJobParamSchema, { source: 'params' }), validateRequest(runJobSchema), controller.runJob);
router.get('/types', controller.listJobTypes);
router.get('/', validateRequest(listJobsSchema, { source: 'query' }), controller.listJobs);
router.get('/:id', validateRequest(jobDetailParamSchema, { source: 'params' }), controller.getJobDetail);
router.patch('/:id/cancel', validateRequest(jobDetailParamSchema, { source: 'params' }), validateRequest(cancelJobSchema), controller.cancelJob);

module.exports = router;
