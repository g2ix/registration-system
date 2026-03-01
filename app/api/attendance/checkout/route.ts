import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await prisma.eventConfig.findFirst()
    if (!config?.checkoutEnabled) {
        return NextResponse.json(
            { error: 'Check-out is not currently available. Please wait for the admin to activate it.' },
            { status: 403 }
        )
    }

    const body = await req.json()
    const { attendance_id, action, number_given, claimed_by } = body
    // action: 'correct' | 'mismatch' | 'proxy' | 'lost'

    if (!attendance_id || !action)
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const attendance = await prisma.attendance.findUnique({ where: { id: attendance_id } })
    if (!attendance)
        return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })
    if (attendance.checkout_at)
        return NextResponse.json({ error: 'Already checked out' }, { status: 409 })

    if (action === 'mismatch' && number_given == null)
        return NextResponse.json({ error: 'number_given is required for mismatch' }, { status: 400 })
    if (action === 'proxy' && !claimed_by?.trim())
        return NextResponse.json({ error: 'claimed_by is required for proxy checkout' }, { status: 400 })

    const statusMap: Record<string, string> = {
        correct: 'Correct',
        mismatch: 'Mismatch',
        proxy: 'Correct',
        lost: 'Lost',
    }

    const userId = (session.user as any).id as string
    const finalStatus = statusMap[action] ?? 'Correct'
    const checkoutNum = action === 'mismatch' ? parseInt(number_given) : null
    const claimedByVal = claimed_by?.trim() || null
    const stubCollected = action !== 'lost' ? 1 : 0
    const now = new Date().toISOString()

    // ── Stub cross-validation ─────────────────────────────────────
    // For mismatch: the stub number they're presenting must not already
    // be settled (correct checkout or another mismatch) in another record.
    if (action === 'mismatch' && checkoutNum != null) {
        type Row = { id: string; queue_number: number; status: string }
        const claimedRows = await prisma.$queryRaw<Row[]>`
            SELECT id, queue_number, status FROM "Attendance"
            WHERE id <> ${attendance_id}
              AND (
                (queue_number = ${checkoutNum} AND checkout_at IS NOT NULL)
                OR checkout_number_given = ${checkoutNum}
              )
            LIMIT 1
        `
        if (claimedRows.length > 0) {
            return NextResponse.json(
                { error: `Stub #${checkoutNum} was already claimed in another checkout record. Cannot record mismatch.` },
                { status: 409 }
            )
        }
    }

    // For correct/proxy: check if this member's own stub was already grabbed
    // by someone else's mismatch checkout (checkout_number_given = our queue_number).
    if (action === 'correct' || action === 'proxy') {
        type Row = { id: string }
        const takenAsMismatch = await prisma.$queryRaw<Row[]>`
            SELECT id FROM "Attendance"
            WHERE id <> ${attendance_id}
              AND checkout_number_given = ${attendance.queue_number}
            LIMIT 1
        `
        if (takenAsMismatch.length > 0) {
            return NextResponse.json(
                { error: `Stub #${attendance.queue_number} was already claimed by another member's mismatch checkout. Please investigate before proceeding.` },
                { status: 409 }
            )
        }
    }

    // Use raw SQL to bypass the stale Prisma client types (fields added after Studio locked the DLL)
    await prisma.$executeRaw`
        UPDATE "Attendance"
        SET
            checkout_at           = ${now},
            checkout_by_id        = ${userId},
            status                = ${finalStatus},
            checkout_number_given = ${checkoutNum},
            claimed_by            = ${claimedByVal},
            stub_collected        = ${stubCollected}
        WHERE id = ${attendance_id}
    `

    // Return the updated record via findUnique (read path works fine)
    const updated = await prisma.attendance.findUnique({ where: { id: attendance_id } })
    return NextResponse.json(updated)
}
