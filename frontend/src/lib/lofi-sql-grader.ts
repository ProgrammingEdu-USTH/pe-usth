/**
 * lofi-sql-grader.ts — Bộ chấm câu lệnh SQL & sinh script SQLite cho Pyodide.
 *
 * Chuyển trực tiếp lõi chấm (`glueSQL`, `normFullS3`, `normalizeSQL`,
 * `extractClauses`, `validateSQL`) từ bộ SQL cũ sang TypeScript thuần,
 * không dùng alias `@/` để `node --test` kiểm thử trực tiếp đủ 66 bài.
 */

export type SqlGradeResult = {
  correct: boolean;
  feedback?: string;
  error?: string;
  suggestion?: string;
};

export type SqlSchemaLike = {
  table_name: string;
  columns: Array<{ name: string; type?: string; key?: string }>;
  data?: unknown[][];
};

export type SqlitePreviewResult = {
  ok: boolean;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  error?: string;
};

const SQLITE_MARKER = '__SQL_JSON__:';

export function glueSQL(s: string): string {
  return (s || '')
    .replace(/\s*->>\s*/g, '->>')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chuẩn hoá Bước 3 (ghép mảnh): giữ nguyên case & `--` cho bài SQLi `db_17`, chỉ bỏ `;` cuối. */
export function normalizeStep3SQL(s: string): string {
  return glueSQL((s || '').replace(/;+\s*$/, ''));
}

/** Chuẩn hoá Bước 4: bỏ comment `--`, bỏ `;` cuối, gộp dấu `, = + - * /` và viết hoa. */
export function normalizeSQL(s: string): string {
  return glueSQL(
    (s || '')
      .replace(/--[^\n]*/g, ' ')
      .replace(/\s*;+\s*$/, ''),
  )
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*([+\-*/])\s*/g, '$1')
    .toUpperCase();
}

export type ExtractedClauses = {
  select: string | null;
  from: string | null;
  where: string | null;
  groupBy: string | null;
  having: string | null;
  orderBy: string | null;
  forUpdate: boolean;
};

export function extractClauses(sql: string): ExtractedClauses {
  const result: ExtractedClauses = {
    select: null,
    from: null,
    where: null,
    groupBy: null,
    having: null,
    orderBy: null,
    forUpdate: false,
  };
  const upper = (sql || '').toUpperCase();

  const selectMatch = upper.match(/SELECT\s+(.+?)\s+FROM/i);
  if (selectMatch) result.select = selectMatch[1].trim().replace(/\s+/g, '').toUpperCase();

  const fromMatch = upper.match(/FROM\s+(\w+)/i);
  if (fromMatch) result.from = fromMatch[1].trim().toUpperCase();

  const whereMatch = upper.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|\s+FOR\s+UPDATE|;|$)/i);
  if (whereMatch) result.where = whereMatch[1].trim().replace(/\s+/g, ' ').toUpperCase();

  result.forUpdate = /\bFOR\s+UPDATE\b/.test(upper);

  const groupMatch = upper.match(/GROUP\s+BY\s+(.+?)(?:\s+HAVING|\s+ORDER|\s+LIMIT|;|$)/i);
  if (groupMatch) result.groupBy = groupMatch[1].trim().replace(/\s+/g, ' ').toUpperCase();

  const havingMatch = upper.match(/HAVING\s+(.+?)(?:\s+ORDER|\s+LIMIT|;|$)/i);
  if (havingMatch) result.having = havingMatch[1].trim().replace(/\s+/g, ' ').toUpperCase();

  const orderMatch = upper.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s+FOR\s+UPDATE|;|$)/i);
  if (orderMatch) result.orderBy = orderMatch[1].trim().replace(/\s+/g, ' ').toUpperCase();

  return result;
}

