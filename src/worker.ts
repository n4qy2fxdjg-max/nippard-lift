/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

// ── CORS ──────────────────────────────────────────────────────────────
// App and API are same-origin per deployment, so this is defense-in-depth:
// it stops an arbitrary third-party site from calling the API with a stolen
// code from a victim's browser. Non-browser callers ignore CORS — the long
// codes + rate limiting are the real protection.
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const host = new URL(origin).host
    return (
      host === 'lift.n4qy2fxdjg.workers.dev' ||
      host === 'nippard-lift.pages.dev' ||
      host.endsWith('.nippard-lift.pages.dev') || // CF preview deploys
      host === 'localhost' ||
      host.startsWith('localhost:') ||
      host.startsWith('127.0.0.1')
    )
  } catch {
    return false
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin as string
  return headers
}

function json(data: unknown, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function err(msg: string, origin: string | null, status = 400): Response {
  return json({ error: msg }, origin, status)
}

// ── Sync code generation (CSPRNG) ─────────────────────────────────────
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 31 chars, no I/O for readability

function generateCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let s = ''
  for (let i = 0; i < 8; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  return `${s.slice(0, 4)}-${s.slice(4)}` // XXXX-XXXX  (~8.5e11 space)
}

// ── Input limits ──────────────────────────────────────────────────────
const MAX_BODY_BYTES = 2_000_000
const MAX_LOGS = 5000
const MAX_PLANS = 500
const MAX_BODYWEIGHT = 5000

/** Parse a JSON body, returning null on malformed/oversized input (never throws). */
async function readJson(request: Request): Promise<unknown | null> {
  const len = Number(request.headers.get('Content-Length') ?? '0')
  if (len > MAX_BODY_BYTES) return null
  try {
    return await request.json()
  } catch {
    return null
  }
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const hasStrId = (v: unknown): v is { id: string } =>
  typeof v === 'object' && v !== null && isStr((v as { id: unknown }).id)

// ── Basic fixed-window rate limit (per IP) ────────────────────────────
const RL_WINDOW_MS = 60_000
const RL_MAX = 30

async function rateLimited(env: Env, request: Request): Promise<boolean> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  try {
    const row = await env.DB.prepare(
      'SELECT window_start, count FROM rate_limits WHERE ip = ?'
    ).bind(ip).first<{ window_start: number; count: number }>()

    let windowStart = now
    let count = 1
    if (row && now - row.window_start < RL_WINDOW_MS) {
      windowStart = row.window_start
      count = row.count + 1
      if (count > RL_MAX) return true
    }
    await env.DB.prepare(
      'INSERT INTO rate_limits (ip, window_start, count) VALUES (?, ?, ?) ' +
        'ON CONFLICT(ip) DO UPDATE SET window_start = excluded.window_start, count = excluded.count'
    ).bind(ip, windowStart, count).run()
    return false
  } catch {
    return false // never let the limiter break the API
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) })
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url, origin)
    }

    return env.ASSETS.fetch(request)
  },
}

