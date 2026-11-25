#!/usr/bin/env python3
"""Build the static lesson bundles for the Database and Machine Learning courses.

Sources under ``source/`` are copied unchanged from Giao_Trinh_PE at the commits in
``source/SOURCE.json``. Content is authored there, not here. The output uses the same
``studio-lesson/v2`` shape as the Python course, so the one lesson screen renders it.

    python3 scripts/pe-doc/build.py          # rebuild
    python3 scripts/pe-doc/build.py --check  # fail when the committed output is stale
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "source"
REPO = HERE.parents[1]
PUBLIC = REPO / "frontend" / "public" / "static" / "courses"
CATALOG = REPO / "frontend" / "src" / "lib" / "doc-courses.json"

SCHEMA = "studio-lesson/v2"
# Roughly one two-page spread of prose and code.
SPREAD_CHARS = 1900

# Sections written for the developer who wires up a runner, not for the learner.
DEV_ONLY = {"Học trên web", "Biến thể và cách kiểm"}
QUESTIONS = {"Luyện tập", "Luyện tập bổ sung"}
ANSWERS = {"Đáp án và lập luận", "Đáp án và tiêu chí tự kiểm", "Đáp án phần bổ sung"}
HINTS = {"Gợi ý"}

# The manifest lists lessons in teaching order; the id letter names the topic.
TOPICS = {
    "F": "Bắt đầu",
    "M": "Toán nền cho dữ liệu",
    "C": "Mô hình quan hệ",
    "S": "SQL",
    "D": "Thiết kế dữ liệu",
    "A": "Ứng dụng và an toàn",
    "B": "Dữ liệu lớn và phân tích",
    "I": "Lưu trữ và chỉ mục",
    "Q": "Xử lý truy vấn",
    "T": "Giao dịch",
    "P": "Hệ phân tán",
    "O": "Mô hình dữ liệu mở rộng",
    "Z": "Dự án",
}


def sections(text: str) -> tuple[str, list[tuple[str, list[str]]]]:
    """Split a lesson into its title, an intro and ``## `` sections (fence aware)."""
    title = ""
    out: list[tuple[str, list[str]]] = [("", [])]
    fence = False
    for line in text.replace("\r\n", "\n").split("\n"):
        if line.startswith("```"):
            fence = not fence
        if not fence and line.startswith("# ") and not title:
            title = line[2:].strip()
        elif not fence and line.startswith("## "):
            out.append((line[3:].strip(), []))
        else:
            out[-1][1].append(line)
    return title, out


def cells(row: str) -> list[str]:
    inner = row.strip().strip("|")
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", inner)]


