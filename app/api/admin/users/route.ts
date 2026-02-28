import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET all users
export async function GET() {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({
        select: {
            id: true, username: true, role: true, createdAt: true,
            _count: { select: { checkins: true, checkouts: true } }
        },
        orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(users)
}

// POST create user
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { username, password, role } = await req.json()
    if (!username?.trim() || !password || !role)
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists)
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
        data: { username: username.trim(), password: hashed, role },
        select: { id: true, username: true, role: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
}