async function handleApi(request: Request, env: Env, url: URL, origin: string | null): Promise<Response> {
  const path = url.pathname.replace('/api', '')

  // ── POST /api/sync/create ─────────────────────────────────────────
  if (path === '/sync/create' && request.method === 'POST') {
    if (await rateLimited(env, request)) return err('Too many requests — slow down', origin, 429)
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
    return json({ code }, origin)
  }

  // ── POST /api/sync/verify ─────────────────────────────────────────
  if (path === '/sync/verify' && request.method === 'POST') {
    if (await rateLimited(env, request)) return err('Too many requests — slow down', origin, 429)
    const body = await readJson(request)
    const code = (body as { code?: unknown })?.code
    const normalised = isStr(code) ? code.trim().toUpperCase() : ''
    if (!normalised) return err('Missing code', origin)
    const row = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(normalised).first()
    return json({ exists: !!row }, origin)
  }

  // ── /api/sync/:code/push  or  /api/sync/:code/pull ───────────────
  const syncMatch = path.match(/^\/sync\/([A-Z0-9-]+)\/(push|pull)$/)
  if (syncMatch) {
    const [, code, action] = syncMatch

    const codeRow = await env.DB.prepare('SELECT code FROM sync_codes WHERE code = ?')
      .bind(code).first()
    if (!codeRow) return err('Invalid sync code', origin, 404)

    // ── push: per-record upsert, last-write-wins, single atomic batch ──
    if (action === 'push' && request.method === 'POST') {
      const body = await readJson(request)
      if (!body || typeof body !== 'object') return err('Invalid request body', origin)

      const { logs, plans, weightHistory, bodyweight } = body as {
        logs?: unknown
        plans?: unknown
        weightHistory?: unknown
        bodyweight?: unknown
      }

      if (logs !== undefined && !Array.isArray(logs)) return err('logs must be an array', origin)
      if (plans !== undefined && !Array.isArray(plans)) return err('plans must be an array', origin)
      if (bodyweight !== undefined && !Array.isArray(bodyweight)) return err('bodyweight must be an array', origin)
      const logsArr = (logs as unknown[]) ?? []
      const plansArr = (plans as unknown[]) ?? []
      const bwArr = (bodyweight as unknown[]) ?? []
      if (logsArr.length > MAX_LOGS || plansArr.length > MAX_PLANS || bwArr.length > MAX_BODYWEIGHT) {
        return err('Payload too large', origin, 413)
      }

      const nowIso = new Date().toISOString()
      const stmts: D1PreparedStatement[] = []

      for (const log of logsArr) {
        if (!hasStrId(log)) continue
        const updatedMs = Number((log as { updatedAt?: unknown }).updatedAt) || 0
        const deleted = (log as { deleted?: unknown }).deleted ? 1 : 0
        stmts.push(
          env.DB.prepare(
            'INSERT INTO workout_logs (id, sync_code, data, updated_at, updated_ms, deleted) ' +
              'VALUES (?, ?, ?, ?, ?, ?) ' +
              'ON CONFLICT(id) DO UPDATE SET data = excluded.data, sync_code = excluded.sync_code, ' +
              'updated_at = excluded.updated_at, updated_ms = excluded.updated_ms, deleted = excluded.deleted ' +
              'WHERE excluded.updated_ms > workout_logs.updated_ms'
          ).bind((log as { id: string }).id, code, JSON.stringify(log), nowIso, updatedMs, deleted)
        )
      }

      for (const plan of plansArr) {
        if (!hasStrId(plan)) continue
        const updatedMs = Number((plan as { updatedAt?: unknown }).updatedAt) || 0
        const deleted = (plan as { deleted?: unknown }).deleted ? 1 : 0
        stmts.push(
          env.DB.prepare(
            'INSERT INTO custom_plans (id, sync_code, data, updated_at, updated_ms, deleted) ' +
              'VALUES (?, ?, ?, ?, ?, ?) ' +
              'ON CONFLICT(id) DO UPDATE SET data = excluded.data, sync_code = excluded.sync_code, ' +
              'updated_at = excluded.updated_at, updated_ms = excluded.updated_ms, deleted = excluded.deleted ' +
              'WHERE excluded.updated_ms > custom_plans.updated_ms'
          ).bind((plan as { id: string }).id, code, JSON.stringify(plan), nowIso, updatedMs, deleted)
        )
      }

      // Blob tables — only write when non-empty so a cold-start device that
      // hasn't pulled-and-merged yet can't clobber server data with [].
      if (weightHistory && typeof weightHistory === 'object' && Object.keys(weightHistory).length > 0) {
        stmts.push(
          env.DB.prepare(
            'INSERT INTO weight_history (sync_code, data, updated_at) VALUES (?, ?, ?) ' +
              'ON CONFLICT(sync_code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
          ).bind(code, JSON.stringify(weightHistory), nowIso)
        )
      }
      // Per-entry upsert keyed by date — a weigh-in on one device can no longer
      // overwrite the whole history written by another.
      for (const entry of bwArr) {
        if (typeof entry !== 'object' || entry === null) continue
        const date = (entry as { date?: unknown }).date
        if (!isStr(date)) continue
        const updatedMs = Number((entry as { updatedAt?: unknown }).updatedAt) || 0
        const deleted = (entry as { deleted?: unknown }).deleted ? 1 : 0
        stmts.push(
          env.DB.prepare(
            'INSERT INTO bodyweight_entries (sync_code, date, data, updated_ms, deleted) ' +
              'VALUES (?, ?, ?, ?, ?) ' +
              'ON CONFLICT(sync_code, date) DO UPDATE SET data = excluded.data, ' +
              'updated_ms = excluded.updated_ms, deleted = excluded.deleted ' +
              'WHERE excluded.updated_ms > bodyweight_entries.updated_ms'
          ).bind(code, date, JSON.stringify(entry), updatedMs, deleted)
        )
      }

      if (stmts.length > 0) await env.DB.batch(stmts)

      return json({ ok: true, synced: nowIso }, origin)
    }

    // ── pull: return everything, incl. tombstones so deletions propagate ──
    if (action === 'pull' && request.method === 'GET') {
      const [logsResult, plansResult, historyResult, bwEntriesResult, bwBlobResult] = await env.DB.batch([
        env.DB.prepare('SELECT data FROM workout_logs WHERE sync_code = ? ORDER BY updated_ms DESC').bind(code),
        env.DB.prepare('SELECT data FROM custom_plans WHERE sync_code = ?').bind(code),
        env.DB.prepare('SELECT data FROM weight_history WHERE sync_code = ?').bind(code),
        env.DB.prepare('SELECT data FROM bodyweight_entries WHERE sync_code = ? ORDER BY date').bind(code),
        env.DB.prepare('SELECT data FROM bodyweight WHERE sync_code = ?').bind(code),
      ])

      const parse = (res: D1Result) =>
        ((res.results ?? []) as Array<{ data: string }>).map((r) => JSON.parse(r.data))

      const logs = parse(logsResult)
      const plans = parse(plansResult)
      const historyRow = historyResult.results?.[0] as { data: string } | undefined
      const weightHistory = historyRow ? JSON.parse(historyRow.data) : {}

      // Union per-entry rows with any legacy blob; the client merges by date
      // (last-write-wins on updatedAt), so duplicates resolve correctly.
      const bwEntries = parse(bwEntriesResult)
      const bwBlobRow = bwBlobResult.results?.[0] as { data: string } | undefined
      const bwBlob = bwBlobRow ? JSON.parse(bwBlobRow.data) : []
      const bodyweight = [...(Array.isArray(bwBlob) ? bwBlob : []), ...bwEntries]

      return json({ logs, plans, weightHistory, bodyweight }, origin)
    }
  }

  return err('Not found', origin, 404)
}
