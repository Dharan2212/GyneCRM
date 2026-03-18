import { PageShell } from '../_PageShell';
export default function ReceptionDocuments() {
  return <PageShell title="Documents" roleLabel="Receptionist" path="/reception/documents"
    description="Upload patient documents to S3: lab reports, identity documents, consent forms. View and share pre-signed download URLs." />;
}
