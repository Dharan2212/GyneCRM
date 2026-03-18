/**
 * GyneCRM — FileUploader
 * Phase 7.4 — Shared Form Components
 *
 * Premium drag-and-drop file uploader. Foundation for Phase 8 document
 * upload flows (lab reports, ultrasounds, identity docs, consent forms).
 *
 * Architecture contract:
 *   - Actual S3 upload happens in Phase 8 via:
 *       1. GET /api/v1/documents/upload-url  → pre-signed S3 URL
 *       2. PUT <presignedUrl>                → direct to S3
 *       3. POST /api/v1/documents            → save metadata
 *   - This component handles: file selection, validation, preview list,
 *     progress display, and emits file objects to the parent.
 *   - onFilesChange(files: File[]) — called when file list changes
 *   - onUpload(files: File[])     — optional: called when user clicks Upload
 *
 * State managed internally (local) — parent receives files via callbacks.
 *
 * Usage:
 *   <FileUploader
 *     label="Upload documents"
 *     accept={['application/pdf', 'image/jpeg', 'image/png']}
 *     maxSizeMB={10}
 *     multiple
 *     onFilesChange={(files) => setValue('documents', files)}
 *     uploading={isUploading}
 *     progress={uploadProgress}
 *   />
 */

import { useCallback, useRef, useState } from 'react';
import { cn } from '@utils';
import { FILE_UPLOAD } from '@constants';
import { FormField } from './FormField';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(file) {
  if (file.type === 'application/pdf') return <PdfIcon />;
  if (file.type.startsWith('image/'))  return <ImageIcon />;
  return <FileIcon />;
}

function validateFile(file, accept, maxSizeMB) {
  if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
    return `${file.name}: File exceeds ${maxSizeMB} MB limit`;
  }
  if (accept && accept.length > 0 && !accept.includes(file.type)) {
    return `${file.name}: File type not allowed`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FileUploader({
  // FormField props
  label,
  hint,
  error: externalError,
  required = false,
  hideLabel = false,
  // File props
  accept = FILE_UPLOAD.ALLOWED_TYPES,
  maxSizeMB = FILE_UPLOAD.MAX_SIZE_MB,
  multiple = false,
  // Callbacks
  onFilesChange,
  // Upload state (Phase 8 will wire this)
  uploading = false,
  progress,         // number 0–100 or undefined
  uploadedFiles = [], // already-uploaded file names (to show in list)
  // Layout
  className,
  id,
}) {
  const inputRef              = useRef(null);
  const [files, setFiles]     = useState([]); // pending files (not yet uploaded)
  const [isDragging, setDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState([]); // per-file validation errors

  const fieldId = id || 'file-uploader';

  // Validate and accept files
  const processFiles = useCallback(
    (incoming) => {
      const newErrors = [];
      const valid = [];

      Array.from(incoming).forEach((file) => {
        const err = validateFile(file, accept, maxSizeMB);
        if (err) {
          newErrors.push(err);
        } else {
          valid.push(file);
        }
      });

      setFileErrors(newErrors);

      if (valid.length === 0) return;

      const updated = multiple ? [...files, ...valid] : valid;
      setFiles(updated);
      onFilesChange?.(updated);
    },
    [accept, maxSizeMB, multiple, files, onFilesChange],
  );

  // Remove a pending file
  function removeFile(index) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange?.(updated);
  }

  // Drag handlers
  function onDragEnter(e) { e.preventDefault(); setDragging(true);  }
  function onDragLeave(e) { e.preventDefault(); setDragging(false); }
  function onDragOver(e)  { e.preventDefault(); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function onInputChange(e) {
    processFiles(e.target.files);
    // Reset input so same file can be re-selected after removal
    e.target.value = '';
  }

  const acceptAttr = accept.join(',');
  const allErrors  = externalError
    ? [externalError, ...fileErrors]
    : fileErrors;
  const displayError = allErrors.length > 0 ? allErrors[0] : undefined;

  return (
    <FormField
      label={label}
      htmlFor={fieldId}
      required={required}
      error={displayError}
      hint={!displayError ? (hint || `Accepted: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')} · Max ${maxSizeMB} MB`) : undefined}
      className={className}
      hideLabel={hideLabel}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        accept={acceptAttr}
        multiple={multiple}
        className="sr-only"
        onChange={onInputChange}
        disabled={uploading}
        aria-label={label || 'Upload files'}
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        aria-disabled={uploading}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          'file-drop-zone',
          isDragging && 'file-drop-zone-active',
          displayError && 'file-drop-zone-error',
          uploading && 'opacity-60 pointer-events-none',
        )}
      >
        {/* Upload icon */}
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors duration-150',
          isDragging ? 'bg-primary-100' : 'bg-surface-border',
        )}>
          <UploadIcon active={isDragging} />
        </div>

        {/* Text */}
        <p className="text-sm font-semibold text-content-secondary">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-content-tertiary mt-1">
          or{' '}
          <span className="text-primary-600 font-medium hover:underline cursor-pointer">
            browse from your computer
          </span>
        </p>
        <p className="text-xs text-content-disabled mt-2">
          {FILE_UPLOAD.ALLOWED_EXTENSIONS.join(' · ')} · up to {maxSizeMB} MB
          {multiple ? ' · Multiple files allowed' : ''}
        </p>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-content-secondary">
            <span className="flex items-center gap-1.5">
              <span className="spinner w-3 h-3 text-primary-500" />
              Uploading…
            </span>
            {progress !== undefined && <span>{progress}%</span>}
          </div>
          {progress !== undefined && (
            <div className="h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Pending files list */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Files to upload">
          {files.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className="file-item">
              <span className="text-content-tertiary shrink-0">{getFileIcon(file)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary font-medium truncate">{file.name}</p>
                <p className="text-xs text-content-tertiary">{formatBytes(file.size)}</p>
              </div>
              <span className="badge badge-yellow shrink-0 text-2xs">Pending</span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                disabled={uploading}
                className="text-content-disabled hover:text-danger-600 transition-colors ml-1 shrink-0"
                aria-label={`Remove ${file.name}`}
              >
                <RemoveIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Already-uploaded files */}
      {uploadedFiles.length > 0 && (
        <ul className="mt-2 space-y-2" aria-label="Uploaded files">
          {uploadedFiles.map((name, idx) => (
            <li key={idx} className="file-item">
              <span className="text-content-tertiary shrink-0"><FileIcon /></span>
              <p className="flex-1 min-w-0 text-sm text-content-primary truncate">{name}</p>
              <span className="badge badge-green shrink-0 text-2xs">Uploaded</span>
            </li>
          ))}
        </ul>
      )}

      {/* Additional file errors */}
      {allErrors.length > 1 && (
        <ul className="mt-1 space-y-0.5">
          {allErrors.slice(1).map((e, i) => (
            <li key={i} className="input-error-text">{e}</li>
          ))}
        </ul>
      )}
    </FormField>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function UploadIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#0D7E8A' : '#9ca3af'} strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  );
}
function PdfIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function ImageIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
}
function FileIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function RemoveIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
