'use client';
import { motion } from 'framer-motion';
import { cx } from '@/components/ui';
import type { PublicBoardItem, PublicQuestion } from '@/lib/game-engine/views';

interface Props {
  question: PublicQuestion;
  items: PublicBoardItem[];
  selectedId?: string | null;
  highlightId?: string | null;
  onSelect?: (id: string) => void;
  size?: 'tv' | 'phone' | 'compact';
  reducedMotion?: boolean;
}

/** Renders any board-style question (text cards, clues, images, partial/scrambled puzzles). */
export function BoardGrid({ question, items, selectedId, highlightId, onSelect, size = 'tv', reducedMotion }: Props) {
  const cols = question.settings.boardColumns ?? (items.length > 9 ? 4 : 3);
  const tv = size === 'tv';
  const phone = size === 'phone';
  const numbered = question.format === 'PICTURE' && (question.settings.pictureMode === 'NUMBERED' || question.settings.pictureMode === 'IMAGE_LETTERS');
  return (
    <div className={cx('grid w-full', tv ? 'gap-[1.1em]' : 'gap-2.5')} style={{ gridTemplateColumns: `repeat(${phone ? Math.min(cols, 2) : cols}, minmax(0, 1fr))` }} role={onSelect ? 'listbox' : 'list'} aria-label="Board">
      {items.map((item, i) => {
        const used = item.used;
        const selected = selectedId === item.id;
        const highlighted = highlightId === item.id;
        const interactive = !!onSelect && !used;
        const content = (
          <>
            {item.imageUrl ? (
              <div className={cx('relative w-full overflow-hidden rounded-lg bg-ink-900', tv ? 'aspect-[3/2]' : 'aspect-[3/2]')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={numbered ? `Picture ${i + 1}` : item.label || 'Board picture'} className={cx('h-full w-full object-contain transition', used && 'opacity-30 grayscale')} draggable={false} />
                {numbered ? <span className={cx('absolute left-1.5 top-1.5 rounded-md bg-ink-950/80 px-2 font-display font-semibold text-brass-300', tv ? 'text-[1.6em]' : 'text-sm')}>{i + 1}</span> : null}
              </div>
            ) : null}
            {item.clue ? <p className={cx('font-mono tracking-wider', tv ? 'text-[1.5em]' : phone ? 'text-sm' : 'text-xs', item.kind === 'CLUE' && 'font-sans tracking-normal', item.kind === 'CLUE' && tv && 'text-[1.7em]')}>{item.clue}</p> : null}
            {item.label && !numbered ? <p className={cx('text-balance font-semibold', tv ? 'text-[1.7em]' : phone ? 'text-base' : 'text-sm', item.imageUrl && 'mt-1 text-mist-400')}>{item.label}</p> : null}
          </>
        );
        const cls = cx(
          'relative flex flex-col items-center justify-center rounded-2xl border text-center transition-colors',
          tv ? 'min-h-[5.5em] p-[1em]' : phone ? 'min-h-[64px] p-3' : 'min-h-[52px] p-2',
          used ? 'border-white/5 bg-ink-900/40 text-mist-500 line-through decoration-mist-500/60' : 'glass text-mist-100',
          selected && 'border-brass-400 bg-brass-400/15 text-brass-300 shadow-glow-brass',
          highlighted && !selected && 'border-cyan-400/70 bg-cyan-500/10',
          interactive && 'cursor-pointer hover:border-white/30 hover:bg-white/10 active:scale-[0.98]',
        );
        return (
          <motion.div key={item.id} layout={!reducedMotion} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : Math.min(0.6, i * 0.05), duration: 0.35 }}>
            {onSelect ? (
              <button type="button" className={cx(cls, 'w-full')} onClick={() => interactive && onSelect(item.id)} disabled={!interactive} role="option" aria-selected={selected} aria-disabled={used}>
                {content}
              </button>
            ) : (
              <div className={cls} role="listitem" aria-label={used ? `${item.label || item.clue} (taken)` : item.label || item.clue}>
                {content}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
