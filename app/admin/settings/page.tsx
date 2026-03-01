'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import {
    Settings, LogIn, LogOut, Trash2, Loader2, ShieldAlert,
    CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'

interface EventConfig {
    title: string
    checkinEnabled: boolean
    checkoutEnabled: boolean
}

export default function EventSettingsPage() {
    const [config, setConfig] = useState<EventConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [savingCheckin, setSavingCheckin] = useState(false)
    const [savingCheckout, setSavingCheckout] = useState(false)
    const [resetModal, setResetModal] = useState(false)
    const [resetPassword, setResetPassword] = useState('')
    const [resetError, setResetError] = useState('')
    const [resetting, setResetting] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/event')
            if (res.ok) setConfig(await res.json())
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    async function toggleCheckin() {
        if (!config) return
        setSavingCheckin(true)
        try {
            const res = await fetch('/api/admin/event', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkinEnabled: !config.checkinEnabled }),
            })
            if (res.ok) {
                const data = await res.json()
                setConfig(prev => prev ? { ...prev, checkinEnabled: data.checkinEnabled } : null)
            }
        } finally {
            setSavingCheckin(false)
        }
    }

    async function toggleCheckout() {
        if (!config) return
        setSavingCheckout(true)
        try {
            const res = await fetch('/api/admin/event', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkoutEnabled: !config.checkoutEnabled }),
            })
            if (res.ok) {
                const data = await res.json()
                setConfig(prev => prev ? { ...prev, checkoutEnabled: data.checkoutEnabled } : null)
            }
        } finally {
            setSavingCheckout(false)
        }
    }

    async function handleReset() {
        if (confirmText.toLowerCase() !== 'reset attendance') {
            setResetError('Please type "reset attendance" to confirm.')
            return
        }
        if (!resetPassword.trim()) {
            setResetError('Password is required.')
            return
        }
        setResetting(true)
        setResetError('')
        try {
            const res = await fetch('/api/admin/attendance/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resetPassword }),
            })
            const data = await res.json()
            if (!res.ok) {
                setResetError(data.error ?? 'Reset failed')
                return
            }
            setResetModal(false)
            setResetPassword('')
            setConfirmText('')
        } finally {
            setResetting(false)
        }
    }

    if (loading || !config) {
        return (
            <AppShell>
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings size={24} style={{ color: 'var(--accent)' }} />
                        Event Controls
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Activate check-in and check-out for staff. Reset attendance when starting a new event.
                    </p>
                </div>

                {/* ── Check-in / Check-out toggles ───────────────────── */}
                <div className="card p-6 space-y-6">
                    <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <LogIn size={18} /> Sign-in & Check-out
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <div>
                                <p className="font-semibold text-sm">Check-in / Event Sign-in</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    When enabled, staff and admin can check in members. When disabled, a modal is shown.
                                </p>
                            </div>
                            <button
                                onClick={toggleCheckin}
                                disabled={savingCheckin}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${config.checkinEnabled ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40' : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/30'}`}
                            >
                                {savingCheckin ? <Loader2 size={14} className="animate-spin" /> : config.checkinEnabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {config.checkinEnabled ? 'Active' : 'Inactive'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <div>
                                <p className="font-semibold text-sm">Check-out</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    When enabled, staff and admin can process check-outs. When disabled, checkout is blocked.
                                </p>
                            </div>
                            <button
                                onClick={toggleCheckout}
                                disabled={savingCheckout}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${config.checkoutEnabled ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40' : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/30'}`}
                            >
                                {savingCheckout ? <Loader2 size={14} className="animate-spin" /> : config.checkoutEnabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {config.checkoutEnabled ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Reset Attendance ───────────────────────────────── */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={20} style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base">Reset Attendance</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                Delete all attendance records. Use when starting a new event. Requires password confirmation.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg p-3 mb-4 text-xs flex items-start gap-2"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                        <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                        <span>This action cannot be undone. All check-in and check-out records will be permanently deleted.</span>
                    </div>

                    <button
                        onClick={() => setResetModal(true)}
                        className="btn w-full text-sm py-2.5"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                    >
                        <Trash2 size={15} /> Reset Attendance Table
                    </button>
                </div>
            </div>

            {/* ── Reset confirmation modal ───────────────────────────── */}
            {resetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                    onClick={() => !resetting && setResetModal(false)}>
                    <div className="card p-6 max-w-md w-full animate-slide-up"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert size={24} style={{ color: '#ef4444' }} />
                            <h3 className="font-bold text-lg">Confirm Reset</h3>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                            To reset the attendance table, enter your password and type <strong>reset attendance</strong> below.
                        </p>

                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                                    Your password
                                </label>
                                <input
                                    type="password"
                                    className="input w-full"
                                    placeholder="••••••••"
                                    value={resetPassword}
                                    onChange={e => { setResetPassword(e.target.value); setResetError('') }}
                                    autoComplete="current-password"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                                    Type &quot;reset attendance&quot; to confirm
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="reset attendance"
                                    value={confirmText}
                                    onChange={e => { setConfirmText(e.target.value); setResetError('') }}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {resetError && (
                            <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                <AlertTriangle size={16} /> {resetError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleReset}
                                disabled={resetting || !resetPassword || confirmText.toLowerCase() !== 'reset attendance'}
                                className="btn flex-1"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {resetting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                {resetting ? 'Resetting…' : 'Reset Attendance'}
                            </button>
                            <button
                                onClick={() => setResetModal(false)}
                                disabled={resetting}
                                className="btn btn-ghost flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    )
}
