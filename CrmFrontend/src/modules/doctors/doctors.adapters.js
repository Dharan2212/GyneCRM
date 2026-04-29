function getInitials(name = '') {
  const normalized = String(name || '').trim()
  if (!normalized) return 'DR'
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function adaptDoctorLookupItem(doctor = {}) {
  return {
    id: doctor._id || doctor.id || null,
    fullName: doctor.full_name || doctor.user?.full_name || 'Doctor',
    speciality: doctor.speciality || '--',
    registrationNumber: doctor.registration_number || '--',
    isActive: doctor.user?.is_active ?? doctor.is_active ?? true,
    initials: getInitials(doctor.full_name || doctor.user?.full_name),
    raw: doctor,
  }
}
