/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O for readability

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 3; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  code += '-'
  for (let i = 0; i < 3; i++) code += '0123456789'[Math.floor(Math.random() * 10)]
  return code
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url)
    }

    return env.ASSETS.fetch(request)
  },
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace('/api', '')

  // ── POST /api/sync/create ─────────────────────────────────────────
  if (path === '/sync/create' && request.method === 'POST') {
    let code = generateCode()
    for (let i = 0; i < 8; i++) {
      const existing = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
        .bind(code).first()
      if (!existing) break
      code = generateCode()
    }
    await env.DB.prepare('INSERT INTO sync_codes (code, created_at) VALUES (?, ?)')
      .bind(code, new Date().toISOString())
      .run()
    return json({ code })
  }

  // ── POST /api/sync/verify ─────────────────────────────────────────
  if (path === '/sync/verify' && request.method === 'POST') {
    const body = (await request.json()) as { code: string }
    const normalised = body.code?.trim().toUpperCase()
    if (!normalised) return err('Missing code')
    const row = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(normalised).first()
    return json({ exists: !!row })
  }

  // ── /api/sync/:code/push  or  /api/sync/:code/pull ───────────────
  const syncMatch = path.match(/^\/sync\/([A-Z0-9-]+)\/(push|pull)$/)
  if (syncMatch) {
    const [, code, action] = syncMatch

    const codeRow = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(code).first()
    if (!codeRow) return err('Invalid sync code', 404)

    // ── push ───────────────────────────────────────────────────────
    if (action === 'push' && request.method === 'POST') {
      const { logs, plans, weightHistory } = (await request.json()) as {
        logs: Array<{ id: string }>
        plans: Array<{ id: string }>
        weightHistory: Record<string, unknown>
      }
      const now = new Date().toISOString()

      // Full replace per sync code — delete old rows, insert new
      await env.DB.batch([
        env.DB.prepare('DELETE FROM workout_logs WHERE sync_code = ?').bind(code),
        env.DB.prepare('DELETE FROM custom_plans  WHERE sync_code = ?').bind(code),
        env.DB.prepare('DELETE FROM weight_history WHERE sync_code = ?').bind(code),
      ])

      const stmts = []

      for (const log of logs) {
        stmts.push(
          env.DB.prepare(
            'INSERT INTO workout_logs (id, sync_code, data, updated_at) VALUES (?, ?, ?, ?)'
          ).bind(log.id, code, JSON.stringify(log), now)
        )
      }

      for (const plan of plans) {
        stmts.push(
          env.DB.prepare(
            'INSERT INTO custom_plans (id, sync_code, data, updated_at) VALUES (?, ?, ?, ?)'
          ).bind(plan.id, code, JSON.stringify(plan), now)
        )
      }

      if (Object.keys(weightHistory).length > 0) {
        stmts.push(
          env.DB.prepare(
            'INSERT INTO weight_history (sync_code, data, updated_at) VALUES (?, ?, ?)'
          ).bind(code, JSON.stringify(weightHistory), now)
        )
      }

      if (stmts.length > 0) await env.DB.batch(stmts)

      return json({ ok: true, synced: now })
    }

    // ── pull ───────────────────────────────────────────────────────
    if (action === 'pull' && request.method === 'GET') {
      const [logsResult, plansResult, historyResult] = await env.DB.batch([
        env.DB.prepare(
          'SELECT data FROM workout_logs WHERE sync_code = ? ORDER BY updated_at DESC'
        ).bind(code),
        env.DB.prepare(
          'SELECT data FROM custom_plans WHERE sync_code = ?'
        ).bind(code),
        env.DB.prepare(
          'SELECT data FROM weight_history WHERE sync_code = ?'
        ).bind(code),
      ])

      const logs = (logsResult.results ?? []).map((r) => JSON.parse(r.data as string))
      const plans = (plansResult.results ?? []).map((r) => JSON.parse(r.data as string))
      const weightHistory = historyResult.results?.[0]
        ? JSON.parse(historyResult.results[0].data as string)
        : {}

      return json({ logs, plans, weightHistory })
    }
  }

  return err('Not found', 404)
}
