import { C } from '../data.js'
import { S } from '../styles.js'
import { SC, PH, Bdg, Av, CatBdg } from '../atoms.jsx'
import { AsyncContent, EmptyState } from '../../modules/shared/ui/state/index.js'
import { DataTable, TableActions, TableToolbar, TableActionButton, TableCell, TableRow, TableStack } from '../../modules/shared/ui/table/index.js'
import { PageToolbar, SectionCard } from '../../modules/shared/ui/layout/index.js'

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'uncategorized', label: 'Uncategorized' },
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'ivf', label: 'IVF' },
  { value: 'gynac', label: 'Gynac' },
]

export default function PatientHub({
  rows,
  listMeta,
  counts,
  selectedId,
  selectedPatient,
  selectedHub,
  categoryHistory,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onSelectPatient,
  onRetryList,
  onRetryCounts,
  onRetryDetail,
  onStartConsultation,
  onOpenFollowUpConsultation,
  onOpenPregnancyTracker,
  onOpenTestReports,
  isListLoading,
  listError,
  isCountsLoading,
  countsError,
  isDetailLoading,
  detailError,
  sendHistory,
  isSendHistoryLoading,
  sendHistoryError,
  onRetrySendHistory,
  goTo,
}) {
  const headers = [
    { key: 'mr', label: 'MR No.' },
    { key: 'patient', label: 'Patient' },
    { key: 'category', label: 'Category' },
    { key: 'age', label: 'Age' },
    { key: 'contact', label: 'Contact' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const totalRows = listMeta?.total || rows.length || 0

  return (
    <div>
      <PH
        title="Patient Hub"
        icon="patients"
        sub={`Search, filter, and review patient records • ${totalRows} patient${totalRows === 1 ? '' : 's'} found`}
        actions={(
          <>
            <button style={S.btn('ghost', true)} onClick={onRetryList}>Refresh</button>
            <button style={S.btn('outline', true)} onClick={() => selectedPatient?.summary?.id ? onOpenPregnancyTracker?.(selectedPatient.summary.id) : goTo('cat-tracker')}>Category Tracker</button>
          </>
        )}
      />

      <AsyncContent
        isLoading={isCountsLoading}
        error={countsError}
        isEmpty={false}
        onRetry={onRetryCounts}
        loadingTitle="Loading patient metrics"
        loadingMessage="Category counts are being prepared."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 11, marginBottom: 16 }}>
          <SC icon="All" num={counts?.total || 0} label="Total" ac="m" />
          <SC icon="New" num={counts?.uncategorized || 0} label="Uncategorized" ac="wn" />
          <SC icon="Preg" num={counts?.pregnancy || 0} label="Pregnancy" ac="t" />
          <SC icon="IVF" num={counts?.ivf || 0} label="IVF" ac="p" />
          <SC icon="Gyn" num={counts?.gynac || 0} label="Gynac" ac="m" />
        </div>
      </AsyncContent>

      <PageToolbar
        left={(
          <TableToolbar
            searchValue={search}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search by name, patient code, or phone"
            filters={CATEGORY_FILTERS.map((filterOption) => (
              <button
                key={filterOption.value}
                type="button"
                onClick={() => onCategoryChange(filterOption.value)}
                style={{
                  ...S.btn(category === filterOption.value ? 'primary' : 'ghost', true),
                  background: category === filterOption.value
                    ? filterOption.value === 'pregnancy'
                      ? C.t
                      : filterOption.value === 'ivf'
                        ? C.p
                        : filterOption.value === 'uncategorized'
                          ? C.wn
                          : C.m
                    : '#fff',
                  color: category === filterOption.value ? '#fff' : C.kB,
                }}
              >
                {filterOption.label}
              </button>
            ))}
            actions={rows.length > 0 ? <span style={{ fontSize: 12, color: C.kS }}>{rows.length} on this page</span> : null}
          />
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' }}>
        <DataTable
          headers={headers}
          isLoading={isListLoading}
          error={listError}
          onRetry={onRetryList}
          empty={rows.length === 0}
          emptyTitle={search ? 'No matching patients' : 'No patients available'}
          emptyMessage={search ? 'Try changing the search text or category filter.' : 'Patients will appear here once records are available.'}
          emptyActionLabel={search || category !== 'all' ? 'Clear filters' : undefined}
          onEmptyAction={search || category !== 'all' ? () => {
            onSearchChange('')
            onCategoryChange('all')
          } : undefined}
        >
          <tbody>
            {rows.map((patient) => (
              <TableRow key={patient.id} active={selectedId === patient.id}>
                <TableCell strong style={{ color: C.m }}>{patient.patientCode}</TableCell>
                <TableCell>
                  <button type="button" onClick={() => onSelectPatient(patient.id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Av i={patient.avatarInitials} idx={patient.avatarIndex} sz={24} />
                      <TableStack title={patient.name} subtitle={patient.detailsLabel} />
                    </div>
                  </button>
                </TableCell>
                <TableCell><CatBdg cat={patient.templateCategory} /></TableCell>
                <TableCell>{patient.ageLabel}</TableCell>
                <TableCell subtle>{patient.contactLabel}</TableCell>
                <TableCell><Bdg type={patient.activeBadgeType} sm>{patient.activeLabel}</Bdg></TableCell>
                <TableCell>
                  <TableActions>
                    <TableActionButton label="Open" variant="outline" onClick={() => onSelectPatient(patient.id)} />
                    <TableActionButton label="First Consult" variant="primary" onClick={() => onStartConsultation?.(patient.id)} />
                    {patient.category === 'pregnancy' ? (
                      <TableActionButton label="Pregnancy" variant="ghost" onClick={() => onOpenPregnancyTracker?.(patient.id)} />
                    ) : null}
                  </TableActions>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>

        <AsyncContent
          isLoading={isDetailLoading}
          error={detailError}
          isEmpty={!selectedPatient}
          emptyTitle="Select a patient"
          emptyMessage="Choose a patient row to review detail, category history, and recent appointments."
          onRetry={onRetryDetail}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard
              title="Patient Summary"
              subtitle="Live patient profile, category context, and recent linked activity"
              right={selectedPatient?.summary?.id ? (
                <TableActions>
                  <button type="button" style={{ ...S.btn('primary', true), padding: '4px 9px', fontSize: 11 }} onClick={() => onStartConsultation?.(selectedPatient.summary.id)}>First Consult</button>
                  <button type="button" style={{ ...S.btn('ghost', true), padding: '4px 9px', fontSize: 11 }} onClick={() => onOpenFollowUpConsultation?.(selectedPatient.summary.id)}>Follow-up</button>
                  <button type="button" style={{ ...S.btn('outline', true), padding: '4px 9px', fontSize: 11 }} onClick={() => onOpenTestReports?.(selectedPatient.summary.id)}>Test Review</button>
                  {selectedHub?.currentCategory === 'pregnancy' ? (
                    <button type="button" style={{ ...S.btn('outline', true), padding: '4px 9px', fontSize: 11 }} onClick={() => onOpenPregnancyTracker?.(selectedPatient.summary.id)}>Pregnancy Tracker</button>
                  ) : null}
                </TableActions>
              ) : null}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <Av i={selectedPatient?.summary?.avatarInitials} idx={selectedPatient?.summary?.avatarIndex || 0} sz={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedPatient?.summary?.name}</div>
                  <div style={{ fontSize: 12, color: C.kS }}>{selectedPatient?.summary?.patientCode} • {selectedPatient?.summary?.ageLabel}</div>
                </div>
                <Bdg type={selectedPatient?.summary?.activeBadgeType}>{selectedPatient?.summary?.activeLabel}</Bdg>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div><strong>Phone:</strong> {selectedPatient?.summary?.phone}</div>
                <div><strong>Blood Group:</strong> {selectedPatient?.summary?.bloodGroup}</div>
                <div><strong>Family WhatsApp:</strong> {selectedPatient?.familyWhatsapp}</div>
                <div><strong>Category:</strong> {selectedHub?.currentCategoryLabel}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selectedPatient?.addressLabel || '--'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Emergency:</strong> {selectedPatient?.emergencyContactLabel}</div>
              </div>
            </SectionCard>

            <SectionCard title="Category & History" right={selectedHub?.categoryHistorySummary?.totalChanges ? <Bdg type="wait" sm>{selectedHub.categoryHistorySummary.totalChanges} change{selectedHub.categoryHistorySummary.totalChanges > 1 ? 's' : ''}</Bdg> : null}>
              <div style={{ fontSize: 12, color: C.kB, marginBottom: 10 }}>
                Current category: <strong>{selectedHub?.currentCategoryLabel}</strong>
              </div>
              {selectedHub?.categoryHistorySummary?.latestChange ? (
                <div style={{ background: C.bg, borderRadius: 10, padding: 10, fontSize: 12, color: C.kB }}>
                  <div><strong>Latest change:</strong> {selectedHub.categoryHistorySummary.latestChange.previousCategoryLabel} → {selectedHub.categoryHistorySummary.latestChange.nextCategoryLabel}</div>
                  <div style={{ marginTop: 4, color: C.kS }}>{selectedHub.categoryHistorySummary.latestChange.changedAtLabel}</div>
                  {selectedHub.categoryHistorySummary.latestChange.reason ? <div style={{ marginTop: 4 }}>{selectedHub.categoryHistorySummary.latestChange.reason}</div> : null}
                </div>
              ) : (
                <EmptyState title="No category changes yet" message="Category history entries will appear once a doctor updates patient category." compact />
              )}
            </SectionCard>
          </div>
        </AsyncContent>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        <SectionCard title="Recent Appointments">
          <AsyncContent
            isLoading={isDetailLoading}
            error={detailError}
            isEmpty={!selectedHub?.recentAppointments?.length}
            emptyTitle="No recent appointments"
            emptyMessage="Recent appointment history for the selected patient will appear here."
            onRetry={onRetryDetail}
            compact
          >
            {selectedHub?.recentAppointments?.map((appointment, index) => (
              <div key={appointment.id} style={{ padding: '8px 0', borderBottom: index < selectedHub.recentAppointments.length - 1 ? `1px solid ${C.bd}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{appointment.visitTypeLabel}</div>
                    <div style={{ fontSize: 11, color: C.kS }}>{appointment.scheduledAtLabel}</div>
                  </div>
                  <Bdg type="wait" sm>{appointment.statusLabel}</Bdg>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: C.kB }}>{appointment.reason}</div>
              </div>
            ))}
          </AsyncContent>
        </SectionCard>

        <SectionCard title="Category Timeline">
          <AsyncContent
            isLoading={isDetailLoading}
            error={detailError}
            isEmpty={!categoryHistory?.length}
            emptyTitle="No category timeline yet"
            emptyMessage="Category changes will appear here when they are recorded."
            onRetry={onRetryDetail}
            compact
          >
            {categoryHistory.map((entry, index) => (
              <div key={entry.id} style={{ padding: '8px 0', borderBottom: index < categoryHistory.length - 1 ? `1px solid ${C.bd}` : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{entry.previousCategoryLabel} → {entry.nextCategoryLabel}</div>
                <div style={{ fontSize: 11, color: C.kS }}>{entry.changedAtLabel}</div>
                {entry.reason ? <div style={{ marginTop: 4, fontSize: 11, color: C.kB }}>{entry.reason}</div> : null}
              </div>
            ))}
          </AsyncContent>
        </SectionCard>


        <SectionCard title="Communication History">
          <AsyncContent
            isLoading={isSendHistoryLoading}
            error={sendHistoryError}
            isEmpty={!sendHistory?.length}
            emptyTitle="No communication history yet"
            emptyMessage="Prescription, test-result, and invoice send actions will appear here for the selected patient."
            onRetry={onRetrySendHistory}
            compact
          >
            {sendHistory?.map((entry, index) => (
              <div key={entry.id} style={{ padding: '8px 0', borderBottom: index < sendHistory.length - 1 ? `1px solid ${C.bd}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{entry.sourceTypeLabel} • {entry.channelLabel}</div>
                    <div style={{ fontSize: 11, color: C.kS }}>{entry.requestedAtLabel || '--'}</div>
                  </div>
                  <Bdg type={entry.status === 'failed' ? 'high' : entry.status === 'delivered' || entry.status === 'sent' ? 'done' : 'wait'} sm>{entry.statusLabel}</Bdg>
                </div>
                {entry.messageSummary ? <div style={{ marginTop: 4, fontSize: 11, color: C.kB }}>{entry.messageSummary}</div> : null}
              </div>
            ))}
          </AsyncContent>
        </SectionCard>
      </div>
    </div>
  )
}
