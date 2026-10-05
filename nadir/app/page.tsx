import Link from 'next/link';
import { Wordmark } from '@/components/display/parts';

export default function Home() {
  const tiles = [
    { href: '/host', title: 'Host', body: 'Create a game, run the show, control every reveal.', tone: 'brass' },
    { href: '/join', title: 'Join', body: 'Enter the room code on your phone and become a team controller.', tone: 'cyan' },
    { href: '/admin', title: 'Admin', body: 'Question bank, surveys, final categories, analytics and history.', tone: 'mist' },
  ];
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <Wordmark className="text-2xl" />
      <h1 className="font-display mt-8 max-w-3xl text-balance text-5xl font-semibold leading-tight sm:text-6xl">The quiz where the rarest right answer wins.</h1>
      <p className="mt-5 max-w-2xl text-lg text-mist-400">
        Every question was put to 100 people. Give a correct answer and score the number who said the same. <span className="text-mist-100">Lower is better.</span> Find an answer nobody gave, a <span className="text-brass-300">Ghost Answer</span>, and the jackpot grows. One Ghost Answer in the Final wins it all.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card group transition hover:border-white/25 hover:bg-white/8">
            <p className={t.tone === 'brass' ? 'eyebrow text-brass-300' : t.tone === 'cyan' ? 'eyebrow text-cyan-300' : 'eyebrow'}>{t.title}</p>
            <p className="mt-2 text-mist-200">{t.body}</p>
            <p className="mt-4 text-sm text-mist-500 transition group-hover:text-mist-200">Open →</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-xs text-mist-600">One laptop hosts, one TV displays, phones answer. Everything stays in sync.</p>
    </main>
  );
}
