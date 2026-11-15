"""Chuyển bộ "Python cho Data Analyst" (172 bài .md + practice/curriculum.json) thành
JSON bài `studio-lesson/v1` của nền tảng. KHÔNG ghi DB — chỉ dựng file vào out/.

    py scripts/pe-da/build.py --src "<thư mục python-da>"
    node scripts/pe-da/check-pyodide.mjs          # chấm thử bằng CHÍNH bộ chấm của trình duyệt

Ánh xạ (bộ mới chưa có màn kéo-thả/mini-game của khoá pe-v4, nên chỉ dùng các màn có sẵn):
  lessons/XX.md        -> step_1.theory + step_1.code (ví dụ đầu) + step_1.explain (kết quả các ví dụ)
  activity mcq (+2 mẫu)-> step_2.mcq  (kho quiz ôn tập đọc đúng đường dẫn này)
  activity fill        -> step_3.scaffold (ô trống ①②③; thẻ gây nhiễu lấy từ đáp án các ô khác)
  activity code        -> step_4 (starter, lời giải, ca chấm `solve(<input>)` == <expected>)
  activity manual/short, code mode "script", lib không có trong Pyodide -> không chấm tự động
"""
import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
# Gói Pyodide có sẵn ở frontend/public/pyodide/v0.27.7 (xem check-pyodide.mjs).
PYODIDE_PKGS = {"numpy": "numpy", "pandas": "pandas", "matplotlib": "matplotlib", "sqlite3": "sqlite3"}
STDLIB_OK = set(sys.stdlib_module_names) - {"lzma", "tkinter", "sqlite3", "curses", "readline", "_curses"}
# Chạy thật cần tiến trình/mạng/GUI mà Pyodide không có (bộ chấm chỉ MÔ PHỎNG thread/process).
NEED_REAL_RUNTIME = {"multiprocessing", "subprocess", "socket", "signal", "fcntl", "asyncio"}
# Danh sách bài đã chấm thử bằng Pyodide mà lời giải không đạt (check-pyodide.mjs ghi ra).
DEMOTE = OUT / "demote.json"
XP = {"Cơ bản": 10, "Trung cấp": 15, "Nâng cao": 20}
MINUTES = {"Cơ bản": 25, "Trung cấp": 30, "Nâng cao": 40}


# Chuẩn hoá giá trị trả về (numpy array, tuple, số numpy) về list/số Python trước khi so với `expect`.
NORM = ("__import__('json').loads(__import__('json').dumps(solve(%r), "
        "default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o)))")


def imports_of(code: str) -> set:
    return {m.group(1) for m in re.finditer(r"^\s*(?:import|from)\s+([A-Za-z_][\w]*)", code, re.M)}


def parse_md(text: str):
    """-> (title, level, body_blocks). body_blocks: ('p', str) | ('code', str) | ('out', str)."""
    head, _, rest = text.partition("\n")
    title = re.sub(r"^#\s*[A-Z]+\d+\s*[—-]\s*", "", head).strip()
    m = re.search(r"Mức học:\s*([^.]+)\.", rest)
    level = m.group(1).strip() if m else "Trung cấp"
    body = rest.split("\n## Luyện tập")[0]
    body = re.sub(r"^Mức học:.*$", "", body, flags=re.M)
    blocks, pos = [], 0
    for fm in re.finditer(r"```(\w*)\n(.*?)\n```", body, re.S):
        blocks += [("p", p.strip()) for p in re.split(r"\n{2,}", body[pos:fm.start()]) if p.strip()]
        blocks.append(("code" if fm.group(1) == "python" else "out", fm.group(2)))
        pos = fm.end()
    blocks += [("p", p.strip()) for p in re.split(r"\n{2,}", body[pos:]) if p.strip()]
    # "Kết quả:" chỉ là nhãn của khối out — bỏ khỏi văn xuôi.
    blocks = [b for b in blocks if not (b[0] == "p" and re.fullmatch(r"Kết quả:?", b[1]))]
    return title, level, blocks


