import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrisma() {
    const client = new PrismaClient({ log: ['error'] })

    // Run SQLite performance + concurrency PRAGMAs on first connect.
    // WAL mode: allows concurrent reads while a write is in progress.
    // busy_timeout: instead of immediately throwing "database is locked",
    //   SQLite waits up to 10 s for the lock to release — essential under load.
    // synchronous NORMAL: safe durability level, much faster than FULL.
    client.$connect().then(() => {
        return client.$queryRawUnsafe(`PRAGMA journal_mode=WAL;`)     // returns rows → queryRaw
            .then(() => client.$executeRawUnsafe(`PRAGMA busy_timeout=10000;`))
            .then(() => client.$executeRawUnsafe(`PRAGMA synchronous=NORMAL;`))
            .then(() => client.$executeRawUnsafe(`PRAGMA cache_size=-16000;`))
            .catch(console.error)
    })

    return client
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
