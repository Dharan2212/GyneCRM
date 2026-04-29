function resolveDashboardDate(query = {}) {
  const base = query.date ? new Date(query.date) : new Date();
  const start = new Date(base);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    requested_date: base.toISOString(),
    day_start: start,
    day_end: end,
  };
}

module.exports = {
  resolveDashboardDate,
};
