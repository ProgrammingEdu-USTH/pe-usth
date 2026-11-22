import type { ReactNode } from 'react';
import PageStyles from '@/components/PageStyles';

const TOKENS = ['/static/css/studio-tokens.css', '/static/css/bookshelf-tokens.css'];

export default function LofiDarkPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          min-height: 100%;
          background: #14121b;
        }
      `}</style>
      <PageStyles hrefs={TOKENS} />
      {children}
    </>
  );
}
