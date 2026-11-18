import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { testEmailConnection, sendTestEmail } from '@/lib/email'

/**
 * POST /api/settings/email/test
 * Body:
 * - { "type": "connection", "provider"?: "smtp" | "graph", "config"?: { ... } }
 * - { "type": "send", "to": "example@example.com", "provider"?: "smtp" | "graph", "config"?: { ... } }
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, to, provider, config } = await req.json()

    if (type === 'connection') {
      const result = await testEmailConnection(provider, config)
      return NextResponse.json(result)
    }

    if (type === 'send') {
      if (!to || typeof to !== 'string' || !to.includes('@')) {
        return NextResponse.json({ error: 'Alamat email penerima tidak valid.' }, { status: 400 })
      }
      const result = await sendTestEmail(to, undefined, undefined, provider, config)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error in email test endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


