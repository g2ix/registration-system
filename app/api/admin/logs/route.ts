import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const logs = await prisma.attendance.findMany({
        orderBy: { checkin_at: 'desc' },
        include: {
            member: {
                select: {
                    usccmpc_id: true,
                    firstName: true,
                    lastName: true,
                    membership_type: true,
                },
            },
            checkin_by: { select: { username: true } },
            checkout_by: { select: { username: true } },
        },
        take: 500,
    })

    return NextResponse.json(logs)
}
