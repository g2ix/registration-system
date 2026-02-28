import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT update member
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { usccmpc_id, firstName, lastName, middleName, suffix, membership_type, email1, email2, contactNumber } = body

    try {
        const member = await prisma.member.update({
            where: { id: params.id },
            data: {
                ...(usccmpc_id && { usccmpc_id: usccmpc_id.trim() }),
                ...(firstName && { firstName: firstName.trim() }),
                ...(lastName && { lastName: lastName.trim() }),
                middleName: middleName?.trim() || null,
                suffix: suffix?.trim() || null,
                ...(membership_type && { membership_type }),
                email1: email1?.trim() || null,
                email2: email2?.trim() || null,
                contactNumber: contactNumber?.trim() || null,
            },
        })
        return NextResponse.json(member)
    } catch {
        return NextResponse.json({ error: 'Member not found or ID conflict' }, { status: 404 })
    }
}

// DELETE member (blocked if they have attendance records)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const hasAttendance = await prisma.attendance.findFirst({ where: { member_id: params.id } })
    if (hasAttendance)
        return NextResponse.json({ error: 'Cannot delete a member with attendance records' }, { status: 400 })

    try {
        await prisma.member.delete({ where: { id: params.id } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
}
