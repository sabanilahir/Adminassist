import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { testSmtpConnection, sendTestEmail } from '@/lib/email'

/**
 * POST /api/settings/email/test
 * Body: { "type": "connection" } or { "type": "send", "to": "example@example.com" }
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, to } = await req.json()
    if (type === 'connection') {
      const result = await testSmtpConnection()
      return NextResponse.json(result)
    }
    if (type === 'send' && typeof to === 'string') {
      const result = await sendTestEmail(to)
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error in email test endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

