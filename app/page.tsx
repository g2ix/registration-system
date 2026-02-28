'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '@/components/AppShell'
import {
    Search, CheckCircle, XCircle, AlertTriangle,
    ChevronRight, X, Loader2, Hash, ArrowLeft, RotateCcw,
    Clock, UserCheck, LogIn, LogOut
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface Member {
    id: string; usccmpc_id: string; firstName: string; lastName: string
    middleName?: string; suffix?: string; membership_type: 'Regular' | 'Associate'
    email1?: string; contactNumber?: string; attendance: Attendance[]
}
interface Attendance {
    id: string; queue_number: number; checkin_at: string; checkout_at?: string
    status: 'Correct' | 'Lost' | 'Mismatch'
    checkin_by?: { username: string }; checkout_by?: { username: string }
}
type CheckoutState = 'entering' | 'mismatch_confirm'

interface FeedEvent {
    id: string
    type: 'checkin' | 'checkout'
    timestamp: string
    queue_number: number
    member: { firstName: string; lastName: string; membership_type: string }
    by?: { username: string } | null
    status?: string
}

// ─── Main Page ────────────────────────────────────────────────
export default function AttendancePage() {
    const { data: session } = useSession()
    const [query, setQuery] = useState('')
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
    const [recent, setRecent] = useState<FeedEvent[]>([])

    const fetchRecent = useCallback(async () => {
        const res = await fetch('/api/attendance/recent')
        if (res.ok) setRecent(await res.json())
    }, [])

    useEffect(() => {
        fetchRecent()
        const interval = setInterval(fetchRecent, 5000)
        return () => clearInterval(interval)
    }, [fetchRecent])

    const searchRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const focusSearch = useCallback(() => { setTimeout(() => searchRef.current?.focus(), 50) }, [])
    useEffect(() => { focusSearch() }, [focusSearch])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!query.trim()) { setMembers([]); setSelectedIndex(-1); return }
        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/members/search?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                setMembers(data); setSelectedIndex(data.length > 0 ? 0 : -1)
            } finally { setLoading(false) }
        }, 200)
    }, [query])

    function handleSearchKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, members.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
        else if (e.key === 'Enter') { e.preventDefault(); if (members[selectedIndex]) openMember(members[selectedIndex]) }
        else if (e.key === 'Escape') { setQuery(''); setMembers([]) }
    }

    function openMember(m: Member) { setSelectedMember(m); setQuery(''); setMembers([]) }
    function closeMember() { setSelectedMember(null); fetchRecent(); focusSearch() }

    async function refreshMember(id: string) {
        const res = await fetch(`/api/members/search?q=${id}`)
        const data = await res.json()
        const updated = data.find((m: Member) => m.id === id)
        if (updated) setSelectedMember(updated); else closeMember()
    }

    return (
        <AppShell>
            <div className="flex gap-6 items-start">
                {/* ── Left: Search + Actions ── */}
                <div className="flex-1 min-w-0">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Attendance</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Search and check in / check out members</p>
                    </div>

                    {!selectedMember && (
                        <div className="animate-fade-in">
                            <div className="relative mb-3">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                {loading && <Loader2 size={15} className="animate-spin absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />}
                                <input
                                    ref={searchRef} className="input pl-11 pr-11 py-4" style={{ fontSize: '16px', borderRadius: '12px' }}
                                    placeholder="Search by first name, last name, or queue number…"
                                    value={query} onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
                                    onKeyDown={handleSearchKeyDown} autoComplete="off" spellCheck={false}
                                />
                            </div>

                            {members.length > 0 && (
                                <ul ref={listRef} className="card overflow-hidden overflow-y-auto animate-slide-up" style={{ maxHeight: '60vh' }}>
                                    {members.map((m, i) => {
                                        const att = m.attendance?.[0]
                                        const isIn = att && !att.checkout_at
                                        const isOut = att && !!att.checkout_at
                                        return (
                                            <li key={m.id}>
                                                <button className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                                                    style={{ background: i === selectedIndex ? 'var(--bg-card-hover)' : 'transparent', borderBottom: '1px solid var(--border)' }}
                                                    onClick={() => openMember(m)} onMouseEnter={() => setSelectedIndex(i)}>
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <span className="font-semibold text-sm truncate">{m.lastName}, {m.firstName} {m.middleName ?? ''} {m.suffix ?? ''}</span>
                                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {m.usccmpc_id}{att && ` · Queue #${att.queue_number}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`badge badge-${m.membership_type.toLowerCase()}`}>{m.membership_type}</span>
                                                        {isIn && <span className="badge badge-checkedin">In</span>}
                                                        {isOut && <span className={`badge badge-${att.status.toLowerCase()}`}>{att.status}</span>}
                                                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}

                            {query && !loading && members.length === 0 && (
                                <div className="text-center py-12 animate-fade-in" style={{ color: 'var(--text-muted)' }}>
                                    <Search size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No members found for "{query}"</p>
                                </div>
                            )}

                            {!query && (
                                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-base font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Ready to scan</p>
                                    <p className="text-sm">Search by first name, last name, or queue number</p>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedMember && (
                        <MemberPanel member={selectedMember} session={session}
                            onClose={closeMember} onRefresh={refreshMember} />
                    )}
                </div>{/* end left col */}

                {/* ── Right: Recent Check-ins ── */}
                <div className="w-72 shrink-0 hidden lg:block">
                    <RecentPanel items={recent} />
                </div>
            </div>
        </AppShell>
    )
}

// ─── Member Panel ─────────────────────────────────────────────
function MemberPanel({ member, session, onClose, onRefresh }: {
    member: Member; session: any; onClose: () => void; onRefresh: (id: string) => void
}) {
    const attendance = member.attendance?.[0]
    const isCheckedIn = attendance && !attendance.checkout_at
    const isCheckedOut = attendance && !!attendance.checkout_at

    return (
        <div className="animate-slide-up">
            <button onClick={onClose} className="btn btn-ghost mb-4 text-sm py-2"><ArrowLeft size={14} /> Back</button>
            <div className="card p-5 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold mb-1">{member.lastName}, {member.firstName} {member.middleName ?? ''} {member.suffix ?? ''}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ID: <span style={{ color: 'var(--text-secondary)' }}>{member.usccmpc_id}</span></span>
                            <span className={`badge badge-${member.membership_type.toLowerCase()}`}>{member.membership_type}</span>
                        </div>
                        {member.contactNumber && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>📞 {member.contactNumber}</p>}
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-2" style={{ minWidth: 0 }}><X size={16} /></button>
                </div>
            </div>

            {!attendance && <CheckinForm member={member} onSuccess={() => onRefresh(member.id)} />}
            {isCheckedIn && <CheckoutForm attendance={attendance} onSuccess={() => onRefresh(member.id)} />}
            {isCheckedOut && (
                <div className="card p-5 space-y-3">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>ATTENDANCE RECORD</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoRow label="Queue #" value={`#${attendance.queue_number}`} />
                        <InfoRow label="Status" value={<span className={`badge badge-${attendance.status.toLowerCase()}`}>{attendance.status}</span>} />
                        <InfoRow label="Checked in" value={new Date(attendance.checkin_at).toLocaleTimeString()} />
                        <InfoRow label="Checked out" value={new Date(attendance.checkout_at!).toLocaleTimeString()} />
                        {attendance.checkin_by && <InfoRow label="By (in)" value={attendance.checkin_by.username} />}
                        {attendance.checkout_by && <InfoRow label="By (out)" value={attendance.checkout_by.username} />}
                    </div>
                </div>
            )}
        </div>
    )
}

function CheckinForm({ member, onSuccess }: { member: Member; onSuccess: () => void }) {
    const [queueNumber, setQueueNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    useEffect(() => { inputRef.current?.focus() }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); if (!queueNumber) return
        setLoading(true); setError('')
        const res = await fetch('/api/attendance/checkin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: member.id, queue_number: parseInt(queueNumber) }),
        })
        setLoading(false)
        if (res.ok) onSuccess()
        else { const d = await res.json(); setError(d.error ?? 'Failed') }
    }

    return (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4 animate-slide-up">
            <div className="flex items-center gap-2">
                <Hash size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>CHECK-IN</h3>
            </div>
            <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>TRAIL / QUEUE NUMBER</label>
                <input ref={inputRef} className="input text-2xl text-center font-bold tracking-widest" style={{ height: '64px' }}
                    type="number" min="1" placeholder="—" value={queueNumber} onChange={e => setQueueNumber(e.target.value)} required />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading || !queueNumber}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                {loading ? 'Checking in…' : 'Confirm Check-In'}
            </button>
        </form>
    )
}

function CheckoutForm({ attendance, onSuccess }: { attendance: Attendance; onSuccess: () => void }) {
    const [state, setState] = useState<CheckoutState>('entering')
    const [numberInput, setNumberInput] = useState('')
    const [numberGiven, setNumberGiven] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const givenRef = useRef<HTMLInputElement>(null)
    useEffect(() => { inputRef.current?.focus() }, [])
    useEffect(() => { if (state === 'mismatch_confirm') givenRef.current?.focus() }, [state])

    async function submitCheckout(action: 'correct' | 'lost' | 'mismatch', extraNumberGiven?: string) {
        setLoading(true); setError('')
        const body: any = { attendance_id: attendance.id, action }
        if (action === 'mismatch') body.number_given = extraNumberGiven
        const res = await fetch('/api/attendance/checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        setLoading(false)
        if (res.ok) onSuccess()
        else { const d = await res.json(); setError(d.error ?? 'Failed') }
    }

    return (
        <div className="space-y-4 animate-slide-up">
            <div className="card p-4 flex items-center justify-between gap-4"
                style={{ borderColor: 'rgba(58,140,74,0.3)', background: 'var(--accent-light)' }}>
                <div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>CHECKED IN WITH TRAIL #</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>#{attendance.queue_number}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(attendance.checkin_at).toLocaleTimeString()}{attendance.checkin_by && ` · ${attendance.checkin_by.username}`}
                    </p>
                </div>
                <span className="badge badge-checkedin">Present</span>
            </div>

            {state === 'entering' && (
                <form onSubmit={e => { e.preventDefault(); if (!numberInput) return; parseInt(numberInput) === attendance.queue_number ? submitCheckout('correct') : setState('mismatch_confirm') }}
                    className="card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Hash size={16} style={{ color: 'var(--warning)' }} />
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>CHECK-OUT</h3>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>NUMBER ON MEMBER'S RECEIPT</label>
                        <input ref={inputRef} className="input text-2xl text-center font-bold tracking-widest" style={{ height: '64px' }}
                            type="number" min="1" placeholder="—" value={numberInput} onChange={e => setNumberInput(e.target.value)} />
                    </div>
                    {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="submit" className="btn btn-primary" disabled={loading || !numberInput}>
                            {loading && <Loader2 size={15} className="animate-spin" />} Verify & Out
                        </button>
                        <button type="button" className="btn btn-warning" onClick={() => submitCheckout('lost')} disabled={loading}>
                            <AlertTriangle size={15} /> Lost Number
                        </button>
                    </div>
                </form>
            )}

            {state === 'mismatch_confirm' && (
                <form onSubmit={e => { e.preventDefault(); if (numberGiven) submitCheckout('mismatch', numberGiven) }}
                    className="card p-5 space-y-4 animate-slide-up"
                    style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
                    <div className="flex items-center gap-2">
                        <XCircle size={16} style={{ color: 'var(--danger)' }} />
                        <h3 className="font-semibold text-sm" style={{ color: '#f87171' }}>MISMATCH DETECTED</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div className="text-center">
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Trail #</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>#{attendance.queue_number}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Presented</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--danger)' }}>#{numberInput}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: '#f87171' }}>NUMBER ACTUALLY GIVEN (REQUIRED)</label>
                        <input ref={givenRef} className="input text-2xl text-center font-bold" style={{ height: '64px', borderColor: 'rgba(239,68,68,0.4)' }}
                            type="number" min="1" placeholder="—" value={numberGiven} onChange={e => setNumberGiven(e.target.value)} required />
                    </div>
                    {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="submit" className="btn btn-danger" disabled={loading || !numberGiven}>
                            {loading && <Loader2 size={15} className="animate-spin" />}
                            <AlertTriangle size={15} /> Record Mismatch
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => { setState('entering'); setError('') }} disabled={loading}>
                            <RotateCcw size={14} /> Go Back
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-sm font-medium">{value}</p>
        </div>
    )
}

// ─── Activity Feed Panel ───────────────────────────────────────
function RecentPanel({ items }: { items: FeedEvent[] }) {
    const checkins = items.filter(e => e.type === 'checkin').length
    const checkouts = items.filter(e => e.type === 'checkout').length

    return (
        <div className="sticky top-20">
            <div className="flex items-center gap-2 mb-3">
                <UserCheck size={15} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Activity Feed</h2>
            </div>

            {/* mini stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <LogIn size={13} style={{ color: '#4ade80' }} />
                    <div>
                        <p className="text-lg font-bold leading-none" style={{ color: '#4ade80' }}>{checkins}</p>
                        <p className="text-xs" style={{ color: 'rgba(74,222,128,0.7)' }}>In</p>
                    </div>
                </div>
                <div className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                    <LogOut size={13} style={{ color: '#fb923c' }} />
                    <div>
                        <p className="text-lg font-bold leading-none" style={{ color: '#fb923c' }}>{checkouts}</p>
                        <p className="text-xs" style={{ color: 'rgba(251,146,60,0.7)' }}>Out</p>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden" style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
                {items.length === 0 && (
                    <div className="px-4 py-10 text-center">
                        <Clock size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No activity yet</p>
                    </div>
                )}
                {items.map((item, i) => {
                    const isIn = item.type === 'checkin'
                    const accentColor = isIn ? '#4ade80' : '#fb923c'
                    const bgColor = isIn ? 'rgba(34,197,94,0.06)' : 'rgba(251,146,60,0.06)'
                    const borderColor = isIn ? 'rgba(34,197,94,0.25)' : 'rgba(251,146,60,0.25)'
                    return (
                        <div key={item.id}
                            className="flex gap-0 items-stretch animate-fade-in"
                            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            {/* Left color bar */}
                            <div style={{ width: '3px', background: accentColor, flexShrink: 0, opacity: 0.7 }} />

                            <div className="flex gap-2.5 items-start px-3 py-2.5 flex-1"
                                style={{ background: i === 0 ? bgColor : 'transparent' }}>
                                {/* Icon */}
                                <div className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
                                    {isIn
                                        ? <LogIn size={13} style={{ color: accentColor }} />
                                        : <LogOut size={13} style={{ color: accentColor }} />}
                                </div>

                                {/* Body */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs" style={{ color: accentColor }}>
                                            #{item.queue_number}
                                        </span>
                                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {item.member.lastName}, {item.member.firstName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className={`badge badge-${item.member.membership_type.toLowerCase()}`}
                                            style={{ fontSize: '9px', padding: '1px 5px' }}>
                                            {item.member.membership_type[0]}
                                        </span>
                                        {!isIn && item.status && (
                                            <span className={`badge badge-${item.status.toLowerCase()}`}
                                                style={{ fontSize: '9px', padding: '1px 5px' }}>
                                                {item.status}
                                            </span>
                                        )}
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {formatTimeAgo(item.timestamp)}
                                        </span>
                                        {item.by && (
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                · <span style={{ color: 'var(--text-secondary)' }}>{item.by.username}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function formatTimeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
