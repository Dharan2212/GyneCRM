import { PageShell } from '../_PageShell';
export default function AdminUsers() {
  return <PageShell title="Users" roleLabel="Administrator" path="/admin/users"
    description="Create, edit, activate and deactivate staff accounts. Assign roles: Doctor, Receptionist, Staff. Manage branch assignments." />;
}
