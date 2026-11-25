// Tô màu cú pháp Python ở mức tối thiểu cho các khối code trong bài học.
//
// Vì sao tự viết: nội dung bài đến từ `lessons.content_json` dưới dạng chuỗi
// thuần, trong khi các thẻ code của LessonChrome nhận ReactNode và tô màu bằng
// class .kw/.str/.num/.cm (xem exercises.module.css). Kéo cả một thư viện
// highlight về chỉ để làm việc này là quá nặng so với nhu cầu.
//
// Phạm vi: từ khoá, chuỗi một dòng, số và chú thích. KHÔNG xử lý chuỗi nhiều
// dòng (docstring) — dòng giữa docstring sẽ hiện như mã thường, chấp nhận được
// vì chỉ ảnh hưởng màu sắc.

const KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

// Thứ tự quan trọng: chuỗi và chú thích phải khớp TRƯỚC khi tách từ, nếu không
// dấu # trong chuỗi sẽ bị coi là chú thích.
const TOKEN =
  /("""[\s\S]*?"""|'''[\s\S]*?'''|[frbFRB]{0,2}"(?:\\.|[^"\\])*"|[frbFRB]{0,2}'(?:\\.|[^'\\])*'|#[^\n]*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;

export function highlightPython(line: string): React.ReactNode {
  if (!line) return '';
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of line.matchAll(TOKEN)) {
    const text = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    last = at + text.length;

    const first = text[0];
    if (text.startsWith('#')) out.push(<span key={key++} className="cm">{text}</span>);
    else if (first === '"' || first === "'" || /^[frbFRB]{1,2}["']/.test(text))
      out.push(<span key={key++} className="str">{text}</span>);
    else if (/^\d/.test(text)) out.push(<span key={key++} className="num">{text}</span>);
    else if (KEYWORDS.has(text)) out.push(<span key={key++} className="kw">{text}</span>);
    else out.push(text);
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

const SQL_KEYWORDS = new Set(
  (
    'add all alter and any as asc begin between by case cast check column commit constraint create ' +
    'cross declare default delete desc distinct drop else end except exists false for foreign from ' +
    'full function grant group having if in index inner insert intersect into is join key left like ' +
    'limit not null offset on or order outer over partition primary procedure references return ' +
    'returns revoke right rollback row rows select set table then to transaction trigger true union ' +
    'unique update using values view when where with'
  ).split(' '),
);

const SQL_TOKEN = /(--[^\n]*|'(?:''|[^'])*'|"[^"]*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;

function highlightSql(line: string): React.ReactNode {
  if (!line) return '';
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of line.matchAll(SQL_TOKEN)) {
    const text = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    last = at + text.length;
    if (text.startsWith('--')) out.push(<span key={key++} className="cm">{text}</span>);
    else if (text[0] === "'") out.push(<span key={key++} className="str">{text}</span>);
    else if (/^\d/.test(text)) out.push(<span key={key++} className="num">{text}</span>);
    else if (SQL_KEYWORDS.has(text.toLowerCase()))
      out.push(<span key={key++} className="kw">{text}</span>);
    else out.push(text);
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/** Tên hiện trên đầu khối mã. `lang` vắng là khoá Python. */
export function codeName(lang?: string): string {
  if (!lang) return 'python';
  return lang === 'text' ? 'ghi chép' : lang;
}

/** Chuỗi mã -> danh sách dòng đánh số cho CodeBlock. */
export function toCodeLines(
  source: string,
  highlightLine?: number,
  lang = 'python',
): { num: number; content: React.ReactNode; highlighted?: boolean }[] {
  // Ngôn ngữ chưa có bộ tô màu thì để trần: tô SQL bằng luật Python là tô sai.
  const paint =
    lang === 'python' ? highlightPython : lang === 'sql' ? highlightSql : (line: string) => line;
  return source.replace(/\s+$/, '').split('\n').map((line, i) => ({
    num: i + 1,
    content: paint(line),
    highlighted: highlightLine === i + 1,
  }));
}
