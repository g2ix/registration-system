'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeContext'
import { User, Lock, Loader2, Sun, Moon } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const { theme, toggle } = useTheme()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(''); setLoading(true)

        const result = await signIn('credentials', { username, password, redirect: false })
        setLoading(false)

        if (result?.error) {
            setError('Invalid username or password')
        } else {
            const sessionRes = await fetch('/api/auth/session')
            const sessionData = await sessionRes.json()
            const role = sessionData?.user?.role
            router.push(role === 'ELECTION' ? '/election' : '/')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg-primary)' }}>
            {/* Background decoration */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(58,140,74,0.18) 0%, transparent 70%)',
            }} />

            {/* Theme toggle top-right */}
            <button onClick={toggle} className="btn btn-ghost fixed top-4 right-4 py-2 px-2 text-xs" title="Toggle theme" style={{ zIndex: 10 }}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="w-full max-w-sm animate-slide-up relative z-10">
                {/* ── Logo (centered) ─────────────────────────── */}
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="USC and Community Multipurpose Cooperative"
                        style={{ height: '90px', width: 'auto', objectFit: 'contain', margin: '0 auto 16px' }}
                    />
                    <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        USC & Community MPC
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Attendance System
                    </p>
                </div>

                {/* ── Login Card ──────────────────────────────── */}
                <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                            USERNAME
                        </label>
                        <div className="relative">
                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            <input
                                className="input pl-9" type="text" placeholder="Enter username"
                                value={username} onChange={e => setUsername(e.target.value)}
                                autoComplete="username" autoFocus required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                            PASSWORD
                        </label>
                        <div className="relative">
                            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            <input
                                className="input pl-9" type="password" placeholder="Enter password"
                                value={password} onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password" required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm p-3 rounded-lg animate-fade-in"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '4px' }} disabled={loading}>
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                    Air-gapped · All data stored locally
                </p>
            </div>
        </div>
    )
}
