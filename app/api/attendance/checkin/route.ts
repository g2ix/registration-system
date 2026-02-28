import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { member_id, queue_number } = body

    if (!member_id || queue_number == null) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const qNum = parseInt(queue_number)
    if (isNaN(qNum) || qNum < 1) {
        return NextResponse.json({ error: 'Invalid queue number' }, { status: 400 })
    }

    // Check if member is already checked in (open session)
    const existing = await prisma.attendance.findFirst({
        where: { member_id, checkout_at: null },
    })
    if (existing) {
        return NextResponse.json({ error: 'Member is already checked in' }, { status: 409 })
    }

    // Attempt insert — let the DB's unique constraint on queue_number handle
    // any concurrent duplicate atomically. No pre-check needed.
    try {
        const attendance = await prisma.attendance.create({
            data: {
                member_id,
                queue_number: qNum,
                checkin_by_id: (session.user as any).id,
            },
            include: {
                member: { select: { firstName: true, lastName: true } },
            },
        })
        return NextResponse.json(attendance, { status: 201 })
    } catch (err) {
        if (err instanceof PrismaClientKnownRequestError) {
            // P2002 = unique constraint failed (queue_number already taken)
            if (err.code === 'P2002') {
                // Look up who holds this number to give a helpful message
                const holder = await prisma.attendance.findUnique({
                    where: { queue_number: qNum },
                    include: { member: { select: { firstName: true, lastName: true } } },
                }).catch(() => null)
                const name = holder ? `${holder.member.lastName}, ${holder.member.firstName}` : 'another member'
                return NextResponse.json(
                    { error: `Queue #${qNum} is already assigned to ${name}` },
                    { status: 409 }
                )
            }
            // P2034 = write conflict / transaction conflict under load
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2034') {
                return NextResponse.json(
                    { error: 'Server busy — please try again' },
                    { status: 503 }
                )
            }
        }
        console.error('[checkin]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
