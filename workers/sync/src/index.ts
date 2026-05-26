export interface Env {
  LIFT_SYNC: KVNamespace
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O for readability
const DIGITS = '0123456789'

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 3; i++) code += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  code += '-'
  for (let i = 0; i < 3; i++) code += DIGITS[Math.floor(Math.random() * DIGITS.length)]
  return code
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)

    // POST /create — generate code, store initial data
    if (request.method === 'POST' && url.pathname === '/create') {
      const body = await request.json() as { logs: unknown[]; weightHistory: unknown }
      let code = generateCode()
      // Retry up to 10 times to guarantee uniqueness
      for (let i = 0; i < 10; i++) {
        const existing = await env.LIFT_SYNC.get(code)
        if (!existing) break
        code = generateCode()
      }
      const payload = { ...body, lastUpdated: Date.now() }
      await env.LIFT_SYNC.put(code, JSON.stringify(payload), {
        expirationTtl: 60 * 60 * 24 * 365, // 1 year
      })
      return json({ code })
    }

    // PUT /push?code=XXX — update stored data
    if (request.method === 'PUT' && url.pathname === '/push') {
      const code = url.searchParams.get('code')
      if (!code) return json({ error: 'Missing code' }, 400)
      const existing = await env.LIFT_SYNC.get(code)
      if (!existing) return json({ error: 'Code not found' }, 404)
      const body = await request.json() as { logs: unknown[]; weightHistory: unknown }
      const payload = { ...body, lastUpdated: Date.now() }
      await env.LIFT_SYNC.put(code, JSON.stringify(payload), {
        expirationTtl: 60 * 60 * 24 * 365,
      })
      return json({ ok: true })
    }

    // GET /pull?code=XXX — retrieve stored data
    if (request.method === 'GET' && url.pathname === '/pull') {
      const code = url.searchParams.get('code')
      if (!code) return json({ error: 'Missing code' }, 400)
      const data = await env.LIFT_SYNC.get(code)
      if (!data) return json({ error: 'Code not found' }, 404)
      return new Response(data, {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return json({ error: 'Not found' }, 404)
  },
}
