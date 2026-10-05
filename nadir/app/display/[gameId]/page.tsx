import { DisplayApp } from '@/components/display/DisplayApp';

export const metadata = { title: 'Display' };

export default async function DisplayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <DisplayApp gameId={gameId} />;
}
