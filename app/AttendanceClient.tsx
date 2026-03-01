'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '@/components/AppShell'
import {
    Search, CheckCircle, XCircle, AlertTriangle,
    ChevronRight, X, Loader2, Hash, ArrowLeft, RotateCcw,
    Clock, UserCheck, LogIn, LogOut, Users
} from 'lucide-react'
import type { FeedEvent } from '@/lib/attendance'

// ─── Types ────────────────────────────────────────────────────
interface Member {
    id: string; usccmpc_id: string; firstName: string; lastName: string
    middleName?: string; suffix?: string; membership_type: 'Regular' | 'Associate'
    email1?: string; contactNumber?: string; attendance: Attendance[]
}
interface Attendance {
    id: string; queue_number: number; checkin_at: string; checkout_at?: string
    status: 'Correct' | 'Lost' | 'Mismatch'
    claimed_by?: string | null
    stub_collected?: boolean
    checkin_by?: { username: string }; checkout_by?: { username: string }
}
type CheckoutState = 'choosing' | 'correct' | 'mismatch' | 'proxy' | 'lost'

// ─── Main Page ────────────────────────────────────────────────
interface EventConfig {
    checkinEnabled: boolean
    checkoutEnabled: boolean
}

export default function AttendanceClient({ initialRecent }: { initialRecent: FeedEvent[] }) {
    const { data: session } = useSession()
    const [query, setQuery] = useState('')
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
    const [recent, setRecent] = useState<FeedEvent[]>(initialRecent)
    const [eventConfig, setEventConfig] = useState<EventConfig>({ checkinEnabled: false, checkoutEnabled: false })

    const fetchEventConfig = useCallback(async () => {
        const res = await fetch('/api/event/config')
        if (res.ok) setEventConfig(await res.json())
    }, [])

    useEffect(() => {
        fetchEventConfig()
    }, [fetchEventConfig])

    const fetchRecent = useCallback(async () => {
        const res = await fetch('/api/attendance/recent')
        if (res.ok) setRecent(await res.json())
    }, [])

    useEffect(() => {
        const POLL_INTERVAL = 10000 // 10s when visible
        const HIDDEN_INTERVAL = 30000 // 30s when tab hidden
        let intervalId: ReturnType<typeof setInterval>
        const poll = () => {
            fetchRecent()
            fetchEventConfig()
        }
        const schedule = () => {
            const ms = document.hidden ? HIDDEN_INTERVAL : POLL_INTERVAL
            intervalId = setInterval(poll, ms)
        }
        poll()
        schedule()
        const onVisibilityChange = () => {
            clearInterval(intervalId)
            if (!document.hidden) poll()
            schedule()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
            clearInterval(intervalId)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [fetchRecent, fetchEventConfig])

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
                        <MemberPanel member={selectedMember} session={session} eventConfig={eventConfig}
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

// ─── Disabled block (modal-style) ─────────────────────────────
function DisabledBlock({ icon, title, message, onClose }: {
    icon: React.ReactNode; title: string; message: string; onClose: () => void
}) {
    return (
        <div className="card p-6 space-y-4 animate-slide-up"
            style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--warning)' }}>
                    {icon}
                </div>
                <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--warning)' }}>{title}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{message}</p>
                </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost w-full text-sm">
                <ArrowLeft size={14} /> Back to search
            </button>
        </div>
    )
}

// ─── Member Panel ─────────────────────────────────────────────
function MemberPanel({ member, session, eventConfig, onClose, onRefresh }: {
    member: Member; session: unknown; eventConfig: EventConfig; onClose: () => void; onRefresh: (id: string) => void
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

            {!attendance && !eventConfig.checkinEnabled && (
                <DisabledBlock
                    icon={<LogIn size={24} />}
                    title="Check-in / Event sign-in is not available"
                    message="Check-in has not been activated yet. Please wait for the admin to enable event sign-in in Event Controls."
                    onClose={onClose}
                />
            )}
            {!attendance && eventConfig.checkinEnabled && <CheckinForm member={member} onSuccess={() => onRefresh(member.id)} />}
            {isCheckedIn && !eventConfig.checkoutEnabled && (
                <DisabledBlock
                    icon={<LogOut size={24} />}
                    title="Check-out is not available"
                    message="Check-out has not been activated yet. Please wait for the admin to enable checkout in Event Controls."
                    onClose={onClose}
                />
            )}
            {isCheckedIn && eventConfig.checkoutEnabled && <CheckoutForm attendance={attendance} onSuccess={() => onRefresh(member.id)} />}
            {isCheckedOut && (() => {
                const isLost = attendance.status === 'Lost'
                const isMismatch = attendance.status === 'Mismatch'
                const isProxy = !!attendance.claimed_by
                const stubReturned = attendance.stub_collected !== false

                const banner = isLost
                    ? {
                        bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#f87171',
                        icon: '⚠️', title: 'STUB REPORTED LOST',
                        body: "This member's stub was not returned. If someone presents this stub number, verify carefully — it may have been misplaced or is fraudulent."
                    }
                    : isMismatch
                        ? {
                            bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.4)', color: '#fbbf24',
                            icon: '⚠️', title: 'STUB MISMATCH RECORDED',
                            body: 'Member checked out with a different stub number than expected (possible swap). See details below.'
                        }
                        : isProxy
                            ? {
                                bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.35)', color: '#60a5fa',
                                icon: '👤', title: 'CLAIMED BY PROXY',
                                body: `Stub was already claimed by ${attendance.claimed_by} on this member's behalf. Stub has been collected.`
                            }
                            : {
                                bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', color: 'var(--success)',
                                icon: '✓', title: 'STUB COLLECTED',
                                body: 'Member checked out normally and stub was returned.'
                            }

                return (
                    <div className="space-y-3 animate-slide-up">
                        <div className="rounded-xl p-4"
                            style={{ background: banner.bg, border: `1px solid ${banner.border}` }}>
                            <p className="font-bold text-sm mb-1" style={{ color: banner.color }}>
                                {banner.icon} {banner.title}
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: banner.color, opacity: 0.85 }}>
                                {banner.body}
                            </p>
                        </div>

                        <div className="card p-5 space-y-3">
                            <h3 className="font-semibold text-xs" style={{ color: 'var(--text-muted)' }}>ATTENDANCE RECORD</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <InfoRow label="Queue #" value={`#${attendance.queue_number}`} />
                                <InfoRow label="Status" value={<span className={`badge badge-${attendance.status.toLowerCase()}`}>{attendance.status}</span>} />
                                <InfoRow label="Checked in" value={new Date(attendance.checkin_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                                <InfoRow label="Checked out" value={new Date(attendance.checkout_at!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                                {attendance.checkin_by && <InfoRow label="By (in)" value={attendance.checkin_by.username} />}
                                {attendance.checkout_by && <InfoRow label="By (out)" value={attendance.checkout_by.username} />}
                                {attendance.claimed_by && <InfoRow label="Claimed by" value={
                                    <span className="font-semibold" style={{ color: '#60a5fa' }}>👤 {attendance.claimed_by}</span>
                                } />}
                                <InfoRow label="Stub" value={
                                    stubReturned
                                        ? <span className="badge badge-correct">Collected ✓</span>
                                        : <span className="badge badge-lost">Not Returned</span>
                                } />
                            </div>
                        </div>
                    </div>
                )
            })()}
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
    const [state, setState] = useState<CheckoutState>('choosing')
    const [mismatchNum, setMismatchNum] = useState('')
    const [claimedBy, setClaimedBy] = useState('')
    const [suggestions, setSuggestions] = useState<Member[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const mismatchRef = useRef<HTMLInputElement>(null)
    const claimedRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { if (state === 'mismatch') mismatchRef.current?.focus() }, [state])
    useEffect(() => { if (state === 'proxy') claimedRef.current?.focus() }, [state])

    function handleClaimedSearch(val: string) {
        setClaimedBy(val); setShowSuggestions(true)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!val.trim()) { setSuggestions([]); return }
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/members/search?q=${encodeURIComponent(val)}`)
            if (res.ok) setSuggestions(await res.json())
        }, 250)
    }

    async function submit(action: 'correct' | 'mismatch' | 'proxy' | 'lost', opts?: { numberGiven?: string; claimedBy?: string }) {
        setLoading(true); setError('')
        const body: Record<string, unknown> = { attendance_id: attendance.id, action }
        if (opts?.numberGiven) body.number_given = opts.numberGiven
        if (opts?.claimedBy) body.claimed_by = opts.claimedBy
        const res = await fetch('/api/attendance/checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        setLoading(false)
        if (res.ok) onSuccess()
        else { const d = await res.json(); setError(d.error ?? 'Failed') }
    }

    const CheckedInBadge = () => (
        <div className="card p-4 flex items-center justify-between gap-4"
            style={{ borderColor: 'rgba(58,140,74,0.3)', background: 'var(--accent-light)' }}>
            <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>CHECKED IN WITH TRAIL #</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>#{attendance.queue_number}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(attendance.checkin_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{attendance.checkin_by && ` · ${attendance.checkin_by.username}`}
                </p>
            </div>
            <span className="badge badge-checkedin">Present</span>
        </div>
    )

    if (state === 'choosing') return (
        <div className="space-y-3 animate-slide-up">
            <CheckedInBadge />
            <p className="text-xs font-bold px-1 pt-1" style={{ color: 'var(--text-muted)' }}>SELECT CHECKOUT TYPE</p>

            {([
                { key: 'correct', icon: <CheckCircle size={20} style={{ color: 'var(--success)' }} />, title: 'Correct Person, Correct Stub', desc: 'Member is present and presents their own stub — visual confirmation only' },
                { key: 'mismatch', icon: <XCircle size={20} style={{ color: 'var(--danger)' }} />, title: 'Correct Person, Wrong Stub', desc: 'Member insists it is their stub but number differs from record (possible swap)' },
                { key: 'proxy', icon: <Users size={20} style={{ color: '#60a5fa' }} />, title: 'Another Person Claiming', desc: 'Someone else is claiming on behalf of this member — enter who is claiming' },
                { key: 'lost', icon: <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />, title: 'Lost Stub', desc: 'Member cannot produce the stub — stub marked as not returned' },
            ] as const).map(opt => (
                <button key={opt.key} onClick={() => setState(opt.key)}
                    className="w-full card p-4 text-left transition-all hover:scale-[1.01]"
                    style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">{opt.icon}</div>
                        <div>
                            <p className="font-semibold text-sm">{opt.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                        </div>
                        <ChevronRight size={15} className="ml-auto shrink-0 self-center" style={{ color: 'var(--text-muted)' }} />
                    </div>
                </button>
            ))}
        </div>
    )

    if (state === 'correct') return (
        <div className="space-y-4 animate-slide-up">
            <CheckedInBadge />
            <div className="card p-5 space-y-4"
                style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
                <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--success)' }}>CORRECT PERSON · CORRECT STUB</h3>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Visually confirm the stub shows <strong style={{ color: 'var(--accent)' }}>#{attendance.queue_number}</strong> then confirm checkout.
                </p>
                {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                <div className="grid grid-cols-2 gap-3">
                    <button className="btn btn-primary" onClick={() => submit('correct')} disabled={loading}>
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} Confirm Checkout
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setState('choosing'); setError('') }} disabled={loading}>
                        <RotateCcw size={14} /> Back
                    </button>
                </div>
            </div>
        </div>
    )

    if (state === 'mismatch') return (
        <div className="space-y-4 animate-slide-up">
            <CheckedInBadge />
            <form onSubmit={e => { e.preventDefault(); if (mismatchNum) submit('mismatch', { numberGiven: mismatchNum }) }}
                className="card p-5 space-y-4"
                style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
                <div className="flex items-center gap-2">
                    <XCircle size={16} style={{ color: 'var(--danger)' }} />
                    <h3 className="font-semibold text-sm" style={{ color: '#f87171' }}>MISMATCH — CLAIMING OWN STUB</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="text-center">
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Expected</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>#{attendance.queue_number}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Presented</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>{mismatchNum ? `#${mismatchNum}` : '?'}</p>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#f87171' }}>NUMBER ON THEIR STUB (REQUIRED)</label>
                    <input ref={mismatchRef} className="input text-2xl text-center font-bold"
                        style={{ height: '60px', borderColor: 'rgba(239,68,68,0.4)' }}
                        type="number" min="1" placeholder="—" value={mismatchNum}
                        onChange={e => setMismatchNum(e.target.value)} required />
                </div>
                {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                <div className="grid grid-cols-2 gap-3">
                    <button type="submit" className="btn btn-danger" disabled={loading || !mismatchNum}>
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        <AlertTriangle size={15} /> Record Mismatch
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => { setState('choosing'); setError('') }} disabled={loading}>
                        <RotateCcw size={14} /> Back
                    </button>
                </div>
            </form>
        </div>
    )

    if (state === 'proxy') return (
        <div className="space-y-4 animate-slide-up">
            <CheckedInBadge />
            <div className="card p-5 space-y-4"
                style={{ borderColor: 'rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.04)' }}>
                <div className="flex items-center gap-2">
                    <Users size={16} style={{ color: '#60a5fa' }} />
                    <h3 className="font-semibold text-sm" style={{ color: '#60a5fa' }}>PROXY CLAIM — ANOTHER PERSON CLAIMING</h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Search for the member claiming on behalf, or type their name if not in the system.
                </p>
                <div className="relative">
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#93c5fd' }}>CLAIMED BY (REQUIRED)</label>
                    <input ref={claimedRef} className="input text-sm"
                        placeholder="Type name to search members…"
                        value={claimedBy}
                        onChange={e => handleClaimedSearch(e.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onFocus={() => claimedBy && setShowSuggestions(true)}
                        autoComplete="off" />
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 z-30 mt-1 card overflow-hidden shadow-lg"
                            style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {suggestions.map(m => (
                                <li key={m.id}>
                                    <button type="button"
                                        className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                                        style={{ borderBottom: '1px solid var(--border)' }}
                                        onMouseDown={() => {
                                            const full = `${m.lastName}, ${m.firstName}${m.middleName ? ' ' + m.middleName : ''}${m.suffix ? ' ' + m.suffix : ''}`
                                            setClaimedBy(full.trim())
                                            setSuggestions([]); setShowSuggestions(false)
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <span className="font-semibold">{m.lastName}, {m.firstName}</span>
                                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{m.usccmpc_id}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                <div className="grid grid-cols-2 gap-3">
                    <button className="btn" disabled={loading || !claimedBy.trim()}
                        style={{ background: '#3b82f6', color: '#fff' }}
                        onClick={() => submit('proxy', { claimedBy: claimedBy.trim() })}>
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
                        Confirm Proxy Checkout
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setState('choosing'); setError('') }} disabled={loading}>
                        <RotateCcw size={14} /> Back
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-4 animate-slide-up">
            <CheckedInBadge />
            <div className="card p-5 space-y-4"
                style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--warning)' }}>LOST STUB</h3>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Member cannot produce the stub. Stub will be marked as <strong style={{ color: 'var(--warning)' }}>not returned</strong>.
                </p>
                {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                <div className="grid grid-cols-2 gap-3">
                    <button className="btn btn-warning" onClick={() => submit('lost')} disabled={loading}>
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                        Confirm Lost
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setState('choosing'); setError('') }} disabled={loading}>
                        <RotateCcw size={14} /> Back
                    </button>
                </div>
            </div>
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

function RecentPanel({ items }: { items: FeedEvent[] }) {
    const checkins = items.filter(e => e.type === 'checkin').length
    const checkouts = items.filter(e => e.type === 'checkout').length

    return (
        <div className="sticky top-20">
            <div className="flex items-center gap-2 mb-3">
                <UserCheck size={15} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Activity Feed</h2>
            </div>

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
                    return (
                        <div key={item.id}
                            className="flex gap-0 items-stretch animate-fade-in"
                            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ width: '3px', background: accentColor, flexShrink: 0, opacity: 0.7 }} />

                            <div className="flex gap-2.5 items-start px-3 py-2.5 flex-1"
                                style={{ background: i === 0 ? bgColor : 'transparent' }}>
                                <div className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
                                    {isIn ? <LogIn size={13} style={{ color: accentColor }} /> : <LogOut size={13} style={{ color: accentColor }} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs" style={{ color: accentColor }}>#{item.queue_number}</span>
                                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {item.member.lastName}, {item.member.firstName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className={`badge badge-${item.member.membership_type.toLowerCase()}`}
                                            style={{ fontSize: '9px', padding: '1px 5px' }}>{item.member.membership_type[0]}</span>
                                        {!isIn && item.status && (
                                            <span className={`badge badge-${item.status.toLowerCase()}`}
                                                style={{ fontSize: '9px', padding: '1px 5px' }}>{item.status}</span>
                                        )}
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <TimeAgo dateStr={item.timestamp} />
                                        </span>
                                        {item.by && (
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                · <span style={{ color: 'var(--text-secondary)' }}>{item.by.username}</span>
                                            </span>
                                        )}
                                    </div>
                                    {!isIn && item.claimed_by && (
                                        <div className="mt-1 text-xs flex items-center gap-1" style={{ color: '#60a5fa' }}>
                                            <span>👤</span>
                                            <span className="font-semibold truncate">{item.claimed_by}</span>
                                        </div>
                                    )}
                                    {!isIn && item.stub_collected === false && (
                                        <div className="mt-0.5 text-xs" style={{ color: '#f87171' }}>⚠ stub not returned</div>
                                    )}
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
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/** Renders relative time only after mount to avoid hydration mismatch (Date.now differs server vs client) */
function TimeAgo({ dateStr }: { dateStr: string }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])
    if (!mounted) return <span>—</span>
    return <>{formatTimeAgo(dateStr)}</>
}
