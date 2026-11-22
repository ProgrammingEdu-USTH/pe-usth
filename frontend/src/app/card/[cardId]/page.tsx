import type { Metadata } from 'next';

import LofiConceptCardView from '@/components/bookshelf/LofiConceptCardView';
import LofiDarkPageShell from '@/components/ui/LofiDarkPageShell';

export const metadata: Metadata = {
  title: 'Hồ sơ khái niệm SQL – Programming EDU',
  description: 'Tóm tắt khái niệm và câu hỏi củng cố kiến thức thiết kế cơ sở dữ liệu.',
};

export default async function ConceptCardPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;

  return (
    <LofiDarkPageShell>
      <LofiConceptCardView key={cardId} cardId={cardId} />
    </LofiDarkPageShell>
  );
}