def step1(title, level, blocks):
    prose = [t for k, t in blocks if k == "p"]
    codes = [t for k, t in blocks if k == "code"]
    outs = []  # kết quả đi liền sau mỗi khối code
    for i, (k, _) in enumerate(blocks):
        if k == "code":
            nxt = blocks[i + 1] if i + 1 < len(blocks) else None
            outs.append(nxt[1] if nxt and nxt[0] == "out" else "")
    theory = []
    for i in range(0, len(prose), 2):
        theory.append({"title": "Tình huống" if i == 0 else f"Ý chính {i // 2 + 1}",
                       "body": "\n\n".join(prose[i:i + 2])})
    s1 = {"context": {"title": title, "body": prose[0] if prose else title, "level": level}}
    if theory:
        s1["theory"] = theory
    if codes:
        s1["code"] = {"filename": "vi_du.py", "version": "Python 3.12", "source": codes[0], "kind": "demo"}
        s1["explain"] = [{"n": i + 1, "body": ("Ví dụ %d in ra: " % (i + 1)) + (o.strip().replace("\n", " ⏎ ") or "(không in gì)")}
                         for i, o in enumerate(outs)]
    return s1


def mcq_list(act):
    out = []
    for src in [act] + [v for v in act.get("variants", []) if v.get("options")][:2]:
        opts = src.get("options") or act["options"]
        key = src.get("correctOption") or act["correctOption"]
        out.append({
            "question": src.get("prompt") or act["prompt"],
            "options": [{"text": o["text"], "correct": o["id"] == key, "detail": o.get("feedback", "")} for o in opts],
            "explanation": src.get("explanation") or act.get("explanation", ""),
        })
    return out


def scaffold(act):
    tpl, slots, bank, ans = act["template"], [], [], []
    for n, b in enumerate(act["blanks"], 1):
        tpl = tpl.replace("{{%s}}" % b["id"], "{{slot%d}}" % n)
        ans.append(b["answers"][0])
        slots.append({"n": n, "placeholder": b.get("label", ""), "answer": b["answers"][0]})
    for n, b in enumerate(act["blanks"], 1):
        bank.append({"label": b["answers"][0], "slot": n, "trap": ""})
        for wrong in [a for a in dict.fromkeys(ans) if a != b["answers"][0]][:2]:
            bank.append({"label": wrong, "slot": n, "trap": b.get("feedback", "Thẻ này thuộc ô khác.")})
    return {"task": {"title": act["title"], "body": act["prompt"]}, "scaffold": {"template": tpl, "slots": slots, "bank": bank}}


def step4(act, demoted=False):
    """-> (step_4, graded: bool, qa|None)."""
    mode = act.get("mode")
    libs = imports_of(act["referenceSolution"]) | imports_of(act["starter"])
    pkgs = sorted(PYODIDE_PKGS[l] for l in libs if l in PYODIDE_PKGS)
    s4 = {"task": {"title": act["title"], "body": act["prompt"],
                   "io": [{"label": t["name"], "value": "%r → %r" % (t["input"], t["expected"])} for t in act["tests"][:3]]},
          "starterCode": act["starter"], "solutionCode": act["referenceSolution"],
          "hints": [{"title": "Gợi ý %d" % (i + 1), "body": h} for i, h in enumerate(act.get("hints", []))]}
    if pkgs:
        s4["packages"] = pkgs
    blocked = sorted(l for l in libs if l not in PYODIDE_PKGS and (l not in STDLIB_OK or l in NEED_REAL_RUNTIME))
    if mode == "script" or blocked or demoted:
        why = ("chạy bằng script (đọc biến đầu vào, gán biến kết quả)" if mode == "script"
               else "cần %s, không có trong Pyodide" % ", ".join(blocked) if blocked
               else "chưa chạy đạt trong Pyodide (bộ chấm trình duyệt)")
        # Schema đòi bài có code khởi tạo phải có ca chấm — bài không chấm thì bỏ khung code.
        s4.pop("starterCode"), s4.pop("solutionCode")
        s4["procedure"] = ["Bài này %s nên chưa chấm tự động." % why] + \
                          ["Đầu vào %r — kết quả cần có %r." % (t["input"], t["expected"]) for t in act["tests"]]
        return s4, False, None
    s4["tests"] = [{"name": t["name"], "call": NORM % (t["input"],), "expect": repr(t["expected"])} for t in act["tests"]]
    return s4, True, {"solution": act["referenceSolution"], "starter": act["starter"], "packages": pkgs, "tests": s4["tests"], "bad": []}


