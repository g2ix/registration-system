import { getRecentEvents } from '@/lib/attendance'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
    const initialRecent = await getRecentEvents()
    return <AttendanceClient initialRecent={initialRecent} />
}