def blocks(lines: list[str], link) -> list[dict]:
    """Markdown subset used by the lessons: paragraphs, headings, lists, tables, code."""
    out: list[dict] = []
    para: list[str] = []

    def flush():
        if para:
            out.append({"type": "paragraph", "text": link(" ".join(para)), "rich": True})
            para.clear()

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```"):
            flush()
            lang = stripped[3:].strip() or "text"
            body = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                body.append(lines[i])
                i += 1
            out.append({"type": "code", "code": "\n".join(body), "lang": lang})
        elif stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?[\s:|-]+\|?\s*$", lines[i + 1]):
            flush()
            headers = cells(stripped)
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = cells(lines[i])
                rows.append((row + [""] * len(headers))[: len(headers)])
                i += 1
            plain = lambda v: re.sub(r"\*\*([^*]+)\*\*", r"\1", v)
            out.append({"type": "table", "headers": [plain(h) for h in headers], "rows": [[plain(c) for c in r] for r in rows]})
            continue
        elif m := re.match(r"^(#{3,6}) (.*)", stripped):
            flush()
            out.append({"type": "paragraph", "text": link(m.group(2)), "heading": True, "rich": True})
        elif m := re.match(r"^(\d+)\. (.*)", stripped):
            flush()
            out.append({"type": "paragraph", "text": link(f"{m.group(1)}. {m.group(2)}"), "rich": True})
        elif m := re.match(r"^[-*] (.*)", stripped):
            flush()
            out.append({"type": "paragraph", "text": link(f"• {m.group(1)}"), "rich": True})
        elif stripped.startswith(">"):
            flush()
            out.append({"type": "paragraph", "text": link(stripped.lstrip("> ")), "rich": True})
        elif not stripped or re.match(r"^-{3,}$", stripped):
            flush()
        else:
            para.append(stripped)
        i += 1
    flush()
    return out


def weight(block: dict) -> int:
    if block["type"] == "code":
        return 120 + 45 * (block["code"].count("\n") + 1)
    if block["type"] == "table":
        return 100 + sum(max(60, len("".join(r))) for r in block["rows"])
    if block["type"] == "figure":
        return SPREAD_CHARS
    return 60 + len(block["text"])


def head(text: str) -> dict:
    return {"type": "paragraph", "text": text, "heading": True, "rich": True}


def total(items: list[dict]) -> int:
    return sum(weight(b) for b in items)


def spreads(sections_: list[tuple[str, list[dict]]]) -> list[list[dict]]:
    """Fill each spread with whole sections; cut a section only when it cannot fit one.

    A heading is never left as the last block of a spread, and a continued section
    repeats its heading so the new spread says where the reader is.
    """
    out: list[list[dict]] = []
    current: list[dict] = []
    for heading, body in sections_:
        section = ([head(heading)] if heading else []) + body
        if total(current) + total(section) <= SPREAD_CHARS * 1.1:
            current += section
            continue
        # Start the section on the open spread only if that spread is still mostly empty.
        # A few lines (the lesson's opening note) never stay alone on a spread.
        mostly_full = total(current) > SPREAD_CHARS * 0.45
        if total(current) > SPREAD_CHARS * 0.25 and (total(section) <= SPREAD_CHARS * 1.25 or mostly_full):
            out.append(current)
            current = []
        for block in section:
            if current and total(current) + weight(block) > SPREAD_CHARS and not current[-1].get("heading"):
                out.append(current)
                current = [head(f"{heading} (tiếp)")] if heading else []
            current.append(block)
    if current:
        out.append(current)
    return out


def numbered(lines: list[str]) -> list[tuple[int, list[str]]]:
    """Group the lines of a numbered list, keeping nested code with its item."""
    items: list[tuple[int, list[str]]] = []
    fence = False
    for line in lines:
        m = None if fence else re.match(r"^(\d+)\. (.*)", line)
        if line.strip().startswith("```"):
            fence = not fence
        if m:
            items.append((int(m.group(1)), [m.group(2)]))
        elif items:
            items[-1][1].append(line)
    return items


def prose_and_code(lines: list[str], link) -> tuple[str, str]:
    prose: list[str] = []
    code: list[str] = []
    fence = False
    for line in lines:
        if line.strip().startswith("```"):
            fence = not fence
            continue
        (code if fence else prose).append(line)
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(prose)).strip()
    return link(text), "\n".join(code).strip()


def first_lang(lines: list[str]) -> str:
    for line in lines:
        if line.strip().startswith("```"):
            return line.strip()[3:].strip() or "text"
    return "text"


def practice(questions: list[str], answers: list[str], hint: str, link) -> list[dict]:
    qs, ans = numbered(questions), numbered(answers)
    if not qs:
        return []
    if [n for n, _ in qs] == [n for n, _ in ans]:
        pairs = [(q, a) for (_, q), (_, a) in zip(qs, ans)]
    else:
        # The numbering does not line up: show every question with the whole answer text.
        whole = "\n".join(f"{n}. " + "\n".join(q) for n, q in qs)
        pairs = [(whole.split("\n"), answers)]
    out = []
    for q, a in pairs:
        prompt, prompt_code = prose_and_code(q, link)
        answer, answer_code = prose_and_code(a, link)
        item = {"prompt": prompt, "answer": answer or "Xem phần mã bên dưới.", "rich": True}
        if prompt_code:
            item["promptCode"], item["promptLang"] = prompt_code, first_lang(q)
        if answer_code:
            item["answerCode"], item["answerLang"] = answer_code, first_lang(a)
        if hint:
            item["hint"] = hint
        out.append(item)
    return out


