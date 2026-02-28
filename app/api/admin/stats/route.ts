import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const [totalMembers, regularMembers, associateMembers, allAttendances] =
        await Promise.all([
            prisma.member.count(),
            prisma.member.count({ where: { membership_type: 'Regular' } }),
            prisma.member.count({ where: { membership_type: 'Associate' } }),
            prisma.attendance.findMany({
                include: { member: { select: { membership_type: true } } },
            }),
        ])

    // Everyone who ever checked in (regardless of checkout)
    type AttWithMember = typeof allAttendances[number]
    const checkedInTotal = allAttendances.length
    const checkedOutTotal = allAttendances.filter((a: AttWithMember) => !!a.checkout_at).length
    const currentlyPresent = checkedInTotal - checkedOutTotal

    const checkedInRegular = allAttendances.filter((a: AttWithMember) => a.member.membership_type === 'Regular').length
    const checkedInAssociate = allAttendances.filter((a: AttWithMember) => a.member.membership_type === 'Associate').length

    const checkedOutRegular = allAttendances.filter((a: AttWithMember) => !!a.checkout_at && a.member.membership_type === 'Regular').length
    const checkedOutAssociate = allAttendances.filter((a: AttWithMember) => !!a.checkout_at && a.member.membership_type === 'Associate').length

    return NextResponse.json({
        totalMembers,
        checkedInTotal,
        checkedOutTotal,
        currentlyPresent,
        regularMembers,
        associateMembers,
        checkedInRegular,
        checkedInAssociate,
        checkedOutRegular,
        checkedOutAssociate,
    })
}
