'use client';
import { useState } from 'react';
import { Button, Input } from '@/components/ui';

/** Shown when the API answers 401: asks for the admin password and stores the cookie. */
export function AdminGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card mx-auto mt-16 max-w-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
        setBusy(false);
        if (res.ok) onUnlocked();
        else setErr('Wrong password');
      }}
    >
      <p className="eyebrow">Host / admin sign-in</p>
      <p className="mt-2 text-sm text-mist-400">This area is protected by the ADMIN_PASSWORD environment variable.</p>
      <Input className="mt-4" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus aria-label="Admin password" />
      {err ? <p className="mt-2 text-sm text-rose-400">{err}</p> : null}
      <Button type="submit" variant="primary" className="mt-4 w-full" loading={busy}>
        Sign in
      </Button>
    </form>
  );
}