def lesson(course: str, code: str, path: Path, numbers: dict[str, int], figure: str | None) -> tuple[str, dict]:
    title, parts = sections(path.read_text(encoding="utf-8"))
    title = re.sub(rf"^{re.escape(code)}\s*·\s*", "", title)

    def link(text: str) -> str:
        def swap(m):
            label, url = m.group(1), m.group(2)
            if url.startswith("https://") or url.startswith("http://"):
                return m.group(0)
            name = url.split("/")[-1].split("#")[0]
            if name.endswith(".sql"):
                return f"[{label}](/static/courses/{course}/fixtures/{name})"
            stem = name.removesuffix(".md")
            if stem in numbers:
                return f"[{label}](/lesson/{course}?lesson={numbers[stem] - 1})"
            return label

        return re.sub(r"(?<!!)\[([^\]]+)\]\(([^)\s]+)\)", swap, text)

    reading: list[tuple[str, list[dict]]] = []
    questions: list[str] = []
    answers: list[str] = []
    hint: list[str] = []
    sources: list[dict] = []
    offset = 0
    for heading, lines in parts:
        if heading in DEV_ONLY:
            continue
        if heading in QUESTIONS:
            if heading != "Luyện tập":
                offset = max((n for n, _ in numbered(questions)), default=0)
                lines = [re.sub(r"^(\d+)\. ", lambda m: f"{int(m.group(1)) + offset}. ", l) for l in lines]
            questions += lines
        elif heading in ANSWERS:
            if heading == "Đáp án phần bổ sung":
                lines = [re.sub(r"^(\d+)\. ", lambda m: f"{int(m.group(1)) + offset}. ", l) for l in lines]
            answers += lines
        elif heading in HINTS:
            hint += lines
        elif heading.startswith("Nguồn"):
            sources = blocks(lines, link)
        else:
            body = blocks(lines, link)
            if heading == "Minh họa theo trạng thái" and figure:
                body.append({"type": "figure", "src": figure, "alt": f"Bảng trạng thái của bài {code}: {title}"})
            if body:
                reading.append((heading, body))

    if course == "database_advanced":
        sources.append({"type": "paragraph", "rich": True, "text": "[Giấy phép của các nguồn bên thứ ba](/static/courses/database_advanced/THIRD-PARTY-NOTICES.txt)"})
    if sources:
        reading.append(("Nguồn và đối chiếu", sources))

    hint_text, _ = prose_and_code(hint, link)
    content = {
        "schema": SCHEMA,
        "title": title,
        "step_1": {"heading": title, "read": spreads(reading)},
        "step_2": {"practice": practice(questions, answers, hint_text, link)},
    }
    return title, content


def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def emit(out: Path, course: str, modules: list[dict], bodies: list[dict]) -> dict:
    for body in bodies:
        write(out / course / "lessons" / f"{body['no']}.json", body)
    return {"lessons": len(bodies), "modules": modules}


def markdown_course(out: Path, course: str, grouped: list[tuple[str, list[str]]], minutes: int, figures: Path | None) -> dict:
    order = [code for _, codes in grouped for code in codes]
    numbers = {code: n for n, code in enumerate(order, 1)}
    modules, bodies = [], []
    for module_title, codes in grouped:
        entries = []
        for code in codes:
            figure = None
            if figures and (figures / f"{code}.png").exists():
                target = out / course / "figures" / f"{code}.png"
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(figures / f"{code}.png", target)
                figure = f"/static/courses/{course}/figures/{code}.png"
            title, content = lesson(course, code, SRC / course / f"{code}.md", numbers, figure)
            bodies.append({"no": numbers[code], "code": code, "title": title, "xpReward": 0, "contentJson": content})
            entries.append({"no": numbers[code], "code": code, "title": title, "minutes": minutes})
        modules.append({"title": module_title, "lessons": entries})
    fixtures = SRC / course / "fixtures"
    for f in sorted(fixtures.glob("*.sql")):
        target = out / course / "fixtures" / f.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(f, target)
    return emit(out, course, modules, bodies)


