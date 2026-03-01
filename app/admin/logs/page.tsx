'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { Loader2, Filter } from 'lucide-react'

interface LogEntry {
    id: string; queue_number: number; status: string
    checkin_at: string; checkout_at?: string; checkout_number_given?: number
    claimed_by?: string | null; stub_collected?: boolean
    member: { firstName: string; lastName: string; usccmpc_id: string; membership_type: string }
    checkin_by?: { username: string }; checkout_by?: { username: string }
}

type FilterType = 'all' | 'lost' | 'mismatch'

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<FilterType>('all')

    useEffect(() => {
        fetch('/api/admin/logs')
            .then(r => r.json())
            .then(d => { setLogs(d); setLoading(false) })
    }, [])

    const visible = logs.filter(l =>
        filter === 'all' || l.status.toLowerCase() === filter
    )

    return (
        <AppShell>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Audit Log</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>All attendance records with mismatch and lost tracking</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    {(['all', 'lost', 'mismatch'] as FilterType[]).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className="btn py-1.5 px-4 text-xs capitalize"
                            style={{ background: filter === f ? 'var(--accent)' : 'var(--bg-card)', color: filter === f ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 className="animate-spin mr-2" /> Loading…
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                                    {['Member', 'USCCMPC ID', 'Type', 'Queue #', 'Status', 'Check-In', 'By (In)', 'Check-Out', 'By (Out)', 'Claimed By', 'Stub', 'Given #'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 && (
                                    <tr><td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No records found.</td></tr>
                                )}
                                {visible.map(l => {
                                    const isLost = l.status === 'Lost'
                                    const isMismatch = l.status === 'Mismatch'
                                    return (
                                        <tr key={l.id} style={{
                                            borderBottom: '1px solid var(--border)',
                                            background: isMismatch ? 'rgba(239,68,68,0.04)' : isLost ? 'rgba(245,158,11,0.04)' : 'transparent',
                                        }}>
                                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{l.member.lastName}, {l.member.firstName}</td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{l.member.usccmpc_id}</td>
                                            <td className="px-4 py-3"><span className={`badge badge-${l.member.membership_type.toLowerCase()}`}>{l.member.membership_type}</span></td>
                                            <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent)' }}>#{l.queue_number}</td>
                                            <td className="px-4 py-3"><span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{new Date(l.checkin_at).toLocaleTimeString()}</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{l.checkin_by?.username ?? '—'}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{l.checkout_at ? new Date(l.checkout_at).toLocaleTimeString() : '—'}</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{l.checkout_by?.username ?? '—'}</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: l.claimed_by ? 'var(--warning)' : 'var(--text-muted)' }}>
                                                {l.claimed_by ? `👤 ${l.claimed_by}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                {l.checkout_at
                                                    ? l.stub_collected === false
                                                        ? <span className="badge badge-lost">Not Returned</span>
                                                        : <span className="badge badge-correct">Collected</span>
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold" style={{ color: isMismatch ? '#f87171' : 'var(--text-muted)' }}>
                                                {l.checkout_number_given != null ? `#${l.checkout_number_given}` : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AppShell>
    )
}
