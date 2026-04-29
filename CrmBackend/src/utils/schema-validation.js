function normalizeTrimmedStringArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  const items = Array.isArray(value) ? value : [value];

  return items
    .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
    .filter(Boolean);
}

module.exports = {
  normalizeTrimmedStringArray,
};
