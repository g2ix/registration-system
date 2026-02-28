import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { attendance_id, action, number_given } = body
    // action: 'correct' | 'lost' | 'mismatch'

    if (!attendance_id || !action) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const attendance = await prisma.attendance.findUnique({
        where: { id: attendance_id },
    })

    if (!attendance) {
        return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })
    }

    if (attendance.checkout_at) {
        return NextResponse.json({ error: 'Already checked out' }, { status: 409 })
    }

    // Validate mismatch requires number_given
    if (action === 'mismatch' && number_given == null) {
        return NextResponse.json(
            { error: 'number_given is required for mismatch' },
            { status: 400 }
        )
    }

    const statusMap: Record<string, 'Correct' | 'Lost' | 'Mismatch'> = {
        correct: 'Correct',
        lost: 'Lost',
        mismatch: 'Mismatch',
    }

    const updated = await prisma.attendance.update({
        where: { id: attendance_id },
        data: {
            checkout_at: new Date(),
            checkout_by_id: (session.user as any).id,
            status: statusMap[action],
            checkout_number_given:
                action === 'mismatch' ? parseInt(number_given) : null,
        },
    })

    return NextResponse.json(updated)
}
