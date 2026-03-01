import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PUT update user (role and/or password)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { role, password, username } = await req.json()
    const data: any = {}
    if (role) data.role = role
    if (username?.trim()) data.username = username.trim()
    if (password) data.password = await bcrypt.hash(password, 10)

    if (Object.keys(data).length === 0)
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    try {
        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, username: true, role: true, createdAt: true },
        })
        return NextResponse.json(user)
    } catch {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
}

// DELETE user (can't delete yourself)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'ADMIN')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    if ((session?.user as any)?.id === id)
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

    try {
        await prisma.user.delete({ where: { id } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
}
