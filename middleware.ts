import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl
        const role = req.nextauth.token?.role

        if (role === 'MANAGER') {
            const allowed = pathname === '/admin'
                || pathname === '/raffle'
                || pathname === '/api/raffle'
                || pathname === '/api/admin/stats'
                || pathname === '/api/admin/event'
            if (!allowed) {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
                return NextResponse.redirect(new URL('/admin', req.url))
            }
        }

        // Admin dashboard is also open to managers. Other admin pages stay admin-only.
        if (pathname.startsWith('/admin') && role !== 'ADMIN' && !(role === 'MANAGER' && pathname === '/admin')) {
            return NextResponse.redirect(new URL('/', req.url))
        }

        if (pathname.startsWith('/raffle') && role !== 'MANAGER' && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/', req.url))
        }

        // Election-only routes (also allow ADMIN)
        if (pathname.startsWith('/election') && role !== 'ELECTION' && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/', req.url))
        }

        return NextResponse.next()
    },
    {
        secret: process.env.NEXTAUTH_SECRET,
        pages: {
            signIn: '/login',
        },
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = {
    matcher: [
        '/((?!api/auth|login|_next/static|_next/image|favicon.ico|fonts/|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)',
    ],
}
