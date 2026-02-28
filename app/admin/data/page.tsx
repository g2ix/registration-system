'use client'

import { useState, useRef } from 'react'
import AppShell from '@/components/AppShell'
import * as XLSX from 'xlsx'
import {
    Download, Upload, DatabaseBackup, RefreshCw,
    CheckCircle, AlertTriangle, Loader2, FileJson,
    FileSpreadsheet, FileText, ShieldAlert
} from 'lucide-react'

interface RestoreResult { membersRestored: number; memberErrors: number; errorDetails: string[]; message: string }

export default function DataPage() {
    // ── Backup ──────────────────────────────────────────────────
    const [backingUp, setBackingUp] = useState(false)

    async function handleBackup() {
        setBackingUp(true)
        try {
            const res = await fetch('/api/admin/backup')
            if (!res.ok) { alert('Backup failed'); return }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `usccmpc_backup_${new Date().toISOString().slice(0, 10)}.json`
            a.click(); URL.revokeObjectURL(url)
        } finally { setBackingUp(false) }
    }

    // ── Restore ─────────────────────────────────────────────────
    const restoreRef = useRef<HTMLInputElement>(null)
    const [restoreFile, setRestoreFile] = useState<File | null>(null)
    const [restoring, setRestoring] = useState(false)
    const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
    const [restoreError, setRestoreError] = useState('')

    async function handleRestore() {
        if (!restoreFile) return
        setRestoring(true); setRestoreResult(null); setRestoreError('')
        try {
            const text = await restoreFile.text()
            let parsed: unknown
            try { parsed = JSON.parse(text) } catch { setRestoreError('Invalid JSON file'); return }
            const res = await fetch('/api/admin/restore', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed),
            })
            const data = await res.json()
            if (!res.ok) { setRestoreError(data.error); return }
            setRestoreResult(data); setRestoreFile(null)
            if (restoreRef.current) restoreRef.current.value = ''
        } finally { setRestoring(false) }
    }

    // ── Attendance Export ────────────────────────────────────────
    const [exporting, setExporting] = useState(false)
    const [exportCount, setExportCount] = useState<number | null>(null)

    async function fetchRows() {
        setExporting(true); setExportCount(null)
        try {
            const res = await fetch('/api/admin/attendance/export')
            if (!res.ok) { alert('Export failed'); return null }
            const rows = await res.json()
            setExportCount(rows.length)
            return rows
        } finally { setExporting(false) }
    }

    async function exportCSV() {
        const rows = await fetchRows(); if (!rows) return
        const ws = XLSX.utils.json_to_sheet(rows)
        const csv = XLSX.utils.sheet_to_csv(ws)
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel UTF-8
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    }

    async function exportXLSX() {
        const rows = await fetchRows(); if (!rows) return
        const ws = XLSX.utils.json_to_sheet(rows)
        // Auto-size columns
        const colWidths = Object.keys(rows[0] ?? {}).map(k => ({ wch: Math.max(k.length, 14) }))
        ws['!cols'] = colWidths
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([buf], { type: 'application/octet-stream' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = `attendance_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click()
    }

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="mb-2">
                    <h1 className="text-2xl font-bold">Data Management</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Backup, restore and export attendance data</p>
                </div>

                {/* ── Section 1: Attendance Export ─────────────────── */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)' }}>
                            <FileSpreadsheet size={20} style={{ color: 'var(--success)' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base">Export Attendance</h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Full attendance report with member info, check-in/out times and staff names</p>
                        </div>
                    </div>

                    <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                        <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Columns included:</p>
                        Queue # · USCCMPC ID · Last Name · First Name · Middle Name · Suffix ·
                        Membership Type · Contact · Email · Check-In Time · Check-In By ·
                        Check-Out Time · Check-Out By · Queue # at Out · Status
                    </div>

                    {exportCount !== null && (
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                            <CheckCircle size={12} className="inline mr-1" style={{ color: 'var(--success)' }} />
                            {exportCount} attendance record{exportCount !== 1 ? 's' : ''} exported
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button className="btn btn-ghost flex-1 text-sm py-2.5" onClick={exportCSV} disabled={exporting}>
                            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                            Download CSV
                        </button>
                        <button className="btn btn-primary flex-1 text-sm py-2.5" onClick={exportXLSX} disabled={exporting}>
                            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
                            Download XLSX
                        </button>
                    </div>
                </div>

                {/* ── Section 2: Backup ─────────────────────────────── */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.15)' }}>
                            <DatabaseBackup size={20} style={{ color: '#60a5fa' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base">Backup Database</h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Download all members + attendance as a JSON backup file</p>
                        </div>
                    </div>

                    <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                        Backup includes <strong style={{ color: 'var(--text-secondary)' }}>all member records</strong> and <strong style={{ color: 'var(--text-secondary)' }}>all attendance records</strong>.
                        Store this file safely — it can be used to restore data if needed.
                    </div>

                    <button className="btn btn-ghost w-full text-sm py-2.5" onClick={handleBackup} disabled={backingUp}>
                        {backingUp ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {backingUp ? 'Preparing backup…' : 'Download JSON Backup'}
                    </button>
                </div>

                {/* ── Section 3: Restore ────────────────────────────── */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)' }}>
                            <Upload size={20} style={{ color: 'var(--warning)' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base">Restore from Backup</h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Import members from a previously downloaded backup file</p>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 rounded-lg p-3 mb-4 text-xs"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                        <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
                        <span>Existing members will be <strong>updated</strong> (matched by USCCMPC ID). New members will be added. Attendance records are NOT overwritten.</span>
                    </div>

                    {/* File picker */}
                    <div
                        className="rounded-lg p-4 mb-4 text-center cursor-pointer transition-colors"
                        style={{ border: '2px dashed var(--border)', background: 'var(--bg-input)' }}
                        onClick={() => restoreRef.current?.click()}>
                        <FileJson size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm font-semibold" style={{ color: restoreFile ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {restoreFile ? restoreFile.name : 'Click to select a backup .json file'}
                        </p>
                        {restoreFile && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{(restoreFile.size / 1024).toFixed(1)} KB</p>
                        )}
                        <input ref={restoreRef} type="file" accept=".json" className="hidden"
                            onChange={e => { setRestoreFile(e.target.files?.[0] ?? null); setRestoreResult(null); setRestoreError('') }} />
                    </div>

                    {/* Result */}
                    {restoreError && (
                        <div className="rounded-lg p-3 mb-3 text-xs flex items-center gap-2"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                            <AlertTriangle size={13} /> {restoreError}
                        </div>
                    )}
                    {restoreResult && (
                        <div className="rounded-lg p-3 mb-3 text-xs space-y-1"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--success)' }}>
                            <p className="font-semibold flex items-center gap-1"><CheckCircle size={12} /> {restoreResult.message}</p>
                            {restoreResult.errorDetails.length > 0 && (
                                <ul className="mt-2 space-y-0.5" style={{ color: '#f87171' }}>
                                    {restoreResult.errorDetails.map((e, i) => <li key={i}>• {e}</li>)}
                                </ul>
                            )}
                        </div>
                    )}

                    <button className="btn w-full text-sm py-2.5"
                        style={{ background: restoreFile ? 'var(--warning)' : 'var(--bg-input)', color: restoreFile ? '#1a1a1a' : 'var(--text-muted)', border: '1px solid var(--border)' }}
                        onClick={handleRestore} disabled={!restoreFile || restoring}>
                        {restoring ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                        {restoring ? 'Restoring…' : 'Restore Members from Backup'}
                    </button>
                </div>
            </div>
        </AppShell>
    )
}
