import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Public config for staff/admin attendance page — checkin/checkout enabled flags */
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.eventConfig.findFirst()
    return NextResponse.json({
        checkinEnabled: config?.checkinEnabled ?? false,
        checkoutEnabled: config?.checkoutEnabled ?? false,
    })
}
