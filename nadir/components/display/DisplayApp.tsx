'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameChannel } from '@/lib/realtime/client';
import type { DisplayView } from '@/lib/game-engine/views';
import { useAudio } from '@/components/game/AudioProvider';
import { useReducedMotion } from '@/lib/util/motion';
import { cx, Spinner } from '@/components/ui';
import { JackpotPanel, StandingsStrip, Wordmark } from './parts';
import * as S from './scenes';

function sceneFor(phase: DisplayView['phase']) {
  switch (phase) {
    case 'LOBBY':
      return S.LobbyScene;
    case 'INTRO':
      return S.IntroScene;
    case 'TEAM_INTRO':
      return S.TeamIntroScene;
    case 'ROUND_INTRO':
      return S.RoundIntroScene;
    case 'QUESTION_INTRO':
      return S.CategoryScene;
    case 'QUESTION_REVEALED':
    case 'ACCEPTING_ANSWER':
      return S.QuestionScene;
    case 'ANSWER_LOCKED':
    case 'REVEALING_SCORE':
    case 'SCORE_REVEALED':
      return S.RevealScene;
    case 'PASS_RESULTS':
      return S.PassResultsScene;
    case 'ROUND_RESULTS':
      return S.LeaderboardScene;
    case 'TIEBREAK_INTRO':
      return S.TiebreakScene;
    case 'ELIMINATION':
      return S.EliminationScene;
    case 'HEAD_TO_HEAD_INTRO':
      return S.H2HIntroScene;
    case 'HEAD_TO_HEAD_RESULT':
      return S.H2HResultScene;
    case 'FINAL_INTRO':
      return S.FinalIntroScene;
    case 'FINAL_CATEGORY_SELECTION':
      return S.FinalCategoriesScene;
    case 'FINAL_PROMPTS':
    case 'FINAL_DISCUSSION':
    case 'FINAL_SUBMISSION':
      return S.FinalPromptsScene;
    case 'FINAL_REVEAL':
      return S.FinalRevealScene;
    case 'VICTORY':
      return S.VictoryScene;
    case 'DEFEAT':
      return S.DefeatScene;
    case 'GAME_OVER':
      return S.GameOverScene;
  }
}

/** Scenes that share a component should not re-mount when the phase changes between them. */
function sceneKey(phase: DisplayView['phase'], view: DisplayView) {
  if (phase === 'QUESTION_REVEALED' || phase === 'ACCEPTING_ANSWER') return `question:${view.question?.id}`;
  if (phase === 'ANSWER_LOCKED' || phase === 'REVEALING_SCORE' || phase === 'SCORE_REVEALED') return `reveal:${view.question?.id}:${view.currentTeamId}:${view.currentPoolIndex}`;
  if (phase === 'FINAL_PROMPTS' || phase === 'FINAL_DISCUSSION' || phase === 'FINAL_SUBMISSION') return 'final-prompts';
  return phase;
}