function validateAgainstSingleExpected(userSQL: string, expectedSQL: string): SqlGradeResult {
  const u = normalizeSQL(userSQL);
  const e = normalizeSQL(expectedSQL);

  if (!u) {
    return {
      correct: false,
      error: 'Bạn chưa nhập câu lệnh nào.',
      suggestion: 'Gõ câu lệnh vào khung bên dưới hoặc mở Gợi ý mức 1.',
    };
  }

  // Hỗ trợ bài nhiều câu query ngăn cách bởi `;` (vd `db_17`)
  const uQueries = u.split(';').map((q) => q.trim()).filter((q) => q.length > 0);
  const eQueries = e.split(';').map((q) => q.trim()).filter((q) => q.length > 0);

  if (eQueries.length > 1) {
    if (uQueries.length === 0) {
      return { correct: false, error: `Cần ${eQueries.length} câu query, bạn chưa viết câu nào.` };
    }
    if (uQueries.length < eQueries.length) {
      return {
        correct: false,
        error: `Thiếu query — cần ${eQueries.length} câu, bạn chỉ viết ${uQueries.length}.`,
      };
    }
    if (uQueries.length > eQueries.length) {
      return {
        correct: false,
        error: `Thừa query — chỉ cần ${eQueries.length} câu, bạn viết ${uQueries.length}.`,
      };
    }
    const uSet = new Set(uQueries);
    const eSet = new Set(eQueries);
    if ([...eSet].every((q) => uSet.has(q))) {
      return { correct: true, feedback: `Đúng — đủ ${eQueries.length} câu query khớp với đáp án.` };
    }
    return {
      correct: false,
      error: `Có ${uQueries.length} câu query nhưng nội dung chưa khớp. Kiểm tra lại từng câu.`,
      suggestion: 'So sánh với Gợi ý mức 3–4 ở trang bên trái.',
    };
  }

  if (u === e) {
    return { correct: true, feedback: 'Cú pháp và giá trị khớp hoàn toàn với đáp án mong đợi.' };
  }

  const ddlHead = e.match(
    /^(CREATE (?:OR REPLACE )?(?:FUNCTION|PROCEDURE|TRIGGER|VIEW|INDEX)|WITH RECURSIVE|UPDATE|INSERT|DELETE|CALL)\b/,
  );
  if (ddlHead) {
    if (!u.startsWith(ddlHead[1])) {
      return {
        correct: false,
        error: `Đáp án cần bắt đầu bằng ${ddlHead[1]} — bạn đang viết một loại câu lệnh khác.`,
        suggestion: 'Xem lại cấu trúc câu lệnh ở Gợi ý mức 1–2.',
      };
    }
    return {
      correct: false,
      error: 'Đúng loại câu lệnh nhưng nội dung chưa khớp đáp án.',
      suggestion: 'So từng dòng với gợi ý — chú ý tên bảng/cột, NEW/OLD, RETURNS và thứ tự các phần.',
    };
  }

  const looksLikeSQL = /\bSELECT\b[\s\S]*\bFROM\b/.test(e);
  if (!looksLikeSQL) {
    return {
      correct: false,
      error: 'Chưa khớp đáp án — bài này chấm truy vấn ORM/document theo từng mắt xích.',
      suggestion: 'So từng phần với Gợi ý mức 3–4: tên method, alias, dấu ngoặc và thứ tự chain.',
    };
  }

  const uClauses = extractClauses(userSQL);
  const eClauses = extractClauses(expectedSQL);
  const errors: string[] = [];

  if (!uClauses.select) {
    errors.push('Thiếu mệnh đề SELECT.');
  } else if (uClauses.select !== eClauses.select) {
    errors.push(`SELECT không khớp: bạn chọn "${uClauses.select}" nhưng đáp án cần "${eClauses.select}".`);
  }

  if (!uClauses.from) {
    errors.push('Thiếu mệnh đề FROM — máy không biết truy vấn bảng nào.');
  } else if (uClauses.from !== eClauses.from) {
    errors.push(`FROM không khớp: bạn dùng "${uClauses.from}" nhưng đáp án là "${eClauses.from}".`);
  }

  if (eClauses.where && !uClauses.where) {
    errors.push('Thiếu mệnh đề WHERE — cần lọc điều kiện để lấy đúng bản ghi.');
  } else if (eClauses.where && uClauses.where && uClauses.where !== eClauses.where) {
    errors.push(`WHERE không khớp: bạn viết "${uClauses.where}" nhưng đáp án cần "${eClauses.where}".`);
  } else if (!eClauses.where && uClauses.where) {
    errors.push(`Đáp án KHÔNG lọc WHERE — mệnh đề "${uClauses.where}" bạn thêm vào sẽ làm sai kết quả.`);
  }

  if (eClauses.groupBy && !uClauses.groupBy) {
    errors.push('Thiếu mệnh đề GROUP BY.');
  } else if (eClauses.groupBy && uClauses.groupBy && uClauses.groupBy !== eClauses.groupBy) {
    errors.push(`GROUP BY không khớp: bạn viết "${uClauses.groupBy}" nhưng đáp án cần "${eClauses.groupBy}".`);
  } else if (!eClauses.groupBy && uClauses.groupBy) {
    errors.push(`Đáp án KHÔNG gom nhóm — GROUP BY "${uClauses.groupBy}" bạn thêm vào sẽ đổi dạng kết quả.`);
  }

  if (eClauses.having && !uClauses.having) {
    errors.push('Thiếu mệnh đề HAVING — lọc trên kết quả nhóm.');
  } else if (eClauses.having && uClauses.having && uClauses.having !== eClauses.having) {
    errors.push(`HAVING không khớp: bạn viết "${uClauses.having}" nhưng đáp án cần "${eClauses.having}".`);
  } else if (!eClauses.having && uClauses.having) {
    errors.push(`Đáp án KHÔNG có HAVING — điều kiện "${uClauses.having}" bạn thêm vào sẽ cắt mất nhóm.`);
  }

  if (eClauses.orderBy && !uClauses.orderBy) {
    errors.push('Thiếu mệnh đề ORDER BY.');
  } else if (eClauses.orderBy && uClauses.orderBy && uClauses.orderBy !== eClauses.orderBy) {
    errors.push(`ORDER BY không khớp: bạn viết "${uClauses.orderBy}" nhưng đáp án cần "${eClauses.orderBy}".`);
  }

  if (eClauses.forUpdate && !uClauses.forUpdate) {
    errors.push('Thiếu FOR UPDATE — câu đọc không giữ chỗ cho giao dịch.');
  } else if (!eClauses.forUpdate && uClauses.forUpdate) {
    errors.push('Đáp án KHÔNG có FOR UPDATE — không gắn khoá ghi vào câu đọc thuần.');
  }

  if (errors.length === 0) {
    return { correct: true, feedback: 'Câu query hợp lệ về mặt logic.' };
  }

  return {
    correct: false,
    error: errors.join(' '),
    suggestion: 'Thử đối chiếu với từng gợi ý ở trang bên trái.',
  };
}

