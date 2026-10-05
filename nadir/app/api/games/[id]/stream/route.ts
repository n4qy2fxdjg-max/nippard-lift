import { NextRequest } from 'next/server';
import { subscribeGame } from '@/lib/realtime/bus';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events: emits `{version, phase}` whenever the game changes. Clients then
 * fetch their role-scoped view. A heartbeat keeps proxies from closing the connection.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id }, select: { version: true, status: true } });
  if (!game) return new Response('Not found', { status: 404 });
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* closed */
        }
      };
      send('hello', { version: game.version, status: game.status, serverNow: Date.now() });
      unsubscribe = subscribeGame(id, (e) => send('change', e));
      heartbeat = setInterval(() => send('ping', { t: Date.now() }), 15000);
      req.signal.addEventListener('abort', () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
