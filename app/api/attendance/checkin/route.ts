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

    const config = await prisma.eventConfig.findFirst()
    if (!config?.checkinEnabled) {
        return NextResponse.json(
            { error: 'Check-in / event sign-in is not currently available. Please wait for the admin to activate it.' },
            { status: 403 }
        )
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

    // Run both checks in parallel
    const [existing, takenBy] = await Promise.all([
        prisma.attendance.findFirst({ where: { member_id, checkout_at: null } }),
        prisma.attendance.findFirst({
            where: { queue_number: qNum },
            include: { member: { select: { firstName: true, lastName: true } } },
        }),
    ])
    if (existing) {
        return NextResponse.json({ error: 'Member is already checked in' }, { status: 409 })
    }
    if (takenBy) {
        const name = `${takenBy.member.lastName}, ${takenBy.member.firstName}`
        return NextResponse.json(
            { error: `Queue #${qNum} is already assigned to ${name}` },
            { status: 409 }
        )
    }

    // Attempt insert — DB unique constraint is the final atomic guard against race conditions
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
    } catch (err: unknown) {
        if (err instanceof PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {
                return NextResponse.json(
                    { error: `Queue #${qNum} is already taken` },
                    { status: 409 }
                )
            }
            if (err.code === 'P2034') {
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
