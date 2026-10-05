'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Spinner } from '@/components/ui';
import { Wordmark } from '@/components/display/parts';
import { formatClock } from '@/lib/util/format';

interface Info {
  title: string;
  questionText: string;
  instructions: string;
  timerSeconds: number;
  open: boolean;
  full: boolean;
  alreadyAnswered: boolean;
}

export function SurveyTaker({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'intro' | 'answering' | 'done'>('intro');
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    fetch(`/api/survey/${token}`)
      .then(async (r) => (r.ok ? setInfo(await r.json()) : setError((await r.json()).error ?? 'Survey not found')))
      .catch(() => setError('Could not load the survey'));
  }, [token]);

  const submit = async (auto = false) => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const res = await fetch(`/api/survey/${token}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }) });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not submit');
      setStage('done');
    } catch (e) {
      submitted.current = false;
      setError(e instanceof Error ? e.message : 'Could not submit');
      if (auto) setStage('done');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (stage !== 'answering' || endsAt === null) return;
    const i = setInterval(() => {
      const r = Math.max(0, endsAt - Date.now());
      setRemaining(r);
      if (r === 0) {
        clearInterval(i);
        void submit(true);
      }
    }, 200);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, endsAt]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/survey/${token}/start`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not start');
      setEndsAt(Date.now() + body.timerSeconds * 1000);
      setRemaining(body.timerSeconds * 1000);
      setStage('answering');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Wordmark className="justify-center text-lg" />
      <div className="card mt-8">
        {!info && !error ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : null}
        {error && !info ? <p className="text-center text-rose-400">{error}</p> : null}
        {info && stage === 'intro' ? (
          <>
            <p className="eyebrow">Quick survey</p>
            <h1 className="font-display mt-2 text-2xl font-semibold">{info.title}</h1>
            {info.alreadyAnswered ? (
              <p className="mt-3 text-mist-300">You have already answered this one. Thank you!</p>
            ) : !info.open ? (
              <p className="mt-3 text-mist-300">{info.full ? 'This survey has all the responses it needs. Thank you!' : 'This survey is not open right now.'}</p>
            ) : (
              <>
                <p className="mt-3 text-sm text-mist-400">You will see one question and have {info.timerSeconds} seconds to type the first correct answer that comes to mind. Your response is anonymous.</p>
                <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => void start()} loading={busy}>
                  Show me the question
                </Button>
              </>
            )}
            {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          </>
        ) : null}
        {info && stage === 'answering' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="flex items-center justify-between">
              <p className="eyebrow">Answer in</p>
              <span className={`font-display tabular text-2xl ${remaining < 10000 ? 'text-rose-400' : ''}`} role="timer">
                {formatClock(remaining)}
              </span>
            </div>
            <h1 className="font-display mt-3 text-2xl font-semibold leading-snug">{info.questionText}</h1>
            {info.instructions ? <p className="mt-2 text-sm text-mist-400">{info.instructions}</p> : null}
            <Input className="mt-5 text-lg" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" autoFocus autoComplete="off" aria-label="Your answer" />
            <Button type="submit" variant="primary" size="lg" className="mt-3 w-full" disabled={!answer.trim()} loading={busy}>
              Submit
            </Button>
            {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          </form>
        ) : null}
        {stage === 'done' ? (
          <>
            <p className="eyebrow">Thank you</p>
            <p className="mt-2 text-mist-200">Your answer has been recorded{answer ? `: “${answer}”` : ''}. {error ? '' : 'You can close this page.'}</p>
            {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
