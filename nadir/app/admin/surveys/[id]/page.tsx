import { SurveyDetail } from '@/components/admin/Surveys';

export const metadata = { title: 'Survey' };

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyDetail id={id} />;
}
