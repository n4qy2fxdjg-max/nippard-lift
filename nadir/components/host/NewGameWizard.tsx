'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Field, Input, Select, Toggle, cx } from '@/components/ui';
import { CURRENCIES, formatMoney } from '@/lib/game-engine/helpers';
import { DEFAULT_CONFIG, FORMAT_LABELS, defaultRoundPlans, type GameConfig, type RoundPlan } from '@/lib/game-engine/types';
import { TEAM_COLORS } from '@/lib/util/ids';
import { AdminGate } from './AdminGate';

interface QuestionSummary {
  id: string;
  category: string;
  text: string;
  format: keyof typeof FORMAT_LABELS;
  difficulty: number;
  status: string;
  answerCount: number;
  zeroCount: number;
  usedCount: number;
}
interface FinalCat {
  id: string;
  title: string;
  status: string;
  prompts: { id: string; text: string }[];
}

const STEPS = ['Name', 'Currency', 'Jackpot', 'Teams', 'Players', 'Rounds', 'Questions', 'Launch'];

export function NewGameWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [locked, setLocked] = useState(false);
  const [name, setName] = useState(`Quiz night ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
  const [config, setConfig] = useState<Omit<GameConfig, 'rounds'>>({ ...DEFAULT_CONFIG });
  const [bank, setBank] = useState<Record<string, number>>({});
  const [jackpotOverride, setJackpotOverride] = useState<string>('');
  const [teams, setTeams] = useState<{ name: string; players: string[]; color: string }[]>(Array.from({ length: 6 }, (_, i) => ({ name: '', players: [''], color: TEAM_COLORS[i] })));
  const [passes, setPasses] = useState(1);
  const [rounds, setRounds] = useState<RoundPlan[]>(defaultRoundPlans(6, 1));
  const [mode, setMode] = useState<'MANUAL' | 'RANDOM' | 'SMART_RANDOM'>('SMART_RANDOM');
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [finals, setFinals] = useState<FinalCat[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    (async () => {
      const [g, q, f] = await Promise.all([fetch('/api/games'), fetch('/api/admin/questions?status=READY'), fetch('/api/admin/final-categories')]);
      if (g.status === 401) return setLocked(true);
      const gb = await g.json();
      setBank(Object.fromEntries((gb.banks as { currency: string; amount: number }[]).map((b) => [b.currency, b.amount])));
      if (q.ok) setQuestions((await q.json()).items);
      if (f.ok) setFinals((await f.json()).filter((c: FinalCat) => c.status === 'READY' || c.status === 'USED'));
    })();
  }, []);

  // Keep the round structure in step with the team count unless the host customised it.
  const teamCount = teams.length;
  useEffect(() => {
    setRounds((prev) => {
      const elim = prev.filter((r) => r.type === 'ELIMINATION').length;
      if (elim === Math.max(0, teamCount - 2) && prev.some((r) => r.type === 'HEAD_TO_HEAD')) return prev.map((r) => (r.type === 'ELIMINATION' ? { ...r, passes } : r));
      return defaultRoundPlans(teamCount, passes);
    });
  }, [teamCount, passes]);

  const startingJackpot = jackpotOverride !== '' ? Number(jackpotOverride) : bank[config.currency] ?? config.startingJackpot;
  const readyCount = questions.length;
  const neededQuestions = rounds.reduce((n, r) => n + (r.type === 'ELIMINATION' ? r.passes : r.type === 'HEAD_TO_HEAD' ? r.bestOf : 0), 0);
  const validTeams = teams.every((t) => t.name.trim()) && teams.length >= 2;

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 3:
        return validTeams;
      case 6:
        return finals.length > 0 && readyCount >= Math.min(neededQuestions, 1);
      default:
        return true;
    }
  }, [step, name, validTeams, finals.length, readyCount, neededQuestions]);

  const launch = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, selectionMode: mode, jackpotOverride: jackpotOverride !== '' ? Number(jackpotOverride) : null, teams: teams.map((t) => ({ name: t.name.trim(), players: t.players.map((p) => p.trim()).filter(Boolean), color: t.color })), config: { ...config, rounds } }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not create the game');
      router.push(`/host/${body.id}?t=${body.hostToken}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the game');
      setBusy(false);
    }
  };

  if (locked) return <AdminGate onUnlocked={() => setLocked(false)} />;

  const setRound = (i: number, patch: Partial<RoundPlan>) => setRounds((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">New game</h1>
        <Link href="/host" className="text-sm text-mist-400 hover:text-mist-100">
          Cancel
        </Link>
      </div>
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i < step && setStep(i)} className={cx('rounded-full border px-3 py-1 text-xs font-semibold', i === step ? 'border-brass-400 bg-brass-400/15 text-brass-300' : i < step ? 'border-white/15 text-mist-200' : 'border-white/5 text-mist-500')} aria-current={i === step ? 'step' : undefined}>
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <section className="card mt-6 min-h-[22rem]">
        {step === 0 ? (
          <div className="space-y-4">
            <Field label="Game name" htmlFor="gname">
              <Input id="gname" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <p className="text-sm text-mist-400">Shown on the TV intro and in history.</p>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="space-y-4">
            <Field label="Currency" htmlFor="currency">
              <Select id="currency" value={config.currency} onChange={(e) => setConfig((c) => ({ ...c, currency: e.target.value }))}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-sm text-mist-400">The jackpot bank is kept per currency: a rolled-over jackpot in GBP carries into the next GBP game.</p>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-brass-400/30 bg-brass-400/5 p-4">
              <p className="eyebrow">Carried over from the last game</p>
              <p className="font-display tabular text-3xl text-brass-300">{formatMoney(bank[config.currency] ?? config.startingJackpot, config.currency)}</p>
              <p className="mt-1 text-xs text-mist-400">If the last final was lost this already includes the +{formatMoney(config.failedFinalRollover, config.currency)} rollover.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Override opening jackpot" hint="Leave empty to use the bank" htmlFor="jpo">
                <Input id="jpo" type="number" min={0} value={jackpotOverride} onChange={(e) => setJackpotOverride(e.target.value)} placeholder={String(bank[config.currency] ?? config.startingJackpot)} />
              </Field>
              <Field label="Reset-to jackpot (after a win)" htmlFor="sj">
                <Input id="sj" type="number" min={0} value={config.startingJackpot} onChange={(e) => setConfig((c) => ({ ...c, startingJackpot: Number(e.target.value) }))} />
              </Field>
              <Field label="Zero answer bonus" htmlFor="zb">
                <Input id="zb" type="number" min={0} value={config.zeroBonus} onChange={(e) => setConfig((c) => ({ ...c, zeroBonus: Number(e.target.value) }))} />
              </Field>
              <Field label="Failed final rollover" htmlFor="ro">
                <Input id="ro" type="number" min={0} value={config.failedFinalRollover} onChange={(e) => setConfig((c) => ({ ...c, failedFinalRollover: Number(e.target.value) }))} />
              </Field>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-mist-400">2 to 8 teams. Names appear on the TV.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTeams((t) => t.slice(0, -1))} disabled={teams.length <= 2}>
                  − team
                </Button>
                <Button size="sm" onClick={() => setTeams((t) => [...t, { name: '', players: [''], color: TEAM_COLORS[t.length % TEAM_COLORS.length] }])} disabled={teams.length >= 8}>
                  + team
                </Button>
              </div>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {teams.map((t, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input type="color" value={t.color} onChange={(e) => setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} aria-label={`Team ${i + 1} colour`} className="h-9 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
                  <Input value={t.name} onChange={(e) => setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder={`Team ${i + 1} name`} aria-label={`Team ${i + 1} name`} />
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" onClick={() => setTeams((ts) => ts.map((t, i) => ({ ...t, name: t.name || ['Orion', 'Nova', 'Atlas', 'Echo', 'Vega', 'Lyra', 'Juno', 'Rigel'][i] })))}>
              Fill blank names
            </Button>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {teams.map((t, i) => (
              <div key={i} className="rounded-xl border border-white/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} /> {t.name || `Team ${i + 1}`}
                </p>
                <div className="mt-2 space-y-1.5">
                  {t.players.map((p, j) => (
                    <Input key={j} value={p} onChange={(e) => setTeams((ts) => ts.map((x, k) => (k === i ? { ...x, players: x.players.map((pp, l) => (l === j ? e.target.value : pp)) } : x)))} placeholder={`Player ${j + 1}`} aria-label={`${t.name} player ${j + 1}`} />
                  ))}
                  {t.players.length < 4 ? (
                    <Button size="sm" variant="ghost" onClick={() => setTeams((ts) => ts.map((x, k) => (k === i ? { ...x, players: [...x.players, ''] } : x)))}>
                      + player
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {step === 5 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Passes per elimination round" htmlFor="passes">
                <Select id="passes" value={passes} onChange={(e) => setPasses(Number(e.target.value))}>
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Head-to-Head best of" htmlFor="bo">
                <Select id="bo" value={rounds.find((r) => r.type === 'HEAD_TO_HEAD')?.bestOf ?? 3} onChange={(e) => setRounds((rs) => rs.map((r) => (r.type === 'HEAD_TO_HEAD' ? { ...r, bestOf: Number(e.target.value) } : r)))}>
                  {[1, 3, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Final discussion (seconds)" htmlFor="fd">
                <Input id="fd" type="number" min={10} max={600} value={config.finalDiscussionSeconds} onChange={(e) => setConfig((c) => ({ ...c, finalDiscussionSeconds: Number(e.target.value) }))} />
              </Field>
            </div>
            <ol className="space-y-2">
              {rounds.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <span className="w-20 font-semibold">{r.type === 'FINAL' ? 'Final' : r.type === 'HEAD_TO_HEAD' ? 'Head-to-Head' : `Round ${i + 1}`}</span>
                  {r.type === 'ELIMINATION' ? (
                    <>
                      <span className="text-mist-400">{teamCount - rounds.slice(0, i).reduce((n, x) => n + (x.type === 'ELIMINATION' ? x.eliminateCount : 0), 0)} teams play</span>
                      <label className="ml-auto flex items-center gap-2 text-xs text-mist-400">
                        eliminate
                        <Select className="w-16 py-1" value={r.eliminateCount} onChange={(e) => setRound(i, { eliminateCount: Number(e.target.value) })}>
                          {[1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </>
                  ) : r.type === 'HEAD_TO_HEAD' ? (
                    <span className="text-mist-400">2 teams · first to {Math.floor(r.bestOf / 2) + 1}</span>
                  ) : (
                    <span className="text-mist-400">1 team · {config.finalAnswerCount} answers · one zero wins</span>
                  )}
                </li>
              ))}
            </ol>
            <Button size="sm" variant="ghost" onClick={() => setRounds(defaultRoundPlans(teamCount, passes))}>
              Reset to default structure
            </Button>
            <button type="button" className="text-sm text-cyan-300 underline" onClick={() => setAdvanced((a) => !a)}>
              {advanced ? 'Hide' : 'Show'} advanced settings
            </button>
            {advanced ? (
              <div className="grid gap-4 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
                <Field label="Incorrect answer score" htmlFor="inc">
                  <Input id="inc" type="number" min={1} max={100} value={config.incorrectScore} onChange={(e) => setConfig((c) => ({ ...c, incorrectScore: Number(e.target.value) }))} />
                </Field>
                <Field label="Team answer time limit (s, 0 = none)" htmlFor="tal">
                  <Input id="tal" type="number" min={0} value={config.teamAnswerSeconds} onChange={(e) => setConfig((c) => ({ ...c, teamAnswerSeconds: Number(e.target.value) }))} />
                </Field>
                <Field label="Final answers" htmlFor="fac">
                  <Select id="fac" value={config.finalAnswerCount} onChange={(e) => setConfig((c) => ({ ...c, finalAnswerCount: Number(e.target.value) }))}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="H2H opening advantage" htmlFor="adv">
                  <Select id="adv" value={config.h2hAdvantage} onChange={(e) => setConfig((c) => ({ ...c, h2hAdvantage: e.target.value as GameConfig['h2hAdvantage'] }))}>
                    <option value="BEST_CHOOSES">Better team chooses</option>
                    <option value="BEST_FIRST">Better team goes first</option>
                    <option value="BEST_SECOND">Better team goes second</option>
                  </Select>
                </Field>
                <Field label="H2H tie rule" htmlFor="tie">
                  <Select id="tie" value={config.h2hTieRule} onChange={(e) => setConfig((c) => ({ ...c, h2hTieRule: e.target.value as GameConfig['h2hTieRule'] }))}>
                    <option value="NO_POINT">Tie: no point</option>
                    <option value="SUDDEN_DEATH">Tie: sudden death question</option>
                  </Select>
                </Field>
                <Field label="Linked categories scoring" htmlFor="ls">
                  <Select id="ls" value={config.linkedScoring} onChange={(e) => setConfig((c) => ({ ...c, linkedScoring: e.target.value as GameConfig['linkedScoring'] }))}>
                    <option value="SUM">Sum of both answers</option>
                    <option value="MAX">Worse answer counts</option>
                    <option value="MIN">Better answer counts</option>
                  </Select>
                </Field>
                <Field label="Final answer matching" htmlFor="fam">
                  <Select id="fam" value={config.finalAnswerMode} onChange={(e) => setConfig((c) => ({ ...c, finalAnswerMode: e.target.value as GameConfig['finalAnswerMode'] }))}>
                    <option value="POOL">Any prompt (common pool)</option>
                    <option value="PER_PROMPT">Each answer names its prompt</option>
                  </Select>
                </Field>
                <Field label="Zero answer term" htmlFor="zt">
                  <Input id="zt" value={config.zeroTerm} onChange={(e) => setConfig((c) => ({ ...c, zeroTerm: e.target.value }))} />
                </Field>
                <Field label="Prize" htmlFor="prize">
                  <div className="flex gap-2">
                    <Select id="prize" className="w-32" value={config.prize.type} onChange={(e) => setConfig((c) => ({ ...c, prize: { ...c.prize, type: e.target.value as GameConfig['prize']['type'] } }))}>
                      <option value="TROPHY">Trophy</option>
                      <option value="BADGE">Badge</option>
                      <option value="CUSTOM">Custom</option>
                      <option value="NONE">None</option>
                    </Select>
                    <Input value={config.prize.label} onChange={(e) => setConfig((c) => ({ ...c, prize: { ...c.prize, label: e.target.value } }))} placeholder="Prize label" />
                  </div>
                </Field>
                <div className="space-y-1 sm:col-span-3">
                  <Toggle checked={config.autoReveal} onChange={(v) => setConfig((c) => ({ ...c, autoReveal: v }))} label="Auto-reveal score as soon as an answer is locked" />
                  <Toggle checked={config.animations} onChange={(v) => setConfig((c) => ({ ...c, animations: v }))} label="Animations on the TV" />
                  <Toggle checked={config.sound} onChange={(v) => setConfig((c) => ({ ...c, sound: v }))} label="Sound on the TV" />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {step === 6 ? (
          <QuestionStep mode={mode} setMode={setMode} questions={questions} rounds={rounds} setRounds={setRounds} finals={finals} needed={neededQuestions} />
        ) : null}
        {step === 7 ? (
          <div className="space-y-3 text-sm">
            <h2 className="text-lg font-semibold">{name}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="rounded-xl border border-white/10 p-3">
                <p className="eyebrow">Opening jackpot</p>
                <p className="font-display tabular text-2xl text-brass-300">{formatMoney(startingJackpot, config.currency)}</p>
              </li>
              <li className="rounded-xl border border-white/10 p-3">
                <p className="eyebrow">Structure</p>
                <p>
                  {rounds.filter((r) => r.type === 'ELIMINATION').length} elimination round{rounds.filter((r) => r.type === 'ELIMINATION').length === 1 ? '' : 's'} ({passes} pass{passes > 1 ? 'es' : ''}) → Head-to-Head (best of {rounds.find((r) => r.type === 'HEAD_TO_HEAD')?.bestOf}) → Final
                </p>
              </li>
              <li className="rounded-xl border border-white/10 p-3 sm:col-span-2">
                <p className="eyebrow">Teams</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {teams.map((t, i) => (
                    <Badge key={i}>
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name} {t.players.filter(Boolean).length ? `(${t.players.filter(Boolean).join(', ')})` : ''}
                    </Badge>
                  ))}
                </div>
              </li>
              <li className="rounded-xl border border-white/10 p-3 sm:col-span-2">
                <p className="eyebrow">Questions</p>
                <p>
                  {mode === 'MANUAL' ? 'Manual selection; any gaps are filled automatically.' : mode === 'SMART_RANDOM' ? 'Smart random: varied categories, formats and difficulty; unused questions preferred.' : 'Random.'} {neededQuestions} needed · {readyCount} ready in the bank.
                </p>
              </li>
            </ul>
            {error ? <p className="text-rose-400">{error}</p> : null}
          </div>
        ) : null}
      </section>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={() => void launch()} loading={busy}>
            Launch game
          </Button>
        )}
      </div>
    </main>
  );
}

function QuestionStep({ mode, setMode, questions, rounds, setRounds, finals, needed }: { mode: 'MANUAL' | 'RANDOM' | 'SMART_RANDOM'; setMode: (m: 'MANUAL' | 'RANDOM' | 'SMART_RANDOM') => void; questions: QuestionSummary[]; rounds: RoundPlan[]; setRounds: (f: (r: RoundPlan[]) => RoundPlan[]) => void; finals: FinalCat[]; needed: number }) {
  const [filter, setFilter] = useState('');
  const [picking, setPicking] = useState<{ round: number; slot: number } | null>(null);
  const assigned = new Set(rounds.flatMap((r) => r.questionIds));
  const filtered = questions.filter((q) => !assigned.has(q.id) && (q.text + q.category).toLowerCase().includes(filter.toLowerCase()));
  const finalRound = rounds.findIndex((r) => r.type === 'FINAL');
  const chosenFinals = rounds[finalRound]?.finalCategoryIds ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {(['SMART_RANDOM', 'RANDOM', 'MANUAL'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={cx('rounded-xl border p-3 text-left', mode === m ? 'border-brass-400 bg-brass-400/10' : 'border-white/10 hover:bg-white/5')} aria-pressed={mode === m}>
            <p className="font-semibold">{m === 'SMART_RANDOM' ? 'Smart random' : m === 'RANDOM' ? 'Random' : 'Manual'}</p>
            <p className="mt-1 text-xs text-mist-400">{m === 'SMART_RANDOM' ? 'Varies category, format and difficulty; avoids recently used questions.' : m === 'RANDOM' ? 'Any ready question, shuffled.' : 'Pick each question yourself. Empty slots are filled smartly.'}</p>
          </button>
        ))}
      </div>
      <p className="text-sm text-mist-400">
        {questions.length} ready questions in the bank · {needed} needed. {questions.length < needed ? <span className="text-rose-400">Add more READY questions in Admin before launching.</span> : null}
      </p>
      {mode === 'MANUAL' ? (
        <div className="space-y-2">
          {rounds.map((r, i) =>
            r.type === 'FINAL' ? null : (
              <div key={i} className="rounded-xl border border-white/10 p-3">
                <p className="text-sm font-semibold">{r.type === 'HEAD_TO_HEAD' ? 'Head-to-Head' : `Round ${i + 1}`}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: r.type === 'HEAD_TO_HEAD' ? r.bestOf + 2 : r.passes }).map((_, slot) => {
                    const qid = r.questionIds[slot];
                    const q = questions.find((x) => x.id === qid);
                    return (
                      <button key={slot} type="button" onClick={() => setPicking({ round: i, slot })} className={cx('max-w-xs rounded-lg border px-3 py-1.5 text-left text-xs', q ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-dashed border-white/20 text-mist-500')}>
                        {q ? `${q.category}: ${q.text.slice(0, 50)}` : r.type === 'HEAD_TO_HEAD' ? `H2H question ${slot + 1} (auto)` : `Pass ${slot + 1} (auto)`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ),
          )}
          {picking ? (
            <div className="rounded-xl border border-brass-400/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search questions" />
                <Button size="sm" variant="ghost" onClick={() => setPicking(null)}>
                  Close
                </Button>
              </div>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
                {filtered.map((q) => (
                  <li key={q.id}>
                    <button type="button" className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10" onClick={() => { setRounds((rs) => rs.map((r, j) => { if (j !== picking.round) return r; const ids = [...r.questionIds]; ids[picking.slot] = q.id; return { ...r, questionIds: ids.map((x) => x ?? '').filter((x, k) => x || k < ids.length) }; })); setPicking(null); }}>
                      <span className="text-xs uppercase tracking-wider text-mist-500">{q.category} · {FORMAT_LABELS[q.format]} · {q.zeroCount} zero</span>
                      <p>{q.text}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <div>
        <p className="label">Final categories offered (choose up to 5; empty = first five ready)</p>
        {finals.length === 0 ? <p className="text-sm text-rose-400">No final categories exist. Create one in Admin → Final categories.</p> : null}
        <div className="flex flex-wrap gap-2">
          {finals.map((c) => {
            const on = chosenFinals.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => setRounds((rs) => rs.map((r) => (r.type === 'FINAL' ? { ...r, finalCategoryIds: on ? r.finalCategoryIds.filter((x) => x !== c.id) : r.finalCategoryIds.length >= 5 ? r.finalCategoryIds : [...r.finalCategoryIds, c.id] } : r)))} className={cx('rounded-full border px-3 py-1 text-sm', on ? 'border-brass-400 bg-brass-400/15 text-brass-300' : 'border-white/15 text-mist-300')} aria-pressed={on}>
                {c.title} <span className="text-xs text-mist-500">({c.prompts.length})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
