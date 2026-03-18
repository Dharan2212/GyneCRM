import { PageShell } from '../_PageShell';
export default function DoctorPatients() {
  return <PageShell title="Patients" roleLabel="Doctor" path="/doctor/patients"
    description="Searchable patient list scoped to this doctor's appointments. Quick access to patient profiles and recent consultation history." />;
}