export function gradeSqlAnswer(
  userSql: string,
  expectedSql: string,
  equivSql?: string | string[],
): SqlGradeResult {
  const primary = validateAgainstSingleExpected(userSql, expectedSql);
  if (primary.correct) return primary;

  const altList = Array.isArray(equivSql) ? equivSql : equivSql ? [equivSql] : [];
  for (const alt of altList) {
    if (!alt) continue;
    const altRes = validateAgainstSingleExpected(userSql, alt);
    if (altRes.correct) return altRes;
  }
  return primary;
}

export function gradeStep3Tokens(
  placedSql: string,
  expectedSql: string,
): { correct: boolean; message: string } {
  const u = normalizeStep3SQL(placedSql);
  const e = normalizeStep3SQL(expectedSql);
  if (!u) {
    return { correct: false, message: 'Bạn chưa ghép mảnh lệnh nào vào các ô bên phải.' };
  }
  if (u === e || u.toUpperCase() === e.toUpperCase()) {
    return { correct: true, message: 'Chính xác! Câu lệnh SQL đã ghép đúng thứ tự.' };
  }
  return {
    correct: false,
    message: 'Thứ tự hoặc mảnh lệnh chưa khớp đáp án — thử kiểm tra lại gợi ý từng dòng nhé.',
  };
}

