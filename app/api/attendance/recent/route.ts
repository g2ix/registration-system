import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    // Fetch recent attendance with both check-in and check-out data
    const records = await prisma.attendance.findMany({
        orderBy: { checkin_at: 'desc' },
        take: 60,
        include: {
            member: { select: { firstName: true, lastName: true, membership_type: true } },
            checkin_by: { select: { username: true } },
            checkout_by: { select: { username: true } },
        },
    })

    // Flatten into a unified timeline of events
    type FeedEvent = {
        id: string
        type: 'checkin' | 'checkout'
        timestamp: string
        queue_number: number
        member: { firstName: string; lastName: string; membership_type: string }
        by?: { username: string } | null
        status?: string
    }

    const events: FeedEvent[] = []

    for (const r of records) {
        events.push({
            id: `in-${r.id}`,
            type: 'checkin',
            timestamp: r.checkin_at.toISOString(),
            queue_number: r.queue_number,
            member: r.member,
            by: r.checkin_by,
        })
        if (r.checkout_at) {
            events.push({
                id: `out-${r.id}`,
                type: 'checkout',
                timestamp: r.checkout_at.toISOString(),
                queue_number: r.queue_number,
                member: r.member,
                by: r.checkout_by,
                status: r.status,
            })
        }
    }

    // Sort newest first, return top 40
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(events.slice(0, 40))
}
