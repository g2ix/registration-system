'use client'

import { useCallback, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Loader2, Ticket, Trophy } from 'lucide-react'

interface Participant {
    id: string
    name: string
    usccmpc_id: string
    queue_number: number
}

interface Winner {
    id: string
    place?: number
    name: string
    usccmpc_id: string
    drawn_at: string
}

export default function RafflePage() {
    const [participants, setParticipants] = useState<Participant[]>([])
    const [winners, setWinners] = useState<Winner[]>([])
    const [loading, setLoading] = useState(true)
    const [drawing, setDrawing] = useState(false)
    const [displayName, setDisplayName] = useState('Ready to draw')
    const [revealed, setRevealed] = useState<Winner | null>(null)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        const res = await fetch('/api/raffle')
        if (!res.ok) {
            setError('Could not load the raffle.')
            setLoading(false)
            return
        }
        const data = await res.json()
        setParticipants(data.participants)
        setWinners(data.winners)
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    async function draw() {
        if (drawing || participants.length === 0) return
        setDrawing(true)
        setRevealed(null)
        setError('')

        const res = await fetch('/api/raffle', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) {
            setError(data.error ?? 'Draw failed')
            setDrawing(false)
            return
        }

        const names: string[] = data.names.length ? data.names : [data.winner.name]
        const steps = [70, 70, 80, 90, 110, 140, 180, 230, 300, 420, 560]
        for (let i = 0; i < steps.length; i++) {
            const name = i === steps.length - 1
                ? data.winner.name
                : names[Math.floor(Math.random() * names.length)]
            setDisplayName(name)
            await wait(steps[i])
        }

        setRevealed(data.winner)
        setDrawing(false)
        await load()
    }

    return (
        <AppShell wide>
            <div className="raffle-layout">
                <section className="raffle-stage">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Ticket size={22} style={{ color: '#fbbf24' }} />
                            <p className="text-sm font-semibold tracking-wide" style={{ color: '#fbbf24' }}>RAFFLE DRAW</p>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {participants.length} participant{participants.length === 1 ? '' : 's'} left
                        </p>
                    </div>
                    <div className={`raffle-window${drawing ? ' is-spinning' : ''}${revealed ? ' is-winner' : ''}`}>
                        <p className="raffle-name">{displayName}</p>
                    </div>
                    <p className="raffle-error">{error}</p>
                    <button className="btn btn-primary raffle-draw-btn" onClick={draw} disabled={drawing || loading || participants.length === 0}>
                        {drawing ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />}
                        {drawing ? 'Drawing…' : participants.length === 0 ? 'No participants left' : 'Draw'}
                    </button>
                </section>

                <section className="raffle-board card">
                    <div className="raffle-board-head">
                        <Trophy size={20} style={{ color: '#fbbf24' }} />
                        <h2 className="font-semibold text-lg">Winner board</h2>
                    </div>
                    <div className="raffle-board-list">
                        {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}
                        {!loading && winners.length === 0 && (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Winners will appear here after each draw.</p>
                        )}
                        <ol className="space-y-2">
                            {winners.map(winner => (
                                <li key={winner.id} className={`raffle-winner${revealed?.id === winner.id ? ' is-new' : ''}`}>
                                    <span className="raffle-place">#{winner.place}</span>
                                    <span className="min-w-0">
                                        <span className="block font-semibold truncate">{winner.name}</span>
                                        <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{winner.usccmpc_id}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>
            </div>
        </AppShell>
    )
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
