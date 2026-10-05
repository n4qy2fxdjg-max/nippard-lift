import { HostApp } from '@/components/host/HostApp';

export const metadata = { title: 'Host' };

export default async function HostPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <HostApp gameId={gameId} />;
}
