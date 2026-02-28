'use client'

import { useState, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Row { [key: string]: string }
interface UploadResult { upserted: number; errors: number; errorDetails: string[] }

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null)
    const [rows, setRows] = useState<Row[]>([])
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [drag, setDrag] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    function parseFile(f: File) {
        setFile(f); setResult(null)
        const reader = new FileReader()
        reader.onload = e => {
            const data = e.target?.result
            // Use 'array' type so the XLSX library receives raw bytes and can
            // correctly detect UTF-8 / CP-1252 encoding — preserving ñ, á, é etc.
            const wb = XLSX.read(data, { type: 'array', codepage: 65001 })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const parsed = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' })
            setRows(parsed)
        }
        reader.readAsArrayBuffer(f)   // ← was readAsBinaryString (breaks UTF-8)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault(); setDrag(false)
        const f = e.dataTransfer.files[0]
        if (f) parseFile(f)
    }

    async function handleUpload() {
        if (!rows.length) return
        setUploading(true); setResult(null)
        const res = await fetch('/api/members/upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
        })
        setResult(await res.json()); setUploading(false)
    }

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Upload Members</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Import member list via CSV or Excel file</p>
                </div>

                {/* Drop zone */}
                <div className={`card p-10 mb-5 text-center transition-all cursor-pointer`}
                    style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: drag ? 'var(--accent)' : 'var(--border)', background: drag ? 'var(--accent-light)' : 'var(--bg-card)' }}
                    onDragOver={e => { e.preventDefault(); setDrag(true) }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}>
                    <Upload size={36} className="mx-auto mb-3" style={{ color: drag ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <p className="font-semibold mb-1" style={{ color: drag ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {file ? file.name : 'Drop CSV or XLSX file here'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{file ? `${rows.length} rows detected` : 'or click to browse'}</p>
                    <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
                </div>

                {/* Required columns info */}
                <div className="card p-4 mb-5" style={{ background: 'var(--accent-light)', borderColor: 'rgba(58,140,74,0.3)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>REQUIRED COLUMNS</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        usccmpc_id · firstName · lastName · membership_type (Regular / Associate)
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Optional: middleName, suffix, email1, email2, contactNumber</p>
                </div>

                {/* Preview */}
                {rows.length > 0 && (
                    <div className="card overflow-hidden mb-5">
                        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                            <p className="text-sm font-semibold">Preview (first 5 rows)</p>
                            <span className="badge badge-regular">{rows.length} rows</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr style={{ background: 'var(--bg-input)' }}>
                                        {Object.keys(rows[0]).slice(0, 6).map(k => (
                                            <th key={k} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>{k}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.slice(0, 5).map((r, i) => (
                                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                            {Object.values(r).slice(0, 6).map((v, j) => (
                                                <td key={j} className="px-3 py-2 truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>{String(v)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {rows.length > 0 && (
                    <button className="btn btn-primary w-full mb-5" onClick={handleUpload} disabled={uploading}>
                        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        {uploading ? 'Uploading…' : `Upload ${rows.length} Members`}
                    </button>
                )}

                {/* Result */}
                {result && (
                    <div className="card p-5 animate-slide-up space-y-3">
                        <div className="flex items-center gap-2">
                            {result.errors === 0
                                ? <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                                : <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />}
                            <p className="font-semibold">
                                {result.upserted} imported · {result.errors} error{result.errors !== 1 ? 's' : ''}
                            </p>
                        </div>
                        {result.errorDetails.length > 0 && (
                            <ul className="space-y-1">
                                {result.errorDetails.map((msg, i) => (
                                    <li key={i} className="text-xs p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                                        {msg}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    )
}
