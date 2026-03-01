import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeForSearch } from '@/lib/normalize'

const MIN_TEXT_SEARCH_LENGTH = 2

export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('q') ?? ''
    if (!raw.trim()) return NextResponse.json([])

    const q = raw.trim()
    const isNumeric = /^\d+$/.test(q)
    if (!isNumeric && q.length < MIN_TEXT_SEARCH_LENGTH) return NextResponse.json([])

    const qNorm = normalizeForSearch(q)   // ñ → n, é → e, etc.
    const like = `%${qNorm}%`

    // Normalize BOTH sides: REPLACE ñ→n in the stored column AND in the search pattern.
    // This makes "n" match "Niño" and "ñ" also match "Nina" — fully bidirectional.
    type IdRow = { id: string }

    let matchingRows: IdRow[]

    if (isNumeric) {
        matchingRows = await prisma.$queryRaw<IdRow[]>`
            SELECT DISTINCT m.id FROM "Member" m
            LEFT JOIN "Attendance" a ON a.member_id = m.id
            WHERE
                LOWER(REPLACE(REPLACE(m.firstName, 'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
             OR LOWER(REPLACE(REPLACE(m.lastName,  'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
             OR a.queue_number = ${parseInt(q)}
            ORDER BY m.lastName, m.firstName
            LIMIT 20
        `
    } else {
        matchingRows = await prisma.$queryRaw<IdRow[]>`
            SELECT DISTINCT m.id FROM "Member" m
            WHERE
                LOWER(REPLACE(REPLACE(m.firstName, 'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
             OR LOWER(REPLACE(REPLACE(m.lastName,  'ñ', 'n'), 'Ñ', 'n')) LIKE LOWER(${like})
            ORDER BY m.lastName, m.firstName
            LIMIT 20
        `
    }

    if (matchingRows.length === 0) return NextResponse.json([])

    const members = await prisma.member.findMany({
        where: { id: { in: matchingRows.map(r => r.id) } },
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
    })

    return NextResponse.json(members)
}
