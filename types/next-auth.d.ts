import NextAuth from 'next-auth'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            name?: string | null
            email?: string | null
            image?: string | null
            role: 'ADMIN' | 'STAFF' | 'ELECTION' | 'MANAGER'
        }
    }

    interface User {
        id: string
        role: 'ADMIN' | 'STAFF' | 'ELECTION' | 'MANAGER'
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        role: 'ADMIN' | 'STAFF' | 'ELECTION' | 'MANAGER'
    }
}
