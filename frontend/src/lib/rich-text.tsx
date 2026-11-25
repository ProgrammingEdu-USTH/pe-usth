// Dựng các token của rich-tokens.ts. Dùng chung kiểu `code` với withInlineCode.
import { richTokens, type RichToken } from './rich-tokens';
import c from './inline-code.module.css';

function render(tokens: RichToken[]): React.ReactNode[] {
  return tokens.map((t, i) => {
    if (t.type === 'text') return t.text;
    if (t.type === 'code')
      return (
        <code key={i} className={c.inlineCode}>
          {t.text}
        </code>
      );
    if (t.type === 'bold') return <strong key={i}>{render(t.children)}</strong>;
    // Liên kết ra ngoài mở tab mới để người học không mất chỗ đang đọc.
    const outside = t.href.startsWith('http');
    return (
      <a key={i} href={t.href} {...(outside ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {render(t.children)}
      </a>
    );
  });
}

export function withRichText(text: string): React.ReactNode {
  return render(richTokens(text));
}
