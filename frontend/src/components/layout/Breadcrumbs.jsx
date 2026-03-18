/**
 * GyneCRM — Breadcrumbs
 * Phase 7.6 — AppShell Layout System
 *
 * Renders structured breadcrumb navigation.
 * Used in the Header and optionally in PageHeader.
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { label: 'Dashboard', href: '/admin/dashboard' },
 *     { label: 'Patients',  href: '/admin/patients' },
 *     { label: 'Priya Sharma' },  // current — no href
 *   ]} />
 *
 * Auto-generation helper (Phase 8):
 *   const crumbs = useBreadcrumbs(); // hook built in Phase 8 using useMatches()
 */

import { Link } from 'react-router-dom';
import { cn } from '@utils';

export function Breadcrumbs({ items = [], className }) {
  if (!items || items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('breadcrumb', className)}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1.5">
              {idx > 0 && (
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  strokeLinejoin="round" className="text-content-disabled shrink-0"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-content-tertiary hover:text-content-secondary transition-colors duration-100"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    isLast
                      ? 'text-content-secondary font-medium'
                      : 'text-content-tertiary',
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
