/**
 * GyneCRM — PageHeader
 * Phase 7.5 — Shared UI Components
 *
 * Standardized top section for all module screens.
 *
 * Usage:
 *   <PageHeader
 *     title="Patients"
 *     subtitle="Manage patient records and registrations"
 *     breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Patients' }]}
 *     actions={<Button leftIcon={<PlusIcon />}>New Patient</Button>}
 *   />
 */

import { Link } from 'react-router-dom';
import { cn } from '@utils';

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,   // Array<{ label: string, href?: string }>
  actions,
  className,
}) {
  return (
    <div className={cn('page-header-bar', className)}>
      <div className="min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="breadcrumb mb-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-content-secondary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-content-secondary font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className="page-title truncate">{title}</h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="page-subtitle">{subtitle}</p>
        )}
      </div>

      {/* Actions slot */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
