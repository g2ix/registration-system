import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl
        const role = req.nextauth.token?.role

        // Admin-only routes
        if (pathname.startsWith('/admin') && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/', req.url))
        }

        // Election-only routes (also allow ADMIN)
        if (pathname.startsWith('/election') && role !== 'ELECTION' && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/', req.url))
        }

        return NextResponse.next()
    },
    {
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
