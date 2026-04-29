const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeExistingMilestone(item = {}) {
  if (typeof item?.toObject === 'function') {
    item = item.toObject();
  }

  return {
    code: normalizeNullableString(item.code),
    title: normalizeNullableString(item.title),
    target_week: item.target_week ?? null,
    actual_date: item.actual_date ?? null,
    status: item.status || 'pending',
    notes: normalizeNullableString(item.notes),
  };
}

function normalizeMilestonePayload(item = {}) {
  return normalizeExistingMilestone(item);
}

function mergeMilestones(existingMilestones = [], incomingMilestones = []) {
  const merged = existingMilestones.map((item) => normalizeExistingMilestone(item));

  incomingMilestones.forEach((incoming) => {
    const normalizedIncoming = normalizeMilestonePayload(incoming);

    if (!normalizedIncoming.code) {
      throw new AppError('Milestone code is required.', HTTP_STATUS.BAD_REQUEST);
    }

    const index = merged.findIndex((item) => item.code === normalizedIncoming.code);

    if (index === -1) {
      merged.push(normalizedIncoming);
      return;
    }

    const current = merged[index];
    merged[index] = {
      ...current,
      code: current.code,
      title:
        normalizedIncoming.title !== null && normalizedIncoming.title !== undefined
          ? normalizedIncoming.title
          : current.title,
      target_week:
        normalizedIncoming.target_week !== null && normalizedIncoming.target_week !== undefined
          ? normalizedIncoming.target_week
          : current.target_week,
      actual_date:
        normalizedIncoming.actual_date !== undefined ? normalizedIncoming.actual_date : current.actual_date,
      status: normalizedIncoming.status || current.status,
      notes:
        normalizedIncoming.notes !== undefined ? normalizedIncoming.notes : current.notes,
    };
  });

  return merged;
}

function updateMilestoneStatus(existingMilestones = [], milestoneCode, payload = {}) {
  const normalizedCode = normalizeNullableString(milestoneCode);
  const milestones = existingMilestones.map((item) => normalizeExistingMilestone(item));
  const index = milestones.findIndex((item) => item.code === normalizedCode);

  if (index === -1) {
    throw new AppError('Milestone not found.', HTTP_STATUS.NOT_FOUND);
  }

  const updated = {
    ...milestones[index],
    status: payload.status,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'actual_date')) {
    updated.actual_date = payload.actual_date;
  } else if (payload.status === 'completed' && !updated.actual_date) {
    updated.actual_date = new Date();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    updated.notes = normalizeNullableString(payload.notes);
  }

  milestones[index] = updated;
  return milestones;
}

module.exports = {
  mergeMilestones,
  updateMilestoneStatus,
};
