import { PageShell } from '../_PageShell';
export default function AdminDashboard() {
  return <PageShell title="Dashboard" roleLabel="Administrator" path="/admin/dashboard"
    description="Hospital-wide KPIs: daily appointments, revenue, active pregnancies, today's schedule summary, and automation health status." />;
}
