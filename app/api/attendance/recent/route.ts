import { NextResponse } from 'next/server'
import { getRecentEvents } from '@/lib/attendance'

export async function GET() {
    const events = await getRecentEvents()
    return NextResponse.json(events)
}
