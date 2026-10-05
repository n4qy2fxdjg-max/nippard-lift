import { HistoryDetail } from '@/components/admin/History';

export const metadata = { title: 'Game' };

export default async function HistoryGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HistoryDetail id={id} />;
}
