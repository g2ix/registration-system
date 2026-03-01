import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { password } = await req.json()
    if (!password || typeof password !== 'string') {
        return NextResponse.json({ error: 'Password is required for confirmation' }, { status: 400 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        return NextResponse.json({ error: 'Invalid password. Reset cancelled.' }, { status: 401 })
    }

    await prisma.attendance.deleteMany({})
    return NextResponse.json({ success: true, message: 'Attendance table has been reset.' })
}
