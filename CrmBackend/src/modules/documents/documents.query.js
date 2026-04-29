const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { isValidObjectId } = require('../../utils/object-id');

function resolveHospitalId(inputHospitalId, currentUser = {}) {
  const hospitalId = inputHospitalId || currentUser.hospital_id || currentUser.raw?.hospital_id;

  if (!hospitalId || !isValidObjectId(hospitalId)) {
    throw new AppError('Valid hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  return hospitalId;
}

function buildDocumentResponse(document) {
  if (!document) {
    return null;
  }

  const patientSummary = document.patient_id && typeof document.patient_id === 'object'
    ? {
        _id: document.patient_id._id,
        full_name: document.patient_id.full_name,
        patient_code: document.patient_id.patient_code,
        category: document.patient_id.category,
      }
    : null;

  const doctorSummary = document.doctor_id && typeof document.doctor_id === 'object'
    ? {
        _id: document.doctor_id._id,
        full_name: document.doctor_id.full_name,
        speciality: document.doctor_id.speciality,
      }
    : null;

  const consultationSummary = document.consultation_id && typeof document.consultation_id === 'object'
    ? {
        _id: document.consultation_id._id,
        status: document.consultation_id.status,
        chief_complaint: document.consultation_id.chief_complaint,
      }
    : null;

  const testOrderSummary = document.test_order_id && typeof document.test_order_id === 'object'
    ? {
        _id: document.test_order_id._id,
        status: document.test_order_id.status,
        priority: document.test_order_id.priority,
        abnormal_flag: document.test_order_id.abnormal_flag,
      }
    : null;

  return {
    ...document,
    patient_summary: patientSummary,
    doctor_summary: doctorSummary,
    consultation_summary: consultationSummary,
    test_order_summary: testOrderSummary,
  };
}

module.exports = {
  resolveHospitalId,
  buildDocumentResponse,
};
