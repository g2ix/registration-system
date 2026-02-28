'use client'
import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeContext'
import {
    LayoutDashboard, Users, Upload, ClipboardList, Vote,
    Sun, Moon, Menu, X, ChevronDown, LogOut, Settings,
    Shield, User, BarChart3, UserCheck, DatabaseBackup
} from 'lucide-react'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    roles: string[]
}

const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Attendance', icon: <Users size={16} />, roles: ['ADMIN', 'STAFF', 'ELECTION'] },
    { href: '/admin', label: 'Dashboard', icon: <BarChart3 size={16} />, roles: ['ADMIN'] },
    { href: '/admin/upload', label: 'Upload Members', icon: <Upload size={16} />, roles: ['ADMIN'] },
    { href: '/admin/members', label: 'Member Management', icon: <UserCheck size={16} />, roles: ['ADMIN'] },
    { href: '/admin/users', label: 'User Management', icon: <Shield size={16} />, roles: ['ADMIN'] },
    { href: '/admin/logs', label: 'Audit Log', icon: <ClipboardList size={16} />, roles: ['ADMIN'] },
    { href: '/admin/data', label: 'Data & Backup', icon: <DatabaseBackup size={16} />, roles: ['ADMIN'] },
    { href: '/election', label: 'Election Panel', icon: <Vote size={16} />, roles: ['ADMIN', 'ELECTION'] },
]

const ROLE_BADGE: Record<string, string> = {
    ADMIN: 'badge-admin',
    STAFF: 'badge-staff',
    ELECTION: 'badge-election',
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const pathname = usePathname()
    const { theme, toggle } = useTheme()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const role = (session?.user as any)?.role ?? ''
    const username = session?.user?.name ?? ''

    const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <div className="app-layout">
            {/* ── Sidebar ─────────────────────────────────────────── */}
            <aside className={`app-sidebar${sidebarOpen ? '' : ' app-sidebar-collapsed'}`}>
                {/* Logo area */}
                <div className="px-4 py-5 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <img src="/logo.png" alt="USCCMPC" style={{ height: '36px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                    </div>
                    <button onClick={() => setSidebarOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                        style={{ color: 'rgba(255,255,255,0.6)' }}>
                        <X size={15} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 py-3 overflow-y-auto">
                    {visibleNav.map(item => {
                        const isActive = pathname === item.href
                        return (
                            <a key={item.href} href={item.href} className={`nav-link${isActive ? ' active' : ''}`}>
                                {item.icon}
                                <span>{item.label}</span>
                            </a>
                        )
                    })}
                </nav>

                {/* Theme toggle at bottom */}
                <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                        <button onClick={toggle}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.65)' }}
                            title="Toggle theme">
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────── */}
            <div className={`app-main${sidebarOpen ? '' : ' app-main-full'}`}>
                {/* Top bar */}
                <header className="app-topbar">
                    <div className="flex items-center gap-3">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)}
                                className="btn btn-ghost py-1.5 px-2 text-xs" title="Open sidebar">
                                <Menu size={16} />
                            </button>
                        )}
                        <div className="live-dot" />
                    </div>

                    {/* Right: user info + dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(o => !o)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <span className={`badge ${ROLE_BADGE[role] ?? 'badge-staff'}`} style={{ fontSize: '10px' }}>
                                {role === 'ADMIN' && <Shield size={10} />}
                                {role === 'ELECTION' && <Vote size={10} />}
                                {role === 'STAFF' && <User size={10} />}
                                {role}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{username}</span>
                            <ChevronDown size={13} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--text-muted)' }} />
                        </button>

                        {dropdownOpen && (
                            <div className="user-dropdown">
                                <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{username}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{role}</p>
                                </div>
                                <button className="dropdown-item" onClick={toggle}>
                                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                </button>
                                <button className="dropdown-item danger" onClick={() => signOut({ callbackUrl: '/login' })}>
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <div className="app-content animate-fade-in">
                    {children}
                </div>
            </div>
        </div>
    )
}
