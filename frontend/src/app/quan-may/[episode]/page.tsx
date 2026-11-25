import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PageStyles from '@/components/PageStyles';
import { Episode } from '@/components/quan-may/QuanMay';
import { EPISODE_IDS, type EpisodeId } from '@/lib/quan-may/episodes';

export const dynamicParams = false;

export function generateStaticParams() {
  return EPISODE_IDS.map((episode) => ({ episode }));
}

export const metadata: Metadata = {
  title: 'Quán Mây (thử nghiệm) – Programming EDU',
  robots: { index: false, follow: false },
};

export default async function QuanMayEpisodePage({ params }: { params: Promise<{ episode: string }> }) {
  const { episode } = await params;
  if (!EPISODE_IDS.includes(episode as EpisodeId)) notFound();
  return (
    <>
      <PageStyles hrefs={['/static/css/quan-may-tokens.css']} />
      <Episode id={episode as EpisodeId} />
    </>
  );
}
