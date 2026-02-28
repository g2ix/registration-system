'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '@/components/AppShell'
import {
    Users, CheckCircle, TrendingUp, Edit3, Save, X,
    RefreshCw, Loader2, LogIn, LogOut as LogOutIcon
} from 'lucide-react'

interface Stats {
    totalMembers: number; checkedInTotal: number; checkedOutTotal: number
    currentlyPresent: number; regularMembers: number; associateMembers: number
    checkedInRegular: number; checkedInAssociate: number
    checkedOutRegular: number; checkedOutAssociate: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [eventTitle, setEventTitle] = useState('')
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState('')
    const [savingTitle, setSavingTitle] = useState(false)
    const [polling, setPolling] = useState(false)

    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) setPolling(true)
        try {
            const [statsRes, evtRes] = await Promise.all([fetch('/api/admin/stats'), fetch('/api/admin/event')])
            setStats(await statsRes.json())
            const evtData = await evtRes.json()
            setEventTitle(evtData.title); setTitleInput(evtData.title)
        } finally { if (!silent) setPolling(false) }
    }, [])

    useEffect(() => {
        fetchStats()
        const i = setInterval(() => fetchStats(true), 5000)
        return () => clearInterval(i)
    }, [fetchStats])

    async function saveTitle() {
        setSavingTitle(true)
        await fetch('/api/admin/event', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titleInput }) })
        setSavingTitle(false); setEventTitle(titleInput); setEditingTitle(false)
    }

    const checkinPct = stats ? Math.round((stats.checkedInTotal / (stats.totalMembers || 1)) * 100) : 0
    const checkoutPct = stats ? Math.round((stats.checkedOutTotal / (stats.checkedInTotal || 1)) * 100) : 0

    return (
        <AppShell>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Live attendance overview · auto-refreshes every 5 seconds</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Editable event title */}
                    {editingTitle ? (
                        <div className="flex items-center gap-2">
                            <input className="input text-sm py-1.5" style={{ width: '220px' }}
                                value={titleInput} onChange={e => setTitleInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }} autoFocus />
                            <button className="btn btn-success py-1.5 px-3 text-xs" onClick={saveTitle} disabled={savingTitle}>
                                {savingTitle ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            </button>
                            <button className="btn btn-ghost py-1.5 px-3 text-xs" onClick={() => setEditingTitle(false)}><X size={13} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{eventTitle}</span>
                            <button className="btn btn-ghost py-1.5 px-2 text-xs" onClick={() => setEditingTitle(true)} title="Edit event title"><Edit3 size={12} /></button>
                        </div>
                    )}
                    <button className="btn btn-ghost py-1.5 px-2 text-xs" onClick={() => fetchStats()} title="Refresh">
                        {polling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <StatCard label="Total Members" value={stats?.totalMembers ?? '—'} icon={<Users size={20} />} color="#3b82f6" />
                <StatCard label="Total Checked-In" value={stats?.checkedInTotal ?? '—'} sub={`${checkinPct}% of members`} icon={<LogIn size={20} />} color="#22c55e" />
                <StatCard label="Currently Present" value={stats?.currentlyPresent ?? '—'} sub="checked in, not yet out" icon={<CheckCircle size={20} />} color="#06b6d4" />
                <StatCard label="Checked Out" value={stats?.checkedOutTotal ?? '—'} sub={`${checkoutPct}% of check-ins`} icon={<LogOutIcon size={20} />} color="#a855f7" />
                <StatCard label="Not Yet In" value={stats != null ? stats.totalMembers - stats.checkedInTotal : '—'} icon={<TrendingUp size={20} />} color="#f59e0b" />
            </div>

            {/* ── Segmented ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SegmentCard label="Regular Members" checkedIn={stats?.checkedInRegular ?? 0} checkedOut={stats?.checkedOutRegular ?? 0} total={stats?.regularMembers ?? 0} color="#3b82f6" />
                <SegmentCard label="Associate Members" checkedIn={stats?.checkedInAssociate ?? 0} checkedOut={stats?.checkedOutAssociate ?? 0} total={stats?.associateMembers ?? 0} color="#a855f7" />
            </div>
        </AppShell>
    )
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: number | string; sub?: string; icon: React.ReactNode; color: string }) {
    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <div className="p-2 rounded-lg" style={{ background: `${color}18`, color }}>{icon}</div>
            </div>
            <p className="text-3xl font-bold">{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
    )
}

function SegmentCard({ label, checkedIn, checkedOut, total, color }: { label: string; checkedIn: number; checkedOut: number; total: number; color: string }) {
    const inPct = total > 0 ? Math.round((checkedIn / total) * 100) : 0
    const outPct = total > 0 ? Math.round((checkedOut / total) * 100) : 0
    return (
        <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{label}</h3>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} total</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg p-3 text-center" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Checked In</p>
                    <p className="text-2xl font-bold" style={{ color }}>{checkedIn}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{inPct}%</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Checked Out</p>
                    <p className="text-2xl font-bold" style={{ color: '#c084fc' }}>{checkedOut}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{outPct}%</p>
                </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${inPct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{inPct}% checked in · {checkedIn - checkedOut} still present</p>
        </div>
    )
}
