"""Chép giáo trình của BẤT KỲ môn nào từ gói bài vào frontend/src/lib/curricula.json
(các khối CURRICULA, LESSON_META, LESSON_URLS) và cập nhật frontend/src/lib/catalog.ts.

Ví dụ:
    python3 scripts/sync_curricula.py --bundle scripts/pe-da/out --course python_advanced
    python3 scripts/sync_curricula.py --bundle path/to/sql --course sql
    python3 scripts/sync_curricula.py --bundle scripts/pe-da/out --course python_advanced --check

Không gõ tay số bài hay thời lượng trong catalog.ts: script tự đếm bài từ
gói nguồn và cộng `estimated_minutes` của toàn bộ bài học rồi làm tròn theo giờ.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TARGET = REPO_ROOT / 'frontend' / 'src' / 'lib' / 'curricula.json'
DEFAULT_CATALOG = REPO_ROOT / 'frontend' / 'src' / 'lib' / 'catalog.ts'
DROPPED_COURSES = ('python', 'cpp', 'java', 'htmlcss')

DEFAULT_COURSE_COLORS = {
    'color': '#2563eb',
    'accent': '#e5334b',
    'image': '/static/images/python.webp',
}
IGNORED_LESSON_FILES = {'course.json', 'curriculum.json', 'demote.json', 'meta.json', 'qa.json'}
LEVEL_VALID = {'beginner', 'intermediate', 'advanced'}


def _js_truthy(value: object) -> bool:
    """Giống `Boolean(value)` của JS: `{}` và `[]` là truthy, chỉ `None/False/0/''` là falsy."""
    return value is not None and value is not False and value != 0 and value != ''


def _has_items(value: object) -> bool:
    return isinstance(value, list) and len(value) > 0


def _ts_str(value: str) -> str:
    escaped = value.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '').replace('\n', '\\n')
    return f"'{escaped}'"


def _ts_multiline_text(value: str, indent: str = '      + ') -> str:
    return _ts_str(value)


def format_duration(total_minutes: float) -> str:
    """Đổi tổng phút thật thành nhãn '~X giờ' (khớp ngưỡng ±1 giờ của catalog-duration.test.mjs)."""
    hours = total_minutes / 60.0
    if hours >= 1.0:
        return f'~{int(hours + 0.5)} giờ'
    rounded = round(hours, 1)
    if rounded <= 0:
        rounded = 0.1
    return f'~{rounded:.1f} giờ'


def screen_keys(content: dict, code: str) -> list[list[str]]:
    """Danh sách `[key, kind]` của một bài, KHỚP TỪNG KHOÁ với `buildScreens()` (studio-lesson.ts).

    Trang chủ `/` và dashboard đọc `LESSON_META[course][i].screens` từ `curricula.json`
    và đối chiếu từng khoá với bản nháp localStorage (`draft.done['s1-read-0']`...).
    Sửa luồng màn trong `frontend/src/lib/studio-lesson.ts` thì bắt buộc phải sửa
    hàm này tương ứng.
    """
    if not isinstance(content, dict):
        raise SystemExit(f'LỖI: {code} có content_json không phải object JSON.')

    play = content.get('play') or {}
    games = play.get('games') or []
    one = content.get('step_1') or {}
    two = content.get('step_2') or {}
    three = content.get('step_3') or {}
    four = content.get('step_4') or {}
    out: list[list[str]] = []

    if _has_items(games):
        if _has_items(one.get('theory')):
            out.append(['s1-theory', 'theory'])
        if _js_truthy((one.get('brief') or {}).get('task')):
            out.append(['s1-brief', 'brief'])
        elif _js_truthy((one.get('context') or {}).get('body')):
            out.append(['s1-context', 'context'])
        if not _js_truthy(play.get('boss')):
            if _has_items(one.get('explain')):
                out.append(['s1-explain', 'explain'])
            if len((one.get('predict') or {}).get('options') or []) >= 2:
                out.append(['s1-predict', 'predict'])
        for game in games:
            if not isinstance(game, dict) or not game.get('id') or not game.get('type'):
                raise SystemExit(f'LỖI: {code} có phần tử play.games thiếu id hoặc type.')
            if game['type'] == 'fill' and not _has_items((three.get('scaffold') or {}).get('slots')):
                continue
            if game['type'] == 'selfExplain' and not _js_truthy((two.get('selfExplain') or {}).get('prompt')):
                continue
            out.append([f"g-{game['id']}", game['type']])
        if (
            _js_truthy((four.get('task') or {}).get('body'))
            or _js_truthy(four.get('starterCode'))
            or _has_items(four.get('tests'))
            or _js_truthy(four.get('solutionCode'))
        ):
            out.append(['s4-sandbox', 'sandbox'])
        if out:
            out.append(['recap', 'recap'])
        else:
            raise SystemExit(f'LỖI: {code} có play.games nhưng không dựng được màn nào.')
        return out

    # Luồng chuẩn `studio-lesson/v1` / `pe-da` / các môn mới (SQL, ML...)
    for i, _ in enumerate(one.get('read') or []):
        out.append([f's1-read-{i}', 'read'])
    if _has_items(one.get('theory')):
        out.append(['s1-theory', 'theory'])
    if _js_truthy((one.get('brief') or {}).get('task')):
        out.append(['s1-brief', 'brief'])
    elif _js_truthy((one.get('context') or {}).get('body')) or _js_truthy((one.get('code') or {}).get('source')):
        out.append(['s1-context', 'context'])
    if _has_items(one.get('explain')):
        out.append(['s1-explain', 'explain'])
    if _js_truthy(one.get('memory')):
        out.append(['s1-memory', 'memory'])
    if _js_truthy((one.get('misconception') or {}).get('body')):
        out.append(['s1-misconception', 'misconception'])
    if len((one.get('predict') or {}).get('options') or []) >= 2:
        out.append(['s1-predict', 'predict'])

    for i, q in enumerate(two.get('mcq') or []):
        if isinstance(q, dict) and len(q.get('options') or []) >= 2:
            out.append([f's2-mcq-{i}', 'mcq'])
    if _has_items((two.get('classify') or {}).get('tokens')):
        out.append(['s2-classify', 'classify'])
    for i, _ in enumerate(two.get('practice') or []):
        out.append([f's2-practice-{i}', 'practice'])
    if _js_truthy((two.get('selfExplain') or {}).get('prompt')):
        out.append(['s2-self', 'selfExplain'])

    if _has_items((three.get('scaffold') or {}).get('slots')):
        out.append(['s3-scaffold', 'scaffold'])
    if _has_items((three.get('trace') or {}).get('steps')) or (
        _js_truthy((three.get('task') or {}).get('body')) and not _js_truthy(three.get('scaffold'))
    ):
        out.append(['s3-trace', 'trace'])
    if _has_items((three.get('counter') or {}).get('options')):
        out.append(['s3-counter', 'counter'])

    if (
        _js_truthy((four.get('task') or {}).get('body'))
        or _js_truthy(four.get('starterCode'))
        or _has_items(four.get('tests'))
        or _js_truthy(four.get('solutionCode'))
    ):
        out.append(['s4-sandbox', 'sandbox'])

    if out:
        out.append(['recap', 'recap'])
    else:
        raise SystemExit(f'LỖI: {code} không dựng được màn hình nào từ content_json.')
    return out


def _read_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        raise SystemExit(f'LỖI: Không đọc được JSON ở {path}: {exc}') from exc


def _load_bundle_lessons(bundle_path: Path) -> tuple[dict, list[dict], Path]:
    """Đọc gói bài từ thư mục hoặc file `lessons.json`. Trả `(bundle_meta, rows, bundle_dir)`."""
    if not bundle_path.exists():
        raise SystemExit(f'LỖI: Không tìm thấy gói bài "{bundle_path}".')

    if bundle_path.is_file():
        bundle_dir = bundle_path.parent
        raw = _read_json(bundle_path)
    else:
        bundle_dir = bundle_path
        lessons_file = bundle_dir / 'lessons.json'
        if lessons_file.is_file():
            raw = _read_json(lessons_file)
        else:
            lessons_dir = bundle_dir / 'lessons'
            if lessons_dir.is_dir():
                files = sorted(lessons_dir.glob('*.json'))
            else:
                files = sorted(
                    p for p in bundle_dir.glob('*.json')
                    if p.name not in IGNORED_LESSON_FILES and not p.name.startswith('curriculum')
                )
            if not files:
                raise SystemExit(
                    f'LỖI: Thư mục "{bundle_dir}" không có lessons.json hay các file bài học JSON.'
                )
            raw = [_read_json(f) for f in files]

    if isinstance(raw, dict):
        if raw.get('partial'):
            raise SystemExit(f'LỖI: Gói bài ở "{bundle_path}" đang đánh dấu partial=true (bản dựng thiếu).')
        rows = raw.get('lessons')
        bundle_meta = raw
    elif isinstance(raw, list):
        rows = raw
        bundle_meta = {}
    else:
        raise SystemExit(f'LỖI: Gói bài "{bundle_path}" phải là object có "lessons" hoặc mảng bài học.')

    if not isinstance(rows, list) or not rows:
        raise SystemExit(f'LỖI: Gói bài "{bundle_path}" không có bài học nào.')

    validated: list[dict] = []
    for idx, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            raise SystemExit(f'LỖI: Phần tử bài thứ {idx} không phải object JSON.')
        code = row.get('lesson_code')
        if not isinstance(code, str) or not code.strip():
            raise SystemExit(f'LỖI: Bài thứ {idx} thiếu lesson_code.')
        sort_order = row.get('sort_order')
        if isinstance(sort_order, bool) or not isinstance(sort_order, int) or sort_order <= 0:
            raise SystemExit(f'LỖI: {code} có sort_order không hợp lệ ({sort_order!r}); phải là số nguyên >= 1.')
        minutes = row.get('estimated_minutes')
        if isinstance(minutes, bool) or not isinstance(minutes, (int, float)) or minutes <= 0:
            raise SystemExit(f'LỖI: {code} thiếu hoặc sai estimated_minutes ({minutes!r}); phải > 0.')
        xp = row.get('xp_reward')
        if isinstance(xp, bool) or not isinstance(xp, (int, float)) or xp < 0:
            raise SystemExit(f'LỖI: {code} thiếu hoặc sai xp_reward ({xp!r}); phải >= 0.')
        content = row.get('content_json')
        if not isinstance(content, dict):
            raise SystemExit(f'LỖI: {code} thiếu content_json.')
        validated.append(row)

    validated.sort(key=lambda r: r['sort_order'])
    orders = [r['sort_order'] for r in validated]
    expected_orders = list(range(1, len(validated) + 1))
    if orders != expected_orders:
        raise SystemExit(
            f'LỖI: sort_order của gói bài không liên tục 1..{len(validated)} '
            f'(thấy đầu/cuối: {orders[:5]} ... {orders[-3:]}).'
        )

    codes = [r['lesson_code'] for r in validated]
    if len(set(codes)) != len(codes):
        raise SystemExit('LỖI: Có mã lesson_code bị trùng trong gói bài.')

    return bundle_meta, validated, bundle_dir


def _load_course_meta(bundle_dir: Path, bundle_meta: dict) -> dict:
    """Đọc metadata tuỳ chọn từ `course.json` hoặc `meta.json` cạnh gói bài."""
    merged: dict = {}
    for search_dir in (bundle_dir, bundle_dir.parent):
        for name in ('meta.json', 'course.json'):
            candidate = search_dir / name
            if candidate.is_file():
                obj = _read_json(candidate)
                if isinstance(obj, dict):
                    merged = {**obj, **merged} if merged else obj
                    break
        if merged:
            break
    if isinstance(bundle_meta.get('course'), dict):
        merged = {**merged, **bundle_meta['course']}
    if isinstance(bundle_meta.get('course_id'), str) and bundle_meta['course_id'].strip():
        merged.setdefault('id', bundle_meta['course_id'].strip())
    return merged


def _build_modules_from_rows(rows: list[dict]) -> list[dict]:
    """Tự gom nhóm `modules` từ trường `module` khi gói bài không có file curriculum riêng."""
    modules: list[dict] = []
    seen_non_contiguous: set[str] = set()
    for row in rows:
        mod_title = row.get('module')
        if not isinstance(mod_title, str) or not mod_title.strip():
            mod_title = 'M1 · Nội dung khoá học'
        mod_title = mod_title.strip()

        code = row['lesson_code'].strip()
        raw_title = row.get('title') or (row.get('content_json') or {}).get('title') or code
        raw_title = str(raw_title).strip()
        if re.match(rf'^{re.escape(code)}(?:\s|[·:-]|$)', raw_title):
            lesson_entry = raw_title
        else:
            lesson_entry = f'{code} · {raw_title}' if raw_title else code

        if modules and modules[-1]['title'] == mod_title:
            modules[-1]['lessons'].append(lesson_entry)
        else:
            if mod_title in seen_non_contiguous:
                raise SystemExit(
                    f'LỖI: Chương "{mod_title}" bị tách làm nhiều đoạn không liền kề theo sort_order.'
                )
            seen_non_contiguous.add(mod_title)
            modules.append({'title': mod_title, 'lessons': [lesson_entry]})
    return modules


def _load_or_build_curriculum(
    curriculum_arg: str | None,
    bundle_dir: Path,
    course_id: str,
    rows: list[dict],
    course_meta: dict,
) -> dict:
    """Đọc file curriculum nếu có, hoặc tự dựng từ danh sách bài học và course.json."""
    chosen: Path | None = None
    if curriculum_arg:
        chosen = Path(curriculum_arg).resolve()
        if not chosen.is_file():
            raise SystemExit(f'LỖI: Không tìm thấy file giáo trình "{chosen}".')
    else:
        dashed = course_id.replace('_', '-')
        candidates = [
            bundle_dir / f'curriculum-{course_id}.json',
            bundle_dir / f'curriculum-{dashed}.json',
            bundle_dir / 'curriculum.json',
        ]
        for c in candidates:
            if c.is_file():
                chosen = c
                break
        if chosen is None:
            globs = sorted(bundle_dir.glob('curriculum*.json'))
            if len(globs) == 1:
                chosen = globs[0]

    if chosen is not None:
        cur = _read_json(chosen)
        if not isinstance(cur, dict) or not isinstance(cur.get('modules'), list):
            raise SystemExit(f'LỖI: File giáo trình "{chosen}" thiếu mảng "modules".')
        return cur

    out: dict = {}
    if isinstance(course_meta.get('requirements'), list):
        out['requirements'] = course_meta['requirements']
    if isinstance(course_meta.get('skills'), list):
        out['skills'] = course_meta['skills']
    out['modules'] = _build_modules_from_rows(rows)
    return out


def lesson_meta(bundle: dict | list[dict], modules: list[dict]) -> list[dict]:
    """Phút, XP, cờ boss và danh sách màn của từng bài — PHẲNG, cùng thứ tự `?lesson=`."""
    rows_raw = bundle['lessons'] if isinstance(bundle, dict) else bundle
    rows = sorted(rows_raw, key=lambda r: r['sort_order'])
    titles = [t for m in modules for t in m['lessons']]
    out: list[dict] = []
    for i, row in enumerate(rows):
        code = row['lesson_code'].strip()
        if i >= len(titles) or not re.match(rf'^{re.escape(code)}(?:\s|[·:-]|$)', titles[i].strip()):
            got_title = titles[i] if i < len(titles) else '(thiếu)'
            raise SystemExit(
                f'LỖI: bài thứ {i + 1} là {code} trong gói bài nhưng giáo trình ghi "{got_title}".'
            )
        content = row['content_json']
        out.append({
            'code': code,
            'minutes': row['estimated_minutes'],
            'xp': row['xp_reward'],
            'boss': bool((content.get('play') or {}).get('boss')),
            'screens': screen_keys(content, code),
        })
    if len(titles) != len(rows):
        raise SystemExit(
            f'LỖI: Giáo trình có {len(titles)} bài nhưng gói bài có {len(rows)} bài.'
        )
    return out


# --- Cập nhật an toàn frontend/src/lib/catalog.ts ---

def _skip_ts_string(src: str, i: int) -> int:
    quote = src[i]
    n = len(src)
    i += 1
    while i < n:
        ch = src[i]
        if ch == '\\':
            i += 2
            continue
        if quote == '`' and ch == '$' and i + 1 < n and src[i + 1] == '{':
            i = _skip_ts_balanced(src, i + 1, '{', '}')
            continue
        if ch == quote:
            return i + 1
        i += 1
    return n


def _skip_ts_comment(src: str, i: int) -> int:
    n = len(src)
    if src.startswith('//', i):
        nl = src.find('\n', i)
        return n if nl == -1 else nl + 1
    if src.startswith('/*', i):
        end = src.find('*/', i + 2)
        return n if end == -1 else end + 2
    return i


def _skip_ts_balanced(src: str, i: int, open_ch: str, close_ch: str) -> int:
    depth = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch in ("'", '"', '`'):
            i = _skip_ts_string(src, i)
            continue
        if src.startswith('//', i) or src.startswith('/*', i):
            i = _skip_ts_comment(src, i)
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return n


def _find_courses_array_bounds(src: str) -> tuple[int, int]:
    marker = re.search(r'export\s+const\s+COURSES\b[^=]*=\s*\[', src)
    if not marker:
        raise SystemExit('LỖI: Không tìm thấy `export const COURSES` trong catalog.ts.')
    open_bracket = marker.end() - 1
    close_bracket_after = _skip_ts_balanced(src, open_bracket, '[', ']')
    return open_bracket, close_bracket_after - 1


def _find_course_object_bounds(src: str, arr_start: int, arr_end: int, course_id: str) -> tuple[int, int] | None:
    i = arr_start + 1
    while i < arr_end:
        ch = src[i]
        if ch in ("'", '"', '`'):
            i = _skip_ts_string(src, i)
            continue
        if src.startswith('//', i) or src.startswith('/*', i):
            i = _skip_ts_comment(src, i)
            continue
        if ch == '{':
            obj_end = _skip_ts_balanced(src, i, '{', '}')
            obj_text = src[i:obj_end]
            if re.search(rf"^\s*id:\s*'{re.escape(course_id)}'\s*,", obj_text, re.M):
                return i, obj_end
            i = obj_end
            continue
        i += 1
    return None


def _replace_ts_object_prop(obj_text: str, prop: str, new_rhs: str) -> str:
    """Thay thế giá trị của một thuộc tính ở tầng gốc trong block `{ ... }` TypeScript."""
    n = len(obj_text)
    i = 1  # bỏ qua '{' mở đầu
    brace = 0
    bracket = 0
    paren = 0
    while i < n - 1:
        ch = obj_text[i]
        if ch in ("'", '"', '`'):
            i = _skip_ts_string(obj_text, i)
            continue
        if obj_text.startswith('//', i) or obj_text.startswith('/*', i):
            i = _skip_ts_comment(obj_text, i)
            continue
        if ch == '{':
            brace += 1
        elif ch == '}':
            brace -= 1
        elif ch == '[':
            bracket += 1
        elif ch == ']':
            bracket -= 1
        elif ch == '(':
            paren += 1
        elif ch == ')':
            paren -= 1
        elif brace == 0 and bracket == 0 and paren == 0:
            # Kiểm tra đầu dòng (hoặc đầu token) là `prop:`
            prev_ok = i == 1 or obj_text[i - 1] in ' \t\r\n,'
            if prev_ok and obj_text.startswith(prop, i):
                after_name = i + len(prop)
                m = re.match(r'\s*:\s*', obj_text[after_name:])
                if m:
                    val_start = after_name + m.end()
                    j = val_start
                    vb = vp = vbr = 0
                    while j < n - 1:
                        c = obj_text[j]
                        if c in ("'", '"', '`'):
                            j = _skip_ts_string(obj_text, j)
                            continue
                        if obj_text.startswith('//', j) or obj_text.startswith('/*', j):
                            j = _skip_ts_comment(obj_text, j)
                            continue
                        if c == '{':
                            vb += 1
                        elif c == '}':
                            vb -= 1
                        elif c == '(':
                            vp += 1
                        elif c == ')':
                            vp -= 1
                        elif c == '[':
                            vbr += 1
                        elif c == ']':
                            vbr -= 1
                        elif c == ',' and vb == 0 and vp == 0 and vbr == 0:
                            break
                        j += 1
                    val_end = j
                    if obj_text[val_end:val_end + 1] != ',':
                        # Tránh nuốt whitespace trước dấu '}' cuối
                        while val_end > val_start and obj_text[val_end - 1] in ' \t\r\n':
                            val_end -= 1
                    else:
                        # Giữ phần comment cuối dòng nếu không có, còn cơ bản tới ngay trước dấu ','
                        trimmed_end = val_end
                        while trimmed_end > val_start and obj_text[trimmed_end - 1] in ' \t\r\n':
                            trimmed_end -= 1
                        val_end = trimmed_end
                    return obj_text[:val_start] + new_rhs + obj_text[val_end:]
        i += 1
    return obj_text


def _read_ts_string_prop(obj_text: str, prop: str) -> str | None:
    m = re.search(rf"^\s*{re.escape(prop)}:\s*'((?:\\.|[^'\\])*)'", obj_text, re.M)
    if not m:
        return None
    return m.group(1).replace("\\'", "'").replace('\\\\', '\\')


def _format_new_catalog_entry(
    course_id: str,
    total_lessons: int,
    duration_str: str,
    meta: dict,
) -> str:
    title = str(meta.get('title') or course_id)
    label = str(meta.get('label') or title)
    subtitle = str(meta.get('subtitle') or f'{total_lessons} bài học thực hành')
    description = str(
        meta.get('description')
        or f'Giáo trình {title} gồm {total_lessons} bài học từ cơ bản tới thực hành.'
    )
    level = str(meta.get('level') or 'beginner')
    if level not in LEVEL_VALID:
        raise SystemExit(f'LỖI: level "{level}" không hợp lệ (chỉ nhận beginner | intermediate | advanced).')
    image = str(meta.get('image') or DEFAULT_COURSE_COLORS['image'])
    color = str(meta.get('color') or DEFAULT_COURSE_COLORS['color'])
    accent = str(meta.get('accent') or DEFAULT_COURSE_COLORS['accent'])
    mark = str(meta.get('mark') or course_id[:3].upper())
    lesson_url = str(meta.get('lessonUrl') or f'/lesson/{course_id}')

    lines = [
        '  {',
        f'    id: {_ts_str(course_id)},',
        f'    label: {_ts_str(label)},',
        f'    title: {_ts_str(title)},',
        f'    subtitle: {_ts_str(subtitle)},',
        f'    description: {_ts_multiline_text(description)},',
        f'    level: {_ts_str(level)},',
        f'    duration: {_ts_str(duration_str)},',
        f'    lessons: lessonCount({_ts_str(course_id)}, {total_lessons}),',
        '    rating: 4.8,',
        f'    image: {_ts_str(image)},',
        f'    color: {_ts_str(color)},',
        f'    accent: {_ts_str(accent)},',
        f'    mark: {_ts_str(mark)},',
        f'    lessonUrl: {_ts_str(lesson_url)},',
        '  },',
    ]
    return '\n'.join(lines)


def render_updated_catalog(
    catalog_src: str,
    course_id: str,
    total_lessons: int,
    duration_str: str,
    overrides: dict,
) -> str:
    """Cập nhật hoặc thêm khoá `course_id` trong `catalog.ts` theo số bài & thời lượng thật."""
    arr_start, arr_end = _find_courses_array_bounds(catalog_src)
    bounds = _find_course_object_bounds(catalog_src, arr_start, arr_end, course_id)
    if bounds is None:
        entry = _format_new_catalog_entry(course_id, total_lessons, duration_str, overrides)
        prefix = catalog_src[:arr_end]
        if not prefix.endswith('\n'):
            prefix += '\n'
        return prefix + entry + '\n' + catalog_src[arr_end:]

    obj_start, obj_end = bounds
    obj_text = catalog_src[obj_start:obj_end]
    updated = _replace_ts_object_prop(obj_text, 'duration', _ts_str(duration_str))
    updated = _replace_ts_object_prop(updated, 'lessons', f'lessonCount({_ts_str(course_id)}, {total_lessons})')

    if overrides.get('title'):
        updated = _replace_ts_object_prop(updated, 'title', _ts_str(overrides['title']))
        if not overrides.get('label'):
            updated = _replace_ts_object_prop(updated, 'label', _ts_str(overrides['title']))
    if overrides.get('label'):
        updated = _replace_ts_object_prop(updated, 'label', _ts_str(overrides['label']))

    if overrides.get('subtitle'):
        updated = _replace_ts_object_prop(updated, 'subtitle', _ts_str(overrides['subtitle']))
    else:
        existing_sub = _read_ts_string_prop(updated, 'subtitle')
        if existing_sub:
            new_sub = re.sub(r'^\d+\s+bài\b', f'{total_lessons} bài', existing_sub)
            if new_sub != existing_sub:
                updated = _replace_ts_object_prop(updated, 'subtitle', _ts_str(new_sub))

    if overrides.get('description'):
        updated = _replace_ts_object_prop(updated, 'description', _ts_str(overrides['description']))
    if overrides.get('level'):
        level = overrides['level']
        if level not in LEVEL_VALID:
            raise SystemExit(f'LỖI: level "{level}" không hợp lệ (chỉ nhận beginner | intermediate | advanced).')
        updated = _replace_ts_object_prop(updated, 'level', _ts_str(level))
    if overrides.get('lessonUrl'):
        updated = _replace_ts_object_prop(updated, 'lessonUrl', _ts_str(overrides['lessonUrl']))

    return catalog_src[:obj_start] + updated + catalog_src[obj_end:]


def build_parser(
    *,
    default_bundle: Path | None = None,
    default_course: str | None = None,
    default_curriculum: Path | None = None,
    default_prune: bool = False,
) -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description='Đồng bộ giáo trình của bất kỳ môn học nào vào curricula.json và catalog.ts.'
    )
    ap.add_argument(
        '--bundle',
        default=str(default_bundle) if default_bundle else None,
        required=default_bundle is None,
        help='Đường dẫn tới thư mục gói bài hoặc file lessons.json.',
    )
    ap.add_argument(
        '--course',
        default=default_course,
        help='Mã khoá học (vd: python_advanced, db_design, sql, ml). Nếu bỏ trống sẽ đọc từ bundle.',
    )
    ap.add_argument(
        '--curriculum',
        default=str(default_curriculum) if default_curriculum else None,
        help='File curriculum-*.json tuỳ chọn; mặc định tự dò trong bundle hoặc tự gom từ trường module.',
    )
    ap.add_argument('--title', help='Tên khoá học ghi vào catalog.ts.')
    ap.add_argument('--label', help='Nhãn ngắn của khoá học trong catalog.ts.')
    ap.add_argument('--subtitle', help='Phụ đề của khoá học trong catalog.ts.')
    ap.add_argument('--description', help='Mô tả khoá học trong catalog.ts.')
    ap.add_argument('--level', choices=sorted(LEVEL_VALID), help='Cấp độ khoá học.')
    ap.add_argument('--lesson-url', dest='lesson_url', help='Đường dẫn học bài (mặc định /lesson/<course>).')
    ap.add_argument('--image', help='Ảnh bìa cho khoá mới trong catalog.ts.')
    ap.add_argument('--color', help='Màu chính cho khoá mới trong catalog.ts.')
    ap.add_argument('--accent', help='Màu nhấn cho khoá mới trong catalog.ts.')
    ap.add_argument('--mark', help='Ký hiệu ngắn (2-3 ký tự) cho khoá mới trong catalog.ts.')
    ap.add_argument('--target', default=str(DEFAULT_TARGET), help='Đường dẫn curricula.json đích.')
    ap.add_argument('--catalog', default=str(DEFAULT_CATALOG), help='Đường dẫn catalog.ts đích.')
    ap.add_argument('--no-catalog', action='store_true', help='Không cập nhật catalog.ts.')
    ap.add_argument(
        '--prune-dropped',
        action='store_true',
        default=default_prune,
        help='Xoá thêm các khoá cũ trong DROPPED_COURSES khỏi curricula.json (mặc định giữ nguyên).',
    )
    ap.add_argument(
        '--check',
        action='store_true',
        help='Chỉ kiểm tra curricula.json và catalog.ts đã khớp gói bài chưa; lệch trả mã 1.',
    )
    return ap


def run_sync(args: argparse.Namespace) -> int:
    bundle_path = Path(args.bundle).resolve()
    target_path = Path(args.target).resolve()
    catalog_path = Path(args.catalog).resolve()

    bundle_meta, rows, bundle_dir = _load_bundle_lessons(bundle_path)
    file_course_meta = _load_course_meta(bundle_dir, bundle_meta)

    course_id = (args.course or file_course_meta.get('id') or '').strip()
    if not course_id:
        raise SystemExit('LỖI: Chưa xác định được mã khoá — hãy truyền `--course <id>` hoặc khai `course_id`.')

    file_course_id = str(file_course_meta.get('id') or '').strip()
    effective_file_meta = file_course_meta if (not file_course_id or file_course_id == course_id) else {}

    curriculum = _load_or_build_curriculum(args.curriculum, bundle_dir, course_id, rows, effective_file_meta)
    metas = lesson_meta(rows, curriculum['modules'])

    curriculum = {
        **curriculum,
        'stats': {
            'practice': sum(len((r['content_json'].get('step_2') or {}).get('practice') or []) for r in rows),
            'graded': sum(1 for r in rows if (r['content_json'].get('step_4') or {}).get('tests')),
        },
    }

    if not target_path.is_file():
        raise SystemExit(f'LỖI: Không tìm thấy file đích "{target_path}".')

    current_target_text = target_path.read_text(encoding='utf-8')
    data = json.loads(current_target_text)
    if not isinstance(data, dict):
        raise SystemExit(f'LỖI: "{target_path}" không phải object JSON hợp lệ.')

    data.setdefault('CURRICULA', {})[course_id] = curriculum
    data.setdefault('LESSON_META', {})[course_id] = metas

    lesson_url = args.lesson_url or effective_file_meta.get('lessonUrl')
    if lesson_url:
        data.setdefault('LESSON_URLS', {})[course_id] = lesson_url
    else:
        data.setdefault('LESSON_URLS', {}).setdefault(course_id, f'/lesson/{course_id}')

    dropped: list[str] = []
    if args.prune_dropped:
        for old in DROPPED_COURSES:
            if data.get('CURRICULA', {}).pop(old, None) is not None:
                dropped.append(f'CURRICULA.{old}')
            if data.get('LESSON_URLS', {}).pop(old, None) is not None:
                dropped.append(f'LESSON_URLS.{old}')
            if data.get('LESSON_META', {}).pop(old, None) is not None:
                dropped.append(f'LESSON_META.{old}')

    next_target_text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'

    total_lessons = sum(len(m['lessons']) for m in curriculum['modules'])
    total_minutes = sum(r['estimated_minutes'] for r in rows)
    duration_str = format_duration(total_minutes)

    overrides = dict(effective_file_meta)
    for key, val in (
        ('title', args.title),
        ('label', args.label),
        ('subtitle', args.subtitle),
        ('description', args.description),
        ('level', args.level),
        ('lessonUrl', args.lesson_url),
        ('image', args.image),
        ('color', args.color),
        ('accent', args.accent),
        ('mark', args.mark),
    ):
        if val:
            overrides[key] = val

    current_catalog_text = None
    next_catalog_text = None
    if not args.no_catalog:
        if not catalog_path.is_file():
            raise SystemExit(f'LỖI: Không tìm thấy catalog "{catalog_path}".')
        current_catalog_text = catalog_path.read_text(encoding='utf-8')
        next_catalog_text = render_updated_catalog(
            current_catalog_text, course_id, total_lessons, duration_str, overrides
        )

    if args.check:
        mismatches: list[str] = []
        if current_target_text != next_target_text:
            mismatches.append(str(target_path))
        if not args.no_catalog and current_catalog_text != next_catalog_text:
            mismatches.append(str(catalog_path))
        if mismatches:
            print(
                f'LỖI: {", ".join(mismatches)} bị lệch với gói bài {course_id}. Hãy chạy sync_curricula.py để cập nhật.',
                file=sys.stderr,
            )
            return 1
        print(
            f'✓ [check] {course_id}: {len(curriculum["modules"])} chặng, '
            f'{total_lessons} bài, {total_minutes} phút ({duration_str}) — đã khớp.'
        )
        return 0

    target_path.write_text(next_target_text, encoding='utf-8')
    if not args.no_catalog and next_catalog_text is not None:
        catalog_path.write_text(next_catalog_text, encoding='utf-8')

    extra = f'; đã dọn {", ".join(dropped)}' if dropped else ''
    print(
        f'✓ {course_id}: {len(curriculum["modules"])} chặng, {total_lessons} bài, '
        f'{total_minutes} phút ({duration_str}) -> {target_path.name}'
        + ('' if args.no_catalog else f' & {catalog_path.name}')
        + extra
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    return run_sync(parser.parse_args(argv))


if __name__ == '__main__':
    sys.exit(main())
