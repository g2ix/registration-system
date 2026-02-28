'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '@/components/AppShell'
import { Vote, Download, CheckSquare, Square, Loader2, RefreshCw, Search, Users, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { normalizeForSearch } from '@/lib/normalize'

interface Member {
    id: string; usccmpc_id: string; firstName: string; lastName: string
    middleName?: string; suffix?: string; membership_type: 'Regular' | 'Associate'
    contactNumber?: string; voted: boolean; voted_at?: string
    attendance: { id: string; queue_number: number; checkin_at: string; checkout_at?: string; status: string }[]
}

type VoteFilter = 'all' | 'voted' | 'not_voted'

export default function ElectionPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [totalRegular, setTotalRegular] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<VoteFilter>('all')
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [eventTitle, setEventTitle] = useState('USCCMPC Event')

    const fetchMembers = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const [mRes, eRes] = await Promise.all([fetch('/api/election/members'), fetch('/api/admin/event')])
            const mData = await mRes.json()
            setMembers(mData.members); setTotalRegular(mData.totalRegular)
            setEventTitle((await eRes.json()).title)
        } finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchMembers()
        const i = setInterval(() => fetchMembers(true), 10000)
        return () => clearInterval(i)
    }, [fetchMembers])

    async function toggleVoted(m: Member) {
        setTogglingId(m.id)
        await fetch('/api/election/members', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: m.id, voted: !m.voted }),
        })
        setMembers(prev => prev.map(x => x.id === m.id ? { ...x, voted: !m.voted, voted_at: !m.voted ? new Date().toISOString() : undefined } : x))
        setTogglingId(null)
    }

    const visible = members.filter(m => {
        const q = normalizeForSearch(search)  // ñ → n, strip accents
        const nameMatch = (s: string) => normalizeForSearch(s).includes(q)
        const matchSearch = !q ||
            nameMatch(m.firstName) ||
            nameMatch(m.lastName) ||
            String(m.attendance[0]?.queue_number ?? '').includes(q)
        const matchFilter = filter === 'all' || (filter === 'voted' && m.voted) || (filter === 'not_voted' && !m.voted)
        return matchSearch && matchFilter
    })

    const votedCount = members.filter(m => m.voted).length
    const notVotedCount = members.length - votedCount

    function buildRows() {
        return visible.map((m, i) => ({
            '#': i + 1, 'Queue #': m.attendance[0]?.queue_number ?? '',
            'Last Name': m.lastName, 'First Name': m.firstName,
            'Middle Name': m.middleName ?? '', 'Suffix': m.suffix ?? '',
            'USCCMPC ID': m.usccmpc_id, 'Membership Type': m.membership_type,
            'Contact': m.contactNumber ?? '',
            'Check-in': m.attendance[0]?.checkin_at ? new Date(m.attendance[0].checkin_at).toLocaleString() : '',
            'Check-out': m.attendance[0]?.checkout_at ? new Date(m.attendance[0].checkout_at).toLocaleString() : 'Present',
            'Voted': m.voted ? 'Yes' : 'No',
            'Voted At': m.voted_at ? new Date(m.voted_at).toLocaleString() : '',
        }))
    }

    function exportCSV() {
        const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(buildRows()))
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${eventTitle}_election.csv`; a.click()
    }

    function exportXLSX() {
        const ws = XLSX.utils.json_to_sheet(buildRows()); const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Election')
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([buf], { type: 'application/octet-stream' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${eventTitle}_election.xlsx`; a.click()
    }

    return (
        <AppShell>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Election Panel</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track voting status for all checked-in members</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-ghost text-xs py-1.5 px-2" onClick={() => fetchMembers()} title="Refresh"><RefreshCw size={13} /></button>
                    <button className="btn btn-ghost text-xs py-1.5 px-3" onClick={exportCSV}><Download size={13} /> CSV</button>
                    <button className="btn btn-primary text-xs py-1.5 px-3" onClick={exportXLSX}><Download size={13} /> XLSX</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Total Regular</p>
                    <p className="text-3xl font-bold" style={{ color: '#3b82f6' }}>{totalRegular}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>in database</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Checked-In</p>
                    <p className="text-3xl font-bold" style={{ color: '#60a5fa' }}>{members.length}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{totalRegular > 0 ? Math.round(members.length / totalRegular * 100) : 0}% of regular</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Voted</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{votedCount}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{members.length > 0 ? Math.round(votedCount / members.length * 100) : 0}% of present</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Not Yet Voted</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{notVotedCount}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>still pending</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input className="input pl-9 py-2 text-sm" placeholder="Search name or queue #…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                </div>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {([['all', 'All'], ['not_voted', 'Not Voted'], ['voted', 'Voted']] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setFilter(val)} className="px-3 py-2 text-xs font-semibold transition-colors"
                            style={{ background: filter === val ? 'var(--accent)' : 'var(--bg-card)', color: filter === val ? '#fff' : 'var(--text-secondary)', borderRight: val !== 'voted' ? '1px solid var(--border)' : 'none' }}>
                            {label}
                        </button>
                    ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{visible.length} / {members.length}</span>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20" style={{ color: 'var(--text-muted)' }}><Loader2 className="animate-spin mr-2" /> Loading…</div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                                    {['Voted', 'Queue #', 'Name', 'Type', 'USCCMPC ID', 'Check-In', 'Status', 'Voted At'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 && (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {members.length === 0 ? 'No checked-in members yet.' : 'No results for current filter.'}
                                    </td></tr>
                                )}
                                {visible.map(m => {
                                    const att = m.attendance[0]
                                    return (
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', background: m.voted ? 'rgba(34,197,94,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleVoted(m)} disabled={togglingId === m.id} className="flex items-center gap-2 hover:scale-105 transition-transform">
                                                    {togglingId === m.id ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                                                        : m.voted ? <CheckSquare size={20} style={{ color: 'var(--success)' }} />
                                                            : <Square size={20} style={{ color: 'var(--text-muted)' }} />}
                                                    <span className="text-xs font-semibold" style={{ color: m.voted ? 'var(--success)' : 'var(--text-muted)' }}>
                                                        {m.voted ? 'Voted' : 'Not Yet'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent)' }}>{att ? `#${att.queue_number}` : '—'}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold whitespace-nowrap">{m.lastName}, {m.firstName} {m.middleName ?? ''} {m.suffix ?? ''}</p>
                                                {m.contactNumber && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.contactNumber}</p>}
                                            </td>
                                            <td className="px-4 py-3"><span className={`badge badge-${m.membership_type.toLowerCase()}`}>{m.membership_type}</span></td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{m.usccmpc_id}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{att ? new Date(att.checkin_at).toLocaleTimeString() : '—'}</td>
                                            <td className="px-4 py-3">
                                                {att ? <span className={`badge badge-${att.checkout_at ? att.status.toLowerCase() : 'checkedin'}`}>{att.checkout_at ? att.status : 'Present'}</span> : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{m.voted_at ? new Date(m.voted_at).toLocaleTimeString() : '—'}</td>
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
