import { QuestionEditor } from '@/components/admin/QuestionEditor';

export const metadata = { title: 'Edit question' };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuestionEditor id={id} />;
}
