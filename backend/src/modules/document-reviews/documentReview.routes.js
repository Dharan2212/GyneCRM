'use strict';

const express = require('express');
const router = express.Router();
const documentReviewController = require('./documentReview.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

// /review-inbox MUST be before /:id to prevent 'review-inbox' matching as UUID param
router.get('/review-inbox', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), documentReviewController.getReviewInbox);
router.get('/:id', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin', 'receptionist', 'staff']), documentReviewController.getDocument);
router.post('/:id/review', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), documentReviewController.reviewDocument);
router.post('/:id/flag', authenticate, enforceHospitalScope, roleCheck(['doctor', 'admin']), documentReviewController.flagDocument);
router.delete('/:id', authenticate, enforceHospitalScope, roleCheck(['admin']), documentReviewController.softDeleteDocument);

module.exports = router;