def manual_step4(act):
    return {"task": {"title": act["title"], "body": act["prompt"]},
            "procedure": list(act.get("steps", [])) + ["Tự kiểm: " + c for c in act.get("checks", [])]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="thư mục python-da (chứa lessons/, practice/, course.json)")
    src = Path(ap.parse_args().src)
    course = json.loads((src / "course.json").read_text(encoding="utf-8"))
    cur = {l["id"]: l for l in json.loads((src / "practice/curriculum.json").read_text(encoding="utf-8"))["lessons"]}
    (OUT / "lessons").mkdir(parents=True, exist_ok=True)
    rows, qa, mods, stats = [], [], [], {"graded": 0, "ungraded_code": 0, "manual": 0, "no_s4": 0, "scaffold": 0, "mcq": 0}
    order = 0
    demote = set(json.loads(DEMOTE.read_text(encoding="utf-8"))) if DEMOTE.exists() else set()
    for gi, g in enumerate(course["groups"], 1):
        module = "M%d · %s" % (gi, g["title"])
        mods.append({"title": module, "lessons": []})
        for code in g["ids"]:
            order += 1
            title, level, blocks = parse_md((src / "lessons" / f"{code}.md").read_text(encoding="utf-8"))
            acts = {a["type"]: a for a in cur[code]["activities"]}
            c = {"schema": "studio-lesson/v1", "title": f"{code} · {title}",
                 "subtitle": f"{level} · {module.split(' · ')[0]} · {MINUTES.get(level, 30)} phút",
                 "source": {"kind": "pe-da", "filename": f"lessons/{code}.md", "parser": "pe-da/build"},
                 "step_1": step1(title, level, blocks),
                 "step_2": {"mcq": mcq_list(acts["mcq"])}}
            stats["mcq"] += len(c["step_2"]["mcq"])
            if "fill" in acts and all(b["answers"] and b["answers"][0].strip() for b in acts["fill"]["blanks"]):
                c["step_3"] = scaffold(acts["fill"])
                stats["scaffold"] += 1
            if "code" in acts:
                c["step_4"], ok, q = step4(acts["code"], code in demote)
                if ok:
                    stats["graded"] += 1
                    qa.append({"code": code, **q})
                else:
                    stats["ungraded_code"] += 1
            elif "manual" in acts:
                c["step_4"] = manual_step4(acts["manual"])
                stats["manual"] += 1
            else:
                stats["no_s4"] += 1
            row = {"lesson_code": code, "sort_order": order, "module": module, "title": c["title"],
                   "subtitle": c["subtitle"], "estimated_minutes": MINUTES.get(level, 30),
                   "xp_reward": XP.get(level, 15), "content_json": c}
            rows.append(row)
            mods[-1]["lessons"].append(f"{code} · {title}")
            (OUT / "lessons" / f"{order:03d}-{code}.json").write_text(json.dumps(row, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "lessons.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    (OUT / "qa.json").write_text(json.dumps(qa, ensure_ascii=False), encoding="utf-8")
    (OUT / "curriculum-python-da.json").write_text(json.dumps({"modules": mods}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Đã dựng %d bài vào %s" % (len(rows), OUT))
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    sys.exit(main())
