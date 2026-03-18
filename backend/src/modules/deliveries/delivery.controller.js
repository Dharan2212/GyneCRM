'use strict';

const deliveryService = require('./delivery.service');
const {
  createDeliverySchema,
  updateDeliverySchema,
  getDeliveryParamsSchema,
  listPatientDeliveriesParamsSchema,
  listPatientPostpartumParamsSchema,
  listPostpartumQuerySchema,
  updatePostpartumFollowupSchema,
  postpartumFollowupParamsSchema,
} = require('../../validators/delivery.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

/**
 * Delivery Controller — thin handlers.
 * Uses req.user.userId / req.user.hospitalId (set by auth.middleware).
 * Uses req.hospitalId / req.userId (set by enforceHospitalScope).
 * Actor object pattern consistent with pregnancy/consultation controllers.
 */

function actorFromReq(req) {
  return {
    userId: req.user.userId,
    hospitalId: req.user.hospitalId,
    role: req.user.role,
  };
}

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    res.status(400).json(
      errorResponse('Validation failed.', error.details.map((d) => ({
        code: 'VALIDATION_ERROR',
        field: d.context?.label || d.path?.join('.'),
        detail: d.message,
      })))
    );
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

// ─── POST /api/v1/deliveries ───────────────────────────────────────────────────

async function createDelivery(req, res, next) {
  try {
    const { valid, value } = validate(createDeliverySchema, req.body, res);
    if (!valid) return;

    const result = await deliveryService.createDelivery(value, actorFromReq(req));

    return res.status(201).json(
      successResponse('Delivery record created successfully.', {
        delivery: result.delivery,
        neonates: result.neonates,
        postpartum_followups: result.followups,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/deliveries/:id ───────────────────────────────────────────────

async function getDelivery(req, res, next) {
  try {
    const { valid, value } = validate(getDeliveryParamsSchema, req.params, res);
    if (!valid) return;

    const result = await deliveryService.getDeliveryDetail(value.id, actorFromReq(req));

    return res.status(200).json(successResponse('Delivery detail retrieved.', result));
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/deliveries/:id ───────────────────────────────────────────────

async function updateDelivery(req, res, next) {
  try {
    const params = validate(getDeliveryParamsSchema, req.params, res);
    if (!params.valid) return;

    const body = validate(updateDeliverySchema, req.body, res);
    if (!body.valid) return;

    const updated = await deliveryService.updateDelivery(params.value.id, body.value, actorFromReq(req));

    return res.status(200).json(successResponse('Delivery updated successfully.', { delivery: updated }));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/patients/:patientId/deliveries ───────────────────────────────

async function listPatientDeliveries(req, res, next) {
  try {
    const { valid, value } = validate(listPatientDeliveriesParamsSchema, req.params, res);
    if (!valid) return;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { rows, total } = await deliveryService.listPatientDeliveries(
      value.patientId, { page, limit }, actorFromReq(req)
    );

    return res.status(200).json(
      successResponse('Patient deliveries retrieved.', rows, {
        total, page, limit,
        total_pages: Math.ceil(total / limit),
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/patients/:patientId/postpartum-followups ─────────────────────

async function listPatientPostpartumFollowups(req, res, next) {
  try {
    const params = validate(listPatientPostpartumParamsSchema, req.params, res);
    if (!params.valid) return;

    const query = validate(listPostpartumQuerySchema, req.query, res);
    if (!query.valid) return;

    const { rows, total } = await deliveryService.listPatientPostpartumFollowups(
      params.value.patientId,
      { deliveryId: query.value.delivery_id, status: query.value.status, page: query.value.page, limit: query.value.limit },
      actorFromReq(req)
    );

    return res.status(200).json(
      successResponse('Postpartum follow-ups retrieved.', rows, {
        total, page: query.value.page, limit: query.value.limit,
        total_pages: Math.ceil(total / query.value.limit),
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/postpartum-followups/:id ─────────────────────────────────────

async function updatePostpartumFollowup(req, res, next) {
  try {
    const params = validate(postpartumFollowupParamsSchema, req.params, res);
    if (!params.valid) return;

    const body = validate(updatePostpartumFollowupSchema, req.body, res);
    if (!body.valid) return;

    const updated = await deliveryService.updatePostpartumFollowup(
      params.value.id, body.value, actorFromReq(req)
    );

    return res.status(200).json(successResponse('Postpartum follow-up updated.', { followup: updated }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDelivery,
  getDelivery,
  updateDelivery,
  listPatientDeliveries,
  listPatientPostpartumFollowups,
  updatePostpartumFollowup,
};