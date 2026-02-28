import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeForSearch } from '@/lib/normalize'

// GET members — paginated, bidirectional accent-insensitive search
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim() ?? ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
    const pageSize = 5
    const qNorm = normalizeForSearch(q)  // ñ → n, strip all diacritics
    const like = `%${qNorm}%`
    const offset = (page - 1) * pageSize

    type IdRow = { id: string }
    type CountRow = { total: number }

    let ids: string[]
    let total: number

    if (q) {
        // Normalize BOTH sides: REPLACE ñ→n in the stored column too,
        // so "n" matches "Niño" and "ñ" matches "Nina" — fully bidirectional.
        const [idRows, countRows] = await Promise.all([
            prisma.$queryRaw<IdRow[]>`
        SELECT id FROM "Member"
        WHERE
            LOWER(REPLACE(REPLACE(firstName,  'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
         OR LOWER(REPLACE(REPLACE(lastName,   'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
         OR LOWER(usccmpc_id) LIKE LOWER(${like})
        ORDER BY lastName, firstName
        LIMIT ${pageSize} OFFSET ${offset}
      `,
            prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) as total FROM "Member"
        WHERE
            LOWER(REPLACE(REPLACE(firstName,  'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
         OR LOWER(REPLACE(REPLACE(lastName,   'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
         OR LOWER(usccmpc_id) LIKE LOWER(${like})
      `,
        ])
        ids = idRows.map((r: IdRow) => r.id)
        total = Number(countRows[0]?.total ?? 0)
    } else {
        // No query — use regular Prisma for performance
        const [allIds, count] = await Promise.all([
            prisma.member.findMany({ select: { id: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], skip: offset, take: pageSize }),
            prisma.member.count(),
        ])
        ids = allIds.map((r: { id: string }) => r.id)
        total = count
    }

    const members = ids.length === 0 ? [] : await prisma.member.findMany({
        where: { id: { in: ids } },
        include: { _count: { select: { attendance: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return NextResponse.json({ members, total, page, totalPages: Math.ceil(total / pageSize) })
}

// POST create member
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { usccmpc_id, firstName, lastName, middleName, suffix, membership_type, email1, email2, contactNumber } = body

    if (!usccmpc_id?.trim() || !firstName?.trim() || !lastName?.trim() || !membership_type)
        return NextResponse.json({ error: 'usccmpc_id, firstName, lastName, membership_type are required' }, { status: 400 })

    const exists = await prisma.member.findUnique({ where: { usccmpc_id } })
    if (exists)
        return NextResponse.json({ error: 'USCCMPC ID already exists' }, { status: 409 })

    const member = await prisma.member.create({
        data: {
            usccmpc_id: usccmpc_id.trim(), firstName: firstName.trim(), lastName: lastName.trim(),
            middleName: middleName?.trim() || null, suffix: suffix?.trim() || null,
            membership_type, email1: email1?.trim() || null, email2: email2?.trim() || null,
            contactNumber: contactNumber?.trim() || null
        },
    })
    return NextResponse.json(member, { status: 201 })
}
