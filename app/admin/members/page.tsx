'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import { Plus, Edit3, Trash2, Save, X, Loader2, Search, RefreshCw, UserCheck } from 'lucide-react'

interface Member {
    id: string; usccmpc_id: string; firstName: string; lastName: string
    middleName?: string; suffix?: string; membership_type: 'Regular' | 'Associate'
    email1?: string; email2?: string; contactNumber?: string
    voted: boolean; createdAt: string; _count: { attendance: number }
}

const emptyForm = {
    usccmpc_id: '', firstName: '', lastName: '', middleName: '', suffix: '',
    membership_type: 'Regular' as 'Regular' | 'Associate',
    email1: '', email2: '', contactNumber: '',
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [showForm, setShowForm] = useState(false)
    const [editMember, setEditMember] = useState<Member | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [confirmDelete, setConfirmDelete] = useState<Member | null>(null)

    const fetchMembers = useCallback(async (q = search, p = page) => {
        setLoading(true)
        const res = await fetch(`/api/admin/members?q=${encodeURIComponent(q)}&page=${p}`)
        if (res.ok) {
            const data = await res.json()
            setMembers(data.members)
            setTotal(data.total)
            setTotalPages(data.totalPages)
            setPage(data.page)
        }
        setLoading(false)
    }, [search, page])

    useEffect(() => { fetchMembers(search, page) }, [search, page])  // eslint-disable-line

    function f(key: keyof typeof emptyForm, val: string) { setForm(p => ({ ...p, [key]: val })) }

    function openAdd() { setForm(emptyForm); setEditMember(null); setError(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    function openEdit(m: Member) {
        setForm({
            usccmpc_id: m.usccmpc_id, firstName: m.firstName, lastName: m.lastName,
            middleName: m.middleName ?? '', suffix: m.suffix ?? '',
            membership_type: m.membership_type,
            email1: m.email1 ?? '', email2: m.email2 ?? '', contactNumber: m.contactNumber ?? '',
        })
        setEditMember(m); setError(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    function closeForm() { setShowForm(false); setEditMember(null); setError('') }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault(); setSaving(true); setError('')
        try {
            const res = editMember
                ? await fetch(`/api/admin/members/${editMember.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
                : await fetch('/api/admin/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (!res.ok) { const d = await res.json(); setError(d.error); return }
            closeForm(); fetchMembers(search, 1); setPage(1)
        } finally { setSaving(false) }
    }

    async function handleDelete(m: Member) {
        setDeletingId(m.id)
        const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json(); alert(d.error) }
        else fetchMembers(search, page)
        setDeletingId(null); setConfirmDelete(null)
    }

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto">
                <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold">Member Management</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Add, edit, or remove individual members</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-ghost py-2 px-2 text-xs" onClick={() => fetchMembers()}><RefreshCw size={13} /></button>
                        <button className="btn btn-primary text-sm py-2" onClick={openAdd}><Plus size={14} /> Add Member</button>
                    </div>
                </div>

                {/* Add/Edit Form */}
                {showForm && (
                    <div className="card p-5 mb-5 animate-slide-up" style={{ borderColor: 'var(--border-focus)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold">{editMember ? `Edit — ${editMember.lastName}, ${editMember.firstName}` : 'New Member'}</h2>
                            <button className="btn btn-ghost p-1.5" style={{ minWidth: 0 }} onClick={closeForm}><X size={15} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                                <Field label="USCCMPC ID *" value={form.usccmpc_id} onChange={v => f('usccmpc_id', v)} required placeholder="e.g. USCC-0001" />
                                <Field label="LAST NAME *" value={form.lastName} onChange={v => f('lastName', v)} required placeholder="Dela Cruz" />
                                <Field label="FIRST NAME *" value={form.firstName} onChange={v => f('firstName', v)} required placeholder="Juan" />
                                <Field label="MIDDLE NAME" value={form.middleName} onChange={v => f('middleName', v)} placeholder="Santos" />
                                <Field label="SUFFIX" value={form.suffix} onChange={v => f('suffix', v)} placeholder="Jr., Sr., III" />
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>MEMBERSHIP TYPE *</label>
                                    <select className="input text-sm" value={form.membership_type} onChange={e => f('membership_type', e.target.value as any)} required>
                                        <option value="Regular">Regular</option>
                                        <option value="Associate">Associate</option>
                                    </select>
                                </div>
                                <Field label="EMAIL 1" value={form.email1} onChange={v => f('email1', v)} type="email" placeholder="juan@email.com" />
                                <Field label="EMAIL 2" value={form.email2} onChange={v => f('email2', v)} type="email" placeholder="Optional" />
                                <Field label="CONTACT NO." value={form.contactNumber} onChange={v => f('contactNumber', v)} placeholder="+63 9XX XXX XXXX" />
                            </div>
                            {error && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}
                            <div className="flex gap-2 justify-end">
                                <button type="button" className="btn btn-ghost text-sm py-2" onClick={closeForm}>Cancel</button>
                                <button type="submit" className="btn btn-primary text-sm py-2" disabled={saving}>
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    {editMember ? 'Save Changes' : 'Create Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input className="input pl-9 text-sm" placeholder="Search name or USCCMPC ID…"
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                </div>

                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {total} member{total !== 1 ? 's' : ''} · page {page} of {totalPages}
                    </p>
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
                                        {['USCCMPC ID', 'Name', 'Type', 'Contact', 'Attendance', 'Voted', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.length === 0 && (
                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No members found.</td></tr>
                                    )}
                                    {members.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{m.usccmpc_id}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold whitespace-nowrap">{m.lastName}, {m.firstName} {m.middleName ?? ''} {m.suffix ?? ''}</p>
                                            </td>
                                            <td className="px-4 py-3"><span className={`badge badge-${m.membership_type.toLowerCase()}`}>{m.membership_type}</span></td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{m.contactNumber ?? '—'}</td>
                                            <td className="px-4 py-3 text-center font-semibold" style={{ color: m._count.attendance > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                {m._count.attendance}
                                            </td>
                                            <td className="px-4 py-3">
                                                {m.voted
                                                    ? <span className="badge badge-correct" style={{ fontSize: '10px' }}><UserCheck size={10} /> Yes</span>
                                                    : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => openEdit(m)} title="Edit"><Edit3 size={13} /> Edit</button>
                                                    <button className="btn btn-ghost py-1 px-2 text-xs" style={{ color: 'var(--danger)' }}
                                                        onClick={() => setConfirmDelete(m)} disabled={deletingId === m.id} title="Delete">
                                                        {deletingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <button className="btn btn-ghost py-1.5 px-3 text-xs" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                        <button className="btn btn-ghost py-1.5 px-3 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                                    acc.push(p); return acc
                                }, [])
                                .map((p, i) => p === '…'
                                    ? <span key={`e${i}`} className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
                                    : <button key={p} onClick={() => setPage(p as number)}
                                        className="w-8 h-8 rounded-lg text-xs font-semibold transition-colors"
                                        style={{ background: page === p ? 'var(--accent)' : 'var(--bg-card)', color: page === p ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                        {p}
                                    </button>
                                )}
                        </div>
                        <button className="btn btn-ghost py-1.5 px-3 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
                        <button className="btn btn-ghost py-1.5 px-3 text-xs" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                    </div>
                )}

                {/* Delete confirm */}
                {confirmDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                        <div className="card p-6 w-full max-w-sm animate-slide-up">
                            <h3 className="font-bold text-lg mb-2">Delete Member</h3>
                            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Delete <strong>{confirmDelete.lastName}, {confirmDelete.firstName}</strong>?
                            </p>
                            {confirmDelete._count.attendance > 0 && (
                                <p className="text-xs p-2 rounded mb-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                                    ⚠ This member has {confirmDelete._count.attendance} attendance record(s). Deletion will be blocked.
                                </p>
                            )}
                            <div className="flex gap-3 justify-end">
                                <button className="btn btn-ghost text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                                <button className="btn btn-danger text-sm" onClick={() => handleDelete(confirmDelete)}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}

function Field({ label, value, onChange, required, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void;
    required?: boolean; placeholder?: string; type?: string
}) {
    return (
        <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
            <input className="input text-sm" type={type} value={value} onChange={e => onChange(e.target.value)}
                required={required} placeholder={placeholder} />
        </div>
    )
}
