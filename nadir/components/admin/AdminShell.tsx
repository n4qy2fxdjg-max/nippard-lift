'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useState } from 'react';
import { cx } from '@/components/ui';
import { AdminGate } from '@/components/host/AdminGate';

const NAV = [
  { href: '/admin/questions', label: 'Question bank' },
  { href: '/admin/final-categories', label: 'Final categories' },
  { href: '/admin/surveys', label: 'Surveys' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/history', label: 'Game history' },
];

const LockCtx = createContext<{ lock: () => void }>({ lock: () => undefined });

export function useAdminApi() {
  const { lock } = useContext(LockCtx);
  return useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, cache: 'no-store' });
      if (res.status === 401) {
        lock();
        throw new Error('Sign in required');
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      return body as T;
    },
    [lock],
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [locked, setLocked] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <LockCtx.Provider value={{ lock: () => setLocked(true) }}>
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-white/10 px-4 py-6 md:block">
          <Link href="/" className="font-display text-lg font-semibold tracking-[0.18em]">
            NADIR
          </Link>
          <p className="eyebrow mt-1">Admin</p>
          <nav className="mt-6 space-y-1" aria-label="Admin">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cx('block rounded-lg px-3 py-2 text-sm', path.startsWith(n.href) ? 'bg-white/10 font-semibold text-mist-100' : 'text-mist-400 hover:bg-white/5 hover:text-mist-100')} aria-current={path.startsWith(n.href) ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-white/10 pt-4 text-sm">
            <Link href="/host" className="block rounded-lg px-3 py-2 text-brass-300 hover:bg-white/5">
              Host dashboard →
            </Link>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <nav className="flex gap-1 overflow-auto border-b border-white/10 px-3 py-2 md:hidden" aria-label="Admin (mobile)">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs', path.startsWith(n.href) ? 'bg-white/10 font-semibold' : 'text-mist-400')}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto w-full max-w-6xl px-5 py-8" key={key}>
            {locked ? (
              <AdminGate
                onUnlocked={() => {
                  setLocked(false);
                  setKey((k) => k + 1);
                }}
              />
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </LockCtx.Provider>
  );
}

export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {children}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
