import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const [
        totalMembers,
        regularMembers,
        associateMembers,
        checkedInTotal,
        checkedOutTotal,
        raffleEligible,
        checkedInRegular,
        checkedInAssociate,
        checkedOutRegular,
        checkedOutAssociate,
    ] = await Promise.all([
        prisma.member.count(),
        prisma.member.count({ where: { membership_type: 'Regular' } }),
        prisma.member.count({ where: { membership_type: 'Associate' } }),
        prisma.attendance.count(),
        prisma.attendance.count({ where: { checkout_at: { not: null } } }),
        prisma.attendance.count({ where: { raffle_eligible: true } }),
        prisma.attendance.count({ where: { member: { membership_type: 'Regular' } } }),
        prisma.attendance.count({ where: { member: { membership_type: 'Associate' } } }),
        prisma.attendance.count({ where: { checkout_at: { not: null }, member: { membership_type: 'Regular' } } }),
        prisma.attendance.count({ where: { checkout_at: { not: null }, member: { membership_type: 'Associate' } } }),
    ])

    const currentlyPresent = checkedInTotal - checkedOutTotal

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
        raffleEligible,
    })
}
