import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomInt } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function canDraw(role: string | undefined) {
    return role === 'MANAGER' || role === 'ADMIN'
}

function displayName(member: { lastName: string; firstName: string; middleName?: string | null; suffix?: string | null }) {
    return [member.lastName + ',', member.firstName, member.middleName, member.suffix].filter(Boolean).join(' ')
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!canDraw((session?.user as { role?: string } | undefined)?.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [eligible, winners] = await Promise.all([
        prisma.attendance.findMany({
            where: { raffle_eligible: true },
            include: {
                member: { select: { id: true, firstName: true, lastName: true, middleName: true, suffix: true, usccmpc_id: true } },
            },
            orderBy: { checkin_at: 'asc' },
        }),
        prisma.raffleWinner.findMany({
            orderBy: { drawn_at: 'desc' },
            include: {
                member: { select: { id: true, firstName: true, lastName: true, middleName: true, suffix: true, usccmpc_id: true } },
            },
        }),
    ])

    const wonIds = new Set(winners.map(winner => winner.member_id))
    const seen = new Set<string>()
    const participants = []
    for (const row of eligible) {
        if (wonIds.has(row.member_id) || seen.has(row.member_id)) continue
        seen.add(row.member_id)
        participants.push({
            id: row.member.id,
            name: displayName(row.member),
            usccmpc_id: row.member.usccmpc_id,
            queue_number: row.queue_number,
        })
    }

    return NextResponse.json({
        participants,
        winners: winners.map((winner, index) => ({
            id: winner.id,
            place: winners.length - index,
            name: displayName(winner.member),
            usccmpc_id: winner.member.usccmpc_id,
            drawn_at: winner.drawn_at.toISOString(),
        })),
    })
}

export async function POST() {
    const session = await getServerSession(authOptions)
    const user = session?.user as { id?: string; role?: string } | undefined
    if (!canDraw(user?.role) || !user?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [eligible, winners] = await Promise.all([
        prisma.attendance.findMany({
            where: { raffle_eligible: true },
            include: {
                member: { select: { id: true, firstName: true, lastName: true, middleName: true, suffix: true, usccmpc_id: true } },
            },
        }),
        prisma.raffleWinner.findMany({ select: { member_id: true } }),
    ])

    const wonIds = new Set(winners.map(winner => winner.member_id))
    const pool = new Map<string, { id: string; name: string; usccmpc_id: string }>()
    for (const row of eligible) {
        if (wonIds.has(row.member_id) || pool.has(row.member_id)) continue
        pool.set(row.member_id, {
            id: row.member.id,
            name: displayName(row.member),
            usccmpc_id: row.member.usccmpc_id,
        })
    }

    const participants = [...pool.values()]
    if (participants.length === 0) {
        return NextResponse.json({ error: 'No raffle participants left to draw' }, { status: 409 })
    }

    const picked = participants[randomInt(participants.length)]
    const winner = await prisma.raffleWinner.create({
        data: { member_id: picked.id, drawn_by_id: user.id },
    })

    return NextResponse.json({
        winner: {
            id: winner.id,
            name: picked.name,
            usccmpc_id: picked.usccmpc_id,
            drawn_at: winner.drawn_at.toISOString(),
        },
        names: participants.map(person => person.name),
    })
}
