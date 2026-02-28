import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface MemberRow {
    usccmpc_id: string
    firstName: string
    lastName: string
    middleName?: string
    suffix?: string
    membership_type: string
    email1?: string
    email2?: string
    contactNumber?: string
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const rows: MemberRow[] = body.rows

    if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    let upserted = 0
    let errors = 0
    const errorDetails: string[] = []

    for (const row of rows) {
        try {
            if (!row.usccmpc_id || !row.firstName || !row.lastName) {
                errors++
                errorDetails.push(`Row missing required fields: ${JSON.stringify(row)}`)
                continue
            }

            const membershipType =
                row.membership_type?.toLowerCase() === 'associate'
                    ? 'Associate'
                    : 'Regular'

            await prisma.member.upsert({
                where: { usccmpc_id: String(row.usccmpc_id).trim() },
                update: {
                    firstName: row.firstName?.trim(),
                    lastName: row.lastName?.trim(),
                    middleName: row.middleName?.trim() || null,
                    suffix: row.suffix?.trim() || null,
                    membership_type: membershipType,
                    email1: row.email1?.trim() || null,
                    email2: row.email2?.trim() || null,
                    contactNumber: row.contactNumber?.trim() || null,
                },
                create: {
                    usccmpc_id: String(row.usccmpc_id).trim(),
                    firstName: row.firstName?.trim(),
                    lastName: row.lastName?.trim(),
                    middleName: row.middleName?.trim() || null,
                    suffix: row.suffix?.trim() || null,
                    membership_type: membershipType,
                    email1: row.email1?.trim() || null,
                    email2: row.email2?.trim() || null,
                    contactNumber: row.contactNumber?.trim() || null,
                },
            })
            upserted++
        } catch (e: any) {
            errors++
            errorDetails.push(e.message)
        }
    }

    return NextResponse.json({ upserted, errors, errorDetails })
}
