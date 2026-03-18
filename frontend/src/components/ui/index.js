/**
 * GyneCRM — UI Components Barrel Export
 * Phase 7.5 — Shared UI Components
 *
 * Import anything from this path:
 *   import { Button, Table, Modal, StatusBadge } from '@components/ui';
 */

// ── Primitives ────────────────────────────────────────────────────────────────
export { Button }                             from './Button';
export { Spinner, PageSpinner }               from './Spinner';
export {
  SkeletonBox,
  SkeletonLine,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonListRow,
  SkeletonTable,
  SkeletonKPI,
  SkeletonProfileHeader,
}                                             from './LoadingSkeleton';

// ── Data display ──────────────────────────────────────────────────────────────
export { StatusBadge, RoleBadge }             from './StatusBadge';
export { Card, CardGrid }                     from './Card';
export { Table }                              from './Table';
export { AnalyticsCard }                      from './AnalyticsCard';
export { InfoPanel, InfoField }               from './InfoPanel';
export { Timeline }                           from './Timeline';

// ── Layout ────────────────────────────────────────────────────────────────────
export { Tabs, TabPanel }                     from './Tabs';
export { PageHeader }                         from './PageHeader';
export { KPIGrid }                            from './KPIGrid';

// ── Feedback / state ──────────────────────────────────────────────────────────
export { EmptyState }                         from './EmptyState';
export { ErrorState }                         from './ErrorState';
export { ToastViewport, notify }              from './ToastViewport';

// ── Overlays ──────────────────────────────────────────────────────────────────
export { Modal }                              from './Modal';
export { ConfirmModal }                       from './ConfirmModal';
export { OverrideModal }                      from './OverrideModal';
export { Drawer }                             from './Drawer';
