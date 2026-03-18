'use strict';

const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { enforceHospitalScope } = require('../../middleware/hospital-scope.middleware');
const { roleCheck } = require('../../middleware/role-check.middleware');

// POST /upload-url MUST be before /:id routes
router.post('/upload-url', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist', 'staff']), documentController.getUploadUrl);
router.post('/', authenticate, enforceHospitalScope, roleCheck(['admin', 'receptionist', 'staff']), documentController.createDocument);
router.get('/:id/url', authenticate, enforceHospitalScope, roleCheck(['admin', 'doctor', 'receptionist']), documentController.getDocumentUrl);

module.exports = router;
