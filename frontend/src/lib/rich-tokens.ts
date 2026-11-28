// Phần Markdown nội tuyến mà các bài đọc tĩnh dùng: `code`, **đậm**, [liên kết](url).
// Chỉ khối có cờ `rich` mới đi qua đây — khoá Python giữ nguyên cách hiện cũ,
// vì `**` trong văn bản của nó là phép luỹ thừa.

export type RichToken =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'bold'; children: RichToken[] }
  | { type: 'link'; href: string; children: RichToken[] };

// Ba nhánh bên trong mỗi nhóm bắt đầu bằng ký tự khác nhau nên không quay lui.
const PATTERN =
  /`([^`\n]+)`|\*\*((?:`[^`\n]*`|[^*`\n]|\*(?!\*))+)\*\*|\[((?:`[^`\n]*`|[^\]`\n])+)\]\(([^)\s]+)\)/g;

/** Chỉ địa chỉ web và đường dẫn trong trang; `//máy-khác` và `javascript:` thì không. */
const SAFE_HREF = /^(https?:\/\/|\/(?!\/))/;

export function richTokens(text: string): RichToken[] {
  const out: RichToken[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ type: 'text', text: text.slice(last, at) });
    last = at + match[0].length;
    const [, code, bold, label, href] = match;
    if (code !== undefined) out.push({ type: 'code', text: code });
    else if (bold !== undefined) out.push({ type: 'bold', children: richTokens(bold) });
    else if (SAFE_HREF.test(href)) out.push({ type: 'link', href, children: richTokens(label) });
    else out.push(...richTokens(label));
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** Bỏ dấu đánh dấu, giữ `code` — cho chỗ chỉ biết dựng mã nội tuyến (màn tổng kết). */
export function withoutRichMarks(text: string): string {
  const flat = (tokens: RichToken[]): string =>
    tokens
      .map((t) =>
        t.type === 'text' ? t.text : t.type === 'code' ? `\`${t.text}\`` : flat(t.children),
      )
      .join('');
  return flat(richTokens(text));
}