export function buildSqlitePreviewScript(
  schema: SqlSchemaLike | undefined,
  relatedSchemas: SqlSchemaLike[] = [],
  userSql: string,
): string {
  const tables = [schema, ...relatedSchemas].filter((s): s is SqlSchemaLike => Boolean(s?.table_name && s?.columns?.length));
  const payload = JSON.stringify({
    tables: tables.map((t) => ({
      name: t.table_name,
      columns: t.columns.map((c) => ({ name: c.name, type: c.type || 'TEXT' })),
      rows: Array.isArray(t.data) ? t.data : [],
    })),
    sql: userSql,
  });

  return [
    'import json, re, sqlite3',
    `_CFG = json.loads(${JSON.stringify(payload)})`,
    'def _aff(t):',
    '    u = (t or "").upper()',
    '    if "INT" in u: return "INTEGER"',
    '    if any(k in u for k in ("FLOAT", "DOUBLE", "REAL", "DEC", "NUM")): return "REAL"',
    '    return "TEXT"',
    'def _coerce(val, aff):',
    '    if val is None: return None',
    '    s = str(val).strip()',
    '    if s.upper() == "NULL": return None',
    '    if aff == "INTEGER":',
    '        try: return int(s)',
    '        except Exception: return s',
    '    if aff == "REAL":',
    '        try: return float(s)',
    '        except Exception: return s',
    '    return str(val)',
    '_out = {"ok": False, "columns": [], "rows": [], "rowCount": 0, "error": ""}',
    'try:',
    '    _conn = sqlite3.connect(":memory:")',
    '    _cur = _conn.cursor()',
    '    for _t in _CFG["tables"]:',
    '        _tname = str(_t["name"]).replace(\'"\', \'\')',
    '        _cols = _t["columns"]',
    '        _defs = ", ".join(f\'"{str(c["name"]).replace(chr(34), "")}" {_aff(c.get("type"))}\' for c in _cols)',
    '        _cur.execute(f\'CREATE TABLE "{_tname}" ({_defs})\')',
    '        _rows = _t.get("rows") or []',
    '        if _rows:',
    '            _affs = [_aff(c.get("type")) for c in _cols]',
    '            _ph = ", ".join("?" for _ in _cols)',
    '            _norm_rows = []',
    '            for _r in _rows:',
    '                _padded = [(_r[i] if i < len(_r) else None) for i in range(len(_cols))]',
    '                _norm_rows.append([_coerce(_padded[i], _affs[i]) for i in range(len(_cols))])',
    '            _cur.executemany(f\'INSERT INTO "{_tname}" VALUES ({_ph})\', _norm_rows)',
    '    _sql = (_CFG["sql"] or "").strip()',
    '    if not _sql:',
    '        _out["error"] = "Chưa có câu lệnh SQL để chạy thử."',
    '    else:',
    '        _stmts = [x.strip() for x in _sql.split(";") if x.strip()]',
    '        for _idx, _st in enumerate(_stmts):',
    '            _cur.execute(_st)',
    '        if _cur.description:',
    '            _cols = [d[0] for d in _cur.description]',
    '            _all = _cur.fetchall()',
    '            _out = {"ok": True, "columns": _cols, "rows": [list(r) for r in _all[:30]], "rowCount": len(_all)}',
    '        else:',
    '            _out = {"ok": True, "columns": ["Thông báo"], "rows": [[f"Đã thực thi xong ({_cur.rowcount} dòng ảnh hưởng)."]], "rowCount": 1}',
    'except Exception as _ex:',
    '    _out["error"] = str(_ex)',
    `print(${JSON.stringify(SQLITE_MARKER)} + json.dumps(_out, ensure_ascii=False))`,
  ].join('\n');
}

export function parseSqlitePreviewOutput(stdout: string): SqlitePreviewResult | null {
  if (!stdout) return null;
  const idx = stdout.lastIndexOf(SQLITE_MARKER);
  if (idx === -1) return null;
  const line = stdout.slice(idx + SQLITE_MARKER.length).split('\n')[0]?.trim();
  if (!line) return null;
  try {
    const parsed = JSON.parse(line) as SqlitePreviewResult;
    if (typeof parsed?.ok === 'boolean') return parsed;
    return null;
  } catch {
    return null;
  }
}
