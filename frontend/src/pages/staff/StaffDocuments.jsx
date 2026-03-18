import { PageShell } from '../_PageShell';
export default function StaffDocuments() {
  return <PageShell title="Documents" roleLabel="Staff" path="/staff/documents"
    description="Upload patient lab reports and scans to S3. Tag document type, link to patient record, and confirm upload completion." />;
}
