import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const row = await prisma.$queryRawUnsafe<Array<{ title: string; checkinEnabled?: number; checkoutEnabled?: number }>>(
            'SELECT title, "checkinEnabled", "checkoutEnabled" FROM "EventConfig" WHERE id = 1'
        )
        const r = row?.[0]
        return NextResponse.json({
            title: r?.title ?? 'USCC-MPC Event',
            checkinEnabled: Boolean(r?.checkinEnabled),
            checkoutEnabled: Boolean(r?.checkoutEnabled),
        })
    } catch {
        try {
            const row = await prisma.$queryRawUnsafe<Array<{ title: string }>>(
                'SELECT title FROM "EventConfig" WHERE id = 1'
            )
            const r = row?.[0]
            return NextResponse.json({
                title: r?.title ?? 'USCC-MPC Event',
                checkinEnabled: false,
                checkoutEnabled: false,
            })
        } catch {
            return NextResponse.json({
                title: 'USCC-MPC Event',
                checkinEnabled: false,
                checkoutEnabled: false,
            })
        }
    }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { title, checkinEnabled, checkoutEnabled } = body

    try {
        // Ensure EventConfig row exists; use raw SQL to avoid Prisma client schema mismatch
        await prisma.$executeRawUnsafe(
            `INSERT OR IGNORE INTO "EventConfig" (id, title, "checkinEnabled", "checkoutEnabled") VALUES (1, 'USCC-MPC Event', 0, 0)`
        )
    } catch (e) {
        // Table may lack checkinEnabled/checkoutEnabled columns - add them
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "EventConfig" ADD COLUMN "checkinEnabled" INTEGER DEFAULT 0`)
        } catch { /* exists */ }
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "EventConfig" ADD COLUMN "checkoutEnabled" INTEGER DEFAULT 0`)
        } catch { /* exists */ }
        await prisma.$executeRawUnsafe(
            `INSERT OR IGNORE INTO "EventConfig" (id, title, "checkinEnabled", "checkoutEnabled") VALUES (1, 'USCC-MPC Event', 0, 0)`
        )
    }

    const updates: string[] = []
    const params: (string | number)[] = []
    if (typeof title === 'string' && title.trim()) {
        updates.push('"title" = ?')
        params.push(title.trim())
    }
    if (typeof checkinEnabled === 'boolean') {
        updates.push('"checkinEnabled" = ?')
        params.push(checkinEnabled ? 1 : 0)
    }
    if (typeof checkoutEnabled === 'boolean') {
        updates.push('"checkoutEnabled" = ?')
        params.push(checkoutEnabled ? 1 : 0)
    }

    if (updates.length > 0) {
        params.push(1)
        await prisma.$executeRawUnsafe(
            `UPDATE "EventConfig" SET ${updates.join(', ')} WHERE id = ?`,
            ...params
        )
    }

    const row = await prisma.$queryRawUnsafe<Array<{ id: number; title: string; checkinEnabled: number; checkoutEnabled: number }>>(
        'SELECT id, title, "checkinEnabled" as checkinEnabled, "checkoutEnabled" as checkoutEnabled FROM "EventConfig" WHERE id = 1'
    )
    const config = row[0]
    return NextResponse.json({
        id: config?.id ?? 1,
        title: config?.title ?? 'USCC-MPC Event',
        checkinEnabled: Boolean(config?.checkinEnabled),
        checkoutEnabled: Boolean(config?.checkoutEnabled),
    })
}
