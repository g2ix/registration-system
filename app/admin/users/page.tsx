'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import { useSession } from 'next-auth/react'
import {
    Users, Plus, Edit3, Trash2, Save, X, Loader2,
    Shield, User, Vote, Eye, EyeOff, RefreshCw, KeyRound
} from 'lucide-react'

interface SystemUser {
    id: string; username: string; role: 'ADMIN' | 'STAFF' | 'ELECTION'
    createdAt: string; _count: { checkins: number; checkouts: number }
}

const ROLES = ['ADMIN', 'STAFF', 'ELECTION'] as const
const ROLE_ICONS: Record<string, React.ReactNode> = {
    ADMIN: <Shield size={12} />,
    STAFF: <User size={12} />,
    ELECTION: <Vote size={12} />,
}

const emptyForm = { username: '', password: '', role: 'STAFF' as typeof ROLES[number] }

export default function UsersPage() {
    const { data: session } = useSession()
    const me = (session?.user as any)?.id

    const [users, setUsers] = useState<SystemUser[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editUser, setEditUser] = useState<SystemUser | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [showPw, setShowPw] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [confirmDelete, setConfirmDelete] = useState<SystemUser | null>(null)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/users')
        if (res.ok) setUsers(await res.json())
        setLoading(false)
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    function openAdd() { setForm(emptyForm); setEditUser(null); setError(''); setShowForm(true) }
    function openEdit(u: SystemUser) {
        setForm({ username: u.username, password: '', role: u.role })
        setEditUser(u); setError(''); setShowForm(true)
    }
    function closeForm() { setShowForm(false); setEditUser(null); setError('') }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault(); setSaving(true); setError('')
        try {
            const payload: any = { username: form.username, role: form.role }
            if (form.password) payload.password = form.password

            const res = editUser
                ? await fetch(`/api/admin/users/${editUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                : await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password: form.password }) })

            if (!res.ok) { const d = await res.json(); setError(d.error); return }
            closeForm(); fetchUsers()
        } finally { setSaving(false) }
    }

    async function handleDelete(u: SystemUser) {
        setDeletingId(u.id)
        const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json(); alert(d.error) }
        else { fetchUsers() }
        setDeletingId(null); setConfirmDelete(null)
    }

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">User Management</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage system accounts (Admin, Staff, Election)</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-ghost py-2 px-2 text-xs" onClick={fetchUsers}><RefreshCw size={13} /></button>
                        <button className="btn btn-primary text-sm py-2" onClick={openAdd}><Plus size={15} /> Add User</button>
                    </div>
                </div>

                {/* Add/Edit Form */}
                {showForm && (
                    <div className="card p-5 mb-5 animate-slide-up" style={{ borderColor: 'var(--border-focus)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold">{editUser ? `Edit — ${editUser.username}` : 'New User'}</h2>
                            <button className="btn btn-ghost p-1.5" style={{ minWidth: 0 }} onClick={closeForm}><X size={15} /></button>
                        </div>
                        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>USERNAME</label>
                                <input className="input text-sm" placeholder="e.g. staff2" value={form.username}
                                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    {editUser ? 'NEW PASSWORD (leave blank to keep)' : 'PASSWORD'}
                                </label>
                                <div className="relative">
                                    <input className="input text-sm pr-9" type={showPw ? 'text' : 'password'}
                                        placeholder={editUser ? '(unchanged)' : 'Min 6 chars'}
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        required={!editUser} minLength={editUser ? 0 : 6} />
                                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2"
                                        style={{ color: 'var(--text-muted)' }} onClick={() => setShowPw(v => !v)}>
                                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>ROLE</label>
                                <select className="input text-sm" value={form.role}
                                    onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            {error && <p className="col-span-full text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                            <div className="col-span-full flex gap-2 justify-end">
                                <button type="button" className="btn btn-ghost text-sm py-2" onClick={closeForm}>Cancel</button>
                                <button type="submit" className="btn btn-primary text-sm py-2" disabled={saving}>
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    {editUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users table */}
                {loading ? (
                    <div className="flex justify-center py-20" style={{ color: 'var(--text-muted)' }}><Loader2 className="animate-spin mr-2" /> Loading…</div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                                    {['Username', 'Role', 'Check-ins', 'Check-outs', 'Created', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="px-4 py-3 font-semibold">
                                            {u.username}{u.id === me && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>(you)</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge badge-${u.role.toLowerCase()}`}>{ROLE_ICONS[u.role]} {u.role}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center" style={{ color: 'var(--text-secondary)' }}>{u._count.checkins}</td>
                                        <td className="px-4 py-3 text-center" style={{ color: 'var(--text-secondary)' }}>{u._count.checkouts}</td>
                                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => openEdit(u)} title="Edit">
                                                    <Edit3 size={13} /> Edit
                                                </button>
                                                {u.id !== me && (
                                                    <button className="btn btn-ghost py-1 px-2 text-xs" style={{ color: 'var(--danger)' }}
                                                        onClick={() => setConfirmDelete(u)} disabled={deletingId === u.id} title="Delete">
                                                        {deletingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Delete confirm */}
                {confirmDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                        <div className="card p-6 w-full max-w-sm animate-slide-up">
                            <h3 className="font-bold text-lg mb-2">Delete User</h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                Are you sure you want to delete <strong>{confirmDelete.username}</strong>? This cannot be undone.
                            </p>
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