export function DisplayApp({ gameId, embedded, joinUrl: joinUrlProp }: { gameId: string; embedded?: boolean; joinUrl?: string }) {
  const { view, error, connection, clockOffset } = useGameChannel<DisplayView>({ gameId, role: 'display' });
  const audio = useAudio();
  const reducedMotion = useReducedMotion(view?.config.animations ?? true);
  const prev = useRef<DisplayView | null>(null);
  const [joinUrl, setJoinUrl] = useState(joinUrlProp ?? '');

  useEffect(() => {
    if (joinUrlProp) return;
    if (typeof window !== 'undefined' && view) setJoinUrl(`${window.location.origin}/join?code=${view.roomCode}`);
  }, [view, joinUrlProp]);

  // Sound cues on transitions (the display does not mutate state; it only reacts).
  useEffect(() => {
    if (!view || embedded) return;
    const p = prev.current;
    prev.current = view;
    if (!p || !view.config.sound) return;
    if (p.phase !== view.phase) {
      switch (view.phase) {
        case 'QUESTION_REVEALED':
          audio.play('questionReveal');
          break;
        case 'ANSWER_LOCKED':
          audio.play('answerLocked');
          break;
        case 'ROUND_INTRO':
        case 'HEAD_TO_HEAD_INTRO':
        case 'FINAL_INTRO':
          if (view.phase !== 'HEAD_TO_HEAD_INTRO' || p.phase !== 'HEAD_TO_HEAD_RESULT') audio.play('roundIntro');
          break;
        case 'ELIMINATION':
          audio.play('teamEliminated');
          break;
        case 'HEAD_TO_HEAD_RESULT':
          audio.play('headToHeadPoint');
          break;
        case 'VICTORY':
          audio.play('finalWin');
          break;
        case 'DEFEAT':
          audio.play('finalLoss');
          break;
      }
    }
    if (view.jackpot.amount > p.jackpot.amount) audio.play('jackpotIncrease');
    if (view.phase === 'INTRO' && p.phase !== 'INTRO') audio.startMusic();
    if (p.phase === 'INTRO' && view.phase !== 'INTRO') audio.stopMusic();
  }, [view, audio, embedded]);

  const Scene = useMemo(() => (view ? sceneFor(view.phase) : null), [view]);

  if (!view) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950 text-mist-300">
        {error ? <p className="text-lg">{error}</p> : <Spinner />}
      </div>
    );
  }

  const showChrome = view.phase !== 'LOBBY' && view.phase !== 'INTRO' && view.phase !== 'GAME_OVER';
  const showStandings = showChrome && !['TEAM_INTRO', 'ROUND_RESULTS', 'VICTORY', 'DEFEAT', 'FINAL_REVEAL'].includes(view.phase) && !view.phase.startsWith('FINAL') && !view.phase.startsWith('HEAD_TO_HEAD');

  return (
    <div className={cx('tv-root relative flex w-full flex-col overflow-hidden bg-ink-950 text-mist-100', embedded ? 'h-full' : 'h-screen')} style={embedded ? { fontSize: '17.3px' } : undefined}>
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-[10%] -top-[20%] h-[70%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(57,110,190,0.22),transparent_60%)]" />
        <div className="absolute -bottom-[30%] -right-[10%] h-[80%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(232,193,112,0.12),transparent_60%)]" />
        <div className={cx('absolute inset-0 bg-ink-950 transition-opacity duration-1000', view.phase === 'REVEALING_SCORE' || view.phase === 'ELIMINATION' ? 'opacity-40' : 'opacity-0')} />
      </div>

      {showChrome ? (
        <header className="relative z-10 flex items-center justify-between px-[3em] pt-[1.6em]">
          <div className="flex items-center gap-[2em]">
            <Wordmark className="text-[1.2em]" />
            <span className="h-[1.6em] w-px bg-white/15" aria-hidden />
            <span className="eyebrow text-[1em] text-mist-300">{view.stageTitle}</span>
            {view.stage === 'TIEBREAK' ? <span className="rounded-full border border-brass-400/40 px-[0.8em] py-[0.2em] text-[0.9em] text-brass-300">Tie-break</span> : null}
          </div>
          <JackpotPanel amount={view.jackpot.amount} currency={view.config.currency} />
        </header>
      ) : null}

      <main className="relative z-10 flex-1 px-[3em] py-[1.8em]">
        <AnimatePresence mode="wait">
          <motion.div key={sceneKey(view.phase, view)} className="h-full" initial={reducedMotion ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reducedMotion ? undefined : { opacity: 0, y: -10, filter: 'blur(6px)' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            {Scene ? <Scene view={view} clockOffset={clockOffset} reducedMotion={reducedMotion} joinUrl={joinUrl} /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {showStandings ? (
        <footer className="relative z-10 flex items-center justify-between px-[3em] pb-[1.6em]">
          <StandingsStrip rows={view.leaderboard} currentTeamId={view.currentTeamId} />
          <span className="eyebrow text-[0.8em] text-mist-500">Lower is better</span>
        </footer>
      ) : null}

      {!embedded && connection !== 'live' ? (
        <div className="absolute bottom-[0.8em] right-[1em] z-20 flex items-center gap-2 rounded-full bg-ink-800/80 px-3 py-1 text-xs text-mist-400" role="status">
          <span className={cx('h-2 w-2 rounded-full', connection === 'offline' ? 'bg-rose-400' : 'bg-brass-400')} />
          {connection === 'offline' ? 'Offline: reconnecting' : connection === 'polling' ? 'Syncing' : 'Connecting'}
        </div>
      ) : null}
      {!embedded && !audio.unlocked && view.config.sound ? (
        <button className="absolute bottom-[0.8em] left-[1em] z-20 rounded-full border border-white/15 bg-ink-800/80 px-4 py-1.5 text-xs text-mist-200" onClick={audio.unlock}>
          Tap to enable sound
        </button>
      ) : null}
    </div>
  );
}
