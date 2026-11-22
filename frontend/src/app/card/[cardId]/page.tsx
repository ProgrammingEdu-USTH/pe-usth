'use client';

// Trang card khái niệm chen giữa 2 bài học SQL Trung cấp / Nâng cao.
import { use } from 'react';

import LegacyScripts from '@/components/LegacyScripts';
import PageStyles from '@/components/PageStyles';

export default function ConceptCardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = use(params);

  return (
    <>
      <PageStyles hrefs={['/static/css/pages/concept_card.inline.css', '/static/css/edu-theme.css', '/static/css/edu-card.css']} />
      <title>Concept Card</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className="cc-top">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="cc-back" id="cc-back-link" href="/bookshelf/sql">← Về tủ sách SQL</a>
      </div>
      <main id="card-root"><div className="cc-missing">Đang mở hồ sơ…</div></main>

      <LegacyScripts
        srcs={[
          '/static/js/lesson_content_tc.js',
          '/static/js/lesson_content_nc.js',
          '/static/js/pages/concept_card.inline.js',
        ]}
        prepare={() => document.body.setAttribute('data-card-id', cardId)}
      />
    </>
  );
}
