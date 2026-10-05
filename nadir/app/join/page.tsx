import { Suspense } from 'react';
import { JoinForm } from '@/components/controller/JoinForm';

export const metadata = { title: 'Join a game' };

export default function JoinPage() {
  return (
    <main className="safe-pad flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Suspense>
        <JoinForm />
      </Suspense>
    </main>
  );
}
