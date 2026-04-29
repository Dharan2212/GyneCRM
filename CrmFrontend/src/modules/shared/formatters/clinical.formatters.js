import { formatDate } from './dateTime.js'

export function formatClinicalSummary(summary = {}) {
  const diagnosis = summary?.diagnosis_summary || summary?.diagnosis_notes || summary?.diagnosis || ''
  const advice = summary?.advice_notes || summary?.treatment_plan || summary?.notes || ''
  return [diagnosis, advice].filter(Boolean).join(' • ') || 'No summary available.'
}

export function formatMilestoneSummary(milestone = {}) {
  return {
    code: milestone.code || milestone.milestone_code || null,
    title: milestone.title || 'Untitled Milestone',
    dueDateLabel: formatDate(milestone.due_date),
    status: milestone.status || 'pending',
  }
}
