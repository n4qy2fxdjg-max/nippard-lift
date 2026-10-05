import { SurveyTaker } from '@/components/survey/SurveyTaker';

export const metadata = { title: 'Survey' };

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SurveyTaker token={token} />;
}
