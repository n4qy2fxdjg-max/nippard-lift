import { ControllerApp } from '@/components/controller/ControllerApp';

export const metadata = { title: 'Team controller' };

export default async function PlayPage({ params }: { params: Promise<{ gameId: string; teamId: string }> }) {
  const { gameId, teamId } = await params;
  return <ControllerApp gameId={gameId} teamId={teamId} />;
}
