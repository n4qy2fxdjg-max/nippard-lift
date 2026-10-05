/**
 * In-process publish/subscribe used to fan out "game changed" notifications to SSE
 * subscribers. Swap `publish`/`subscribe` for Pusher / Ably / Supabase Realtime to run on
 * multi-instance hosting; clients already fall back to polling when the stream is absent.
 */
import { EventEmitter } from 'node:events';

declare global {
  // eslint-disable-next-line no-var
  var __nadirBus: EventEmitter | undefined;
}

const bus: EventEmitter = globalThis.__nadirBus ?? new EventEmitter();
bus.setMaxListeners(0);
globalThis.__nadirBus = bus;

export interface GameChangedEvent {
  gameId: string;
  version: number;
  phase: string;
}

export function publishGameChanged(event: GameChangedEvent) {
  bus.emit(`game:${event.gameId}`, event);
}

export function subscribeGame(gameId: string, listener: (event: GameChangedEvent) => void): () => void {
  const channel = `game:${gameId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}
