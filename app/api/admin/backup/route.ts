import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [members, attendance, eventConfig] = await Promise.all([
        prisma.member.findMany({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] }),
        prisma.attendance.findMany({
            include: {
                member: { select: { usccmpc_id: true, firstName: true, lastName: true, middleName: true, suffix: true, membership_type: true } },
                checkin_by: { select: { username: true } },
                checkout_by: { select: { username: true } },
            },
            orderBy: { checkin_at: 'asc' },
        }),
        prisma.eventConfig.findFirst(),
    ])

    const backup = {
        meta: {
            app: 'USCCMPC Attendance System',
            version: '1.0',
            exported_at: new Date().toISOString(),
            event_title: eventConfig?.title ?? 'USCCMPC Event',
        },
        members,
        attendance,
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="usccmpc_backup_${new Date().toISOString().slice(0, 10)}.json"`,
        },
    })
}
