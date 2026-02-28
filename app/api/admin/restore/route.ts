import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface BackupMember {
    usccmpc_id: string; firstName: string; lastName: string
    middleName?: string | null; suffix?: string | null
    membership_type: 'Regular' | 'Associate'
    email1?: string | null; email2?: string | null; contactNumber?: string | null
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let backup: { meta?: unknown; members?: BackupMember[]; attendance?: unknown[] }
    try {
        backup = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 })
    }

    if (!Array.isArray(backup.members))
        return NextResponse.json({ error: 'Invalid backup file: missing members array' }, { status: 400 })

    let membersRestored = 0, memberErrors = 0
    const errorDetails: string[] = []

    // Restore members (upsert by usccmpc_id)
    for (const m of backup.members) {
        try {
            if (!m.usccmpc_id || !m.firstName || !m.lastName) {
                memberErrors++; errorDetails.push(`Skipped member missing required fields`); continue
            }
            await prisma.member.upsert({
                where: { usccmpc_id: m.usccmpc_id },
                update: {
                    firstName: m.firstName, lastName: m.lastName,
                    middleName: m.middleName ?? null, suffix: m.suffix ?? null,
                    membership_type: m.membership_type,
                    email1: m.email1 ?? null, email2: m.email2 ?? null,
                    contactNumber: m.contactNumber ?? null,
                },
                create: {
                    usccmpc_id: m.usccmpc_id, firstName: m.firstName, lastName: m.lastName,
                    middleName: m.middleName ?? null, suffix: m.suffix ?? null,
                    membership_type: m.membership_type,
                    email1: m.email1 ?? null, email2: m.email2 ?? null,
                    contactNumber: m.contactNumber ?? null,
                },
            })
            membersRestored++
        } catch (e: any) {
            memberErrors++; errorDetails.push(`Member ${m.usccmpc_id}: ${e.message}`)
        }
    }

    return NextResponse.json({
        membersRestored, memberErrors, errorDetails,
        message: `Restored ${membersRestored} members (${memberErrors} skipped)`,
    })
}
