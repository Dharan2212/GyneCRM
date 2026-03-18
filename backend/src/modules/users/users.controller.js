'use strict';

const usersService = require('./users.service');
const { sendSuccess } = require('../../utils/response-helper');
const { createError } = require('../../utils/errors');
const {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
} = require('./users.validator');

/**
 * USERS CONTROLLER
 * Thin handlers — validate input, call service, return response.
 * All routes are Admin-only (enforced in routes layer).
 */

const listUsers = async (req, res, next) => {
  try {
    const { error, value } = listUsersSchema.validate(req.query, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid query parameters.', error.details.map((d) => d.message));
    }

    const result = await usersService.listUsers({
      hospitalId: req.user.hospitalId,
      ...value,
    });

    return sendSuccess(res, 200, 'Users retrieved.', result);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { error, value } = createUserSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid user payload.', error.details.map((d) => d.message));
    }

    const user = await usersService.createUser(
      req.user.hospitalId,
      value,
      req.user.userId
    );

    return sendSuccess(res, 201, 'User created successfully.', { user });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.user.hospitalId, req.params.id);
    return sendSuccess(res, 200, 'User retrieved.', { user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid update payload.', error.details.map((d) => d.message));
    }

    const user = await usersService.updateUser(
      req.user.hospitalId,
      req.params.id,
      value,
      req.user.userId
    );

    return sendSuccess(res, 200, 'User updated successfully.', { user });
  } catch (err) {
    next(err);
  }
};

const activateUser = async (req, res, next) => {
  try {
    const user = await usersService.activateUser(
      req.user.hospitalId,
      req.params.id,
      req.user.userId
    );
    return sendSuccess(res, 200, 'User activated.', { user });
  } catch (err) {
    next(err);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const user = await usersService.deactivateUser(
      req.user.hospitalId,
      req.params.id,
      req.user.userId
    );
    return sendSuccess(res, 200, 'User deactivated.', { user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
};