def database(out: Path) -> dict:
    manifest = json.loads((SRC / "database" / "manifest.json").read_text(encoding="utf-8"))
    grouped: list[tuple[str, list[str]]] = []
    for item in manifest["lessons"]:
        label = TOPICS[item["id"][0]]
        if not grouped or grouped[-1][0] != label:
            grouped.append((label, []))
        grouped[-1][1].append(item["id"])
    return markdown_course(out, "database", grouped, 0, None)


def database_advanced(out: Path) -> dict:
    manifest = json.loads((SRC / "database_advanced" / "manifest.json").read_text(encoding="utf-8"))
    grouped = [(m["title"], sorted(m["lessonIds"])) for m in manifest["modules"]]
    grouped.append(("Bổ sung theo bài giảng USTH", [s["id"] for s in manifest["supplementalLessons"]]))
    result = markdown_course(out, "database_advanced", grouped, 0, SRC / "database_advanced" / "assets" / "state-boards")
    notices = SRC / "database_advanced" / "licenses"
    text = "\n\n".join(p.read_text(encoding="utf-8") for p in sorted(notices.iterdir()) if p.is_file())
    (out / "database_advanced" / "THIRD-PARTY-NOTICES.txt").write_text(text, encoding="utf-8")
    return result


def machine_learning(out: Path) -> dict:
    bundle = json.loads((SRC / "machine_learning" / "studio-lessons.json").read_text(encoding="utf-8"))
    modules: list[dict] = []
    bodies = []
    # Module names come from the overview table of the course map: | M3 | name | ids |
    course_map = (SRC / "machine_learning" / "MAP_ML.md").read_text(encoding="utf-8")
    names = dict(re.findall(r"^\| (M\d) \| ([^|]+?) \| ML\d+–ML\d+ \|$", course_map, re.M))
    for row in sorted(bundle["lessons"], key=lambda r: r["sort_order"]):
        key = row["module"].split(" ")[0]
        if not modules or modules[-1]["key"] != key:
            modules.append({"key": key, "title": names[key], "lessons": []})
        no, code = row["sort_order"], row["lesson_code"]
        title = row["title"].removeprefix(f"{code} · ").rstrip(".")
        modules[-1]["lessons"].append({"no": no, "code": code, "title": title, "minutes": row["estimated_minutes"]})
        bodies.append({"no": no, "code": code, "title": title, "xpReward": 0, "contentJson": row["content_json"]})
    for m in modules:
        del m["key"]
    source = SRC / "machine_learning" / "interactive"
    target = out / "machine_learning" / "interactive"
    target.mkdir(parents=True, exist_ok=True)
    for f in sorted(source.glob("*.html")):
        solution = f"{f.stem}.loi-giai.txt"
        shutil.copyfile(source / f"{f.stem}.loi-giai.md", target / solution)
        page = f.read_text(encoding="utf-8").replace('href="loi-giai.md"', f'href="{solution}"')
        # The source folder's README is not published.
        page = re.sub(r'<a href="README\.md">[^<]*</a>', "", page)
        (target / f.name).write_text(page, encoding="utf-8")
    return emit(out, "machine_learning", modules, bodies)


def build(out: Path, catalog: Path) -> None:
    write(
        catalog,
        {
            "database": database(out),
            "database_advanced": database_advanced(out),
            "machine_learning": machine_learning(out),
        },
    )


def snapshot(root: Path) -> dict[str, bytes]:
    return {str(p.relative_to(root)): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}


def main() -> int:
    if "--check" in sys.argv:
        with tempfile.TemporaryDirectory() as tmp:
            out, catalog = Path(tmp) / "courses", Path(tmp) / "doc-courses.json"
            build(out, catalog)
            if snapshot(out) != snapshot(PUBLIC) or catalog.read_bytes() != CATALOG.read_bytes():
                print("pe-doc: committed output is stale; run python3 scripts/pe-doc/build.py")
                return 1
        print("pe-doc: output is up to date")
        return 0
    shutil.rmtree(PUBLIC, ignore_errors=True)
    build(PUBLIC, CATALOG)
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    print({k: v["lessons"] for k, v in data.items()})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
