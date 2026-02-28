import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const config = await prisma.eventConfig.findFirst()
    return NextResponse.json({ title: config?.title ?? 'USCC-MPC Event' })
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title } = await req.json()
    if (!title?.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const config = await prisma.eventConfig.upsert({
        where: { id: 1 },
        update: { title: title.trim() },
        create: { id: 1, title: title.trim() },
    })

    return NextResponse.json(config)
}
