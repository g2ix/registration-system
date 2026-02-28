import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Admin
    const adminPassword = await bcrypt.hash('admin123', 12)
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: { username: 'admin', password: adminPassword, role: 'ADMIN' },
    })

    // Staff
    const staffPassword = await bcrypt.hash('staff123', 12)
    await prisma.user.upsert({
        where: { username: 'staff' },
        update: {},
        create: { username: 'staff', password: staffPassword, role: 'STAFF' },
    })

    // Election
    const electionPassword = await bcrypt.hash('election123', 12)
    await prisma.user.upsert({
        where: { username: 'election' },
        update: {},
        create: { username: 'election', password: electionPassword, role: 'ELECTION' },
    })

    // Default event config
    await prisma.eventConfig.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, title: 'USCC-MPC Event' },
    })

    console.log('✅ Seed complete!')
    console.log('   Admin:    admin / admin123')
    console.log('   Staff:    staff / staff123')
    console.log('   Election: election / election123')
    console.log('   ⚠️  Change these passwords after first login!')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
