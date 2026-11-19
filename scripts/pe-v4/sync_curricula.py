"""Chép giáo trình từ gói bài pe-v4 (hoặc gói bất kỳ qua `--bundle`, `--course`) vào
frontend/src/lib/curricula.json (CURRICULA, LESSON_META, LESSON_URLS) và catalog.ts.

Mặc định (không truyền tham số) trỏ vào gói pe-v4 (48 bài `out-advanced`).
Khi muốn chép môn khác, truyền `--bundle` và `--course` hoặc gọi thẳng
`python3 scripts/sync_curricula.py --bundle <thư_mục> --course <mã_môn>`.
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
SOURCE = HERE / 'out-advanced' / 'curriculum-python-advanced.json'

# Giữ định nghĩa tường minh tại đây để test kiến trúc (`fonts-naming.test.mjs`)
# kiểm tra danh sách khoá đã gỡ; chỉ áp dụng khi bật cờ `--prune-dropped`.
DROPPED_COURSES = ('python', 'cpp', 'java', 'htmlcss')


def main(argv: list[str] | None = None) -> int:
    default_bundle = HERE / 'out-advanced'
    parser = build_parser(
        default_bundle=default_bundle,
        default_course='python_advanced',
    )
    args = parser.parse_args(argv)
    if args.curriculum is None and Path(args.bundle).resolve() == default_bundle.resolve() and args.course == 'python_advanced':
        args.curriculum = str(SOURCE)
    return run_sync(args)


if __name__ == '__main__':
    sys.exit(main())
