import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const EXPORT_BATCH_SIZE = 500

export async function GET() {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch in batches to avoid loading everything into memory at once
    const include = {
        member: {
            select: {
                usccmpc_id: true, firstName: true, lastName: true,
                middleName: true, suffix: true, membership_type: true,
                contactNumber: true, email1: true,
            },
        },
        checkin_by: { select: { username: true } },
        checkout_by: { select: { username: true } },
    }
    const attendance: Awaited<ReturnType<typeof prisma.attendance.findMany<{ include: typeof include }>>> = []
    let cursor: string | undefined
    while (true) {
        const batch = await prisma.attendance.findMany({
            take: EXPORT_BATCH_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include,
            orderBy: { checkin_at: 'asc' },
        })
        if (batch.length === 0) break
        attendance.push(...batch)
        if (batch.length < EXPORT_BATCH_SIZE) break
        cursor = batch[batch.length - 1].id
    }

    // Return clean rows ready for XLSX/CSV conversion on the client
    const rows = attendance.map(a => ({
        'Queue #': a.queue_number,
        'USCCMPC ID': a.member.usccmpc_id,
        'Last Name': a.member.lastName,
        'First Name': a.member.firstName,
        'Middle Name': a.member.middleName ?? '',
        'Suffix': a.member.suffix ?? '',
        'Membership Type': a.member.membership_type,
        'Contact': a.member.contactNumber ?? '',
        'Email': a.member.email1 ?? '',
        'Check-In Time': new Date(a.checkin_at).toLocaleString('en-PH'),
        'Check-In By': a.checkin_by.username,
        'Check-Out Time': a.checkout_at ? new Date(a.checkout_at).toLocaleString('en-PH') : '',
        'Check-Out By': a.checkout_by?.username ?? '',
        'Claimed By': (a as any).claimed_by ?? '',
        'Stub Collected': a.checkout_at ? ((a as any).stub_collected === false ? 'No' : 'Yes') : '',
        'Queue # at Out': a.checkout_number_given ?? '',
        'Status': a.status,
    }))

    return NextResponse.json(rows)
}
