import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: all checked-in Regular members with their voted status + total Regular count
export async function GET() {
    const [members, totalRegular] = await Promise.all([
        prisma.member.findMany({
            where: {
                membership_type: 'Regular',
                attendance: { some: {} },
            },
            include: {
                attendance: {
                    orderBy: { checkin_at: 'desc' },
                    take: 1,
                    include: {
                        checkin_by: { select: { username: true } },
                        checkout_by: { select: { username: true } },
                    },
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        }),
        prisma.member.count({ where: { membership_type: 'Regular' } }),
    ])

    return NextResponse.json({ members, totalRegular })
}

// POST: toggle voted status for a member
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session.user as any).role
    if (role !== 'ELECTION' && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { member_id, voted } = await req.json()
    if (!member_id || voted === undefined) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const updated = await prisma.member.update({
        where: { id: member_id },
        data: {
            voted: voted,
            voted_at: voted ? new Date() : null,
        },
    })

    return NextResponse.json(updated)
}
