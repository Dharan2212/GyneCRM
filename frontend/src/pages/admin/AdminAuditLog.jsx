import { PageShell } from '../_PageShell';
export default function AdminAuditLog() {
  return <PageShell title="Audit Log" roleLabel="Administrator" path="/admin/audit-log"
    description="Immutable activity log: all overrides, status changes, data edits, logins, and file access events across the hospital." />;
}
