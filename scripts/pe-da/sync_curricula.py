"""Chép giáo trình của gói pe-da (hoặc bất kỳ môn nào qua `--bundle`, `--course`)
vào frontend/src/lib/curricula.json (CURRICULA, LESSON_META, LESSON_URLS) và catalog.ts.

Mặc định (không truyền tham số) đồng bộ khoá `python_advanced` từ `scripts/pe-da/out`.
Để dùng cho SQL, ML hoặc môn mới khác:
    python3 scripts/pe-da/sync_curricula.py --bundle <thư_mục_gói> --course <mã_môn>
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS_DIR = HERE.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from sync_curricula import build_parser, lesson_meta, run_sync, screen_keys  # noqa: E402, F401

TARGET = SCRIPTS_DIR.parent / 'frontend' / 'src' / 'lib' / 'curricula.json'
SOURCE = HERE / 'out' / 'curriculum-python-advanced.json'


def main(argv: list[str] | None = None) -> int:
    parser = build_parser(
        default_bundle=HERE / 'out',
        default_course='python_advanced',
    )
    args = parser.parse_args(argv)
    return run_sync(args)


if __name__ == '__main__':
    sys.exit(main())
