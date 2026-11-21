"""Dựng PHAN-VIEC-NHOM.xlsx: mỗi tuần một sheet, lấy cùng dữ liệu với build-phan-viec.py.

    py scripts/docs/build-phan-viec-xlsx.py

Một việc kéo dài qua nhiều tuần thì xuất hiện ở MỌI tuần nó đi qua (cột "Trong tuần này" ghi bắt đầu / tiếp tục / kết thúc).
"""
import importlib.util
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import CellIsRule
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("bp", HERE / "build-phan-viec.py")
bp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bp)

ROOT = bp.ROOT
ITEMS = bp.DATA["items"]
# (tên sheet, ngày đầu, ngày cuối) — ngày là số trong tháng 11
TUAN = [("Tuần 1 (9-15.11)", 9, 15, "Tuần này"), ("Tuần 2 (16-22.11)", 16, 22, "Tuần 2"), ("Tuần 3 (23-29.11)", 23, 29, "Tuần 3"), ("Chốt (30.11)", 30, 30, "Chốt")]


def khoang(ngay: str):
    """Ngày đầu và ngày cuối (trong tháng 11) từ chuỗi như '16–17/11 (SQL), 19–21/11 (ML)'. Tháng 10 coi là ngày 1/11."""
    ds = []
    for m in re.finditer(r"(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/(\d{1,2})", ngay):
        a, b, mo = int(m.group(1)), int(m.group(2) or m.group(1)), int(m.group(3))
        if mo == 11:
            ds += [a, b]
        elif mo == 10:
            ds += [1, 1]
    return (min(ds), max(ds)) if ds else (1, 30)


def nhan_ma():
    ma = {}
    for nh in ("BE", "DB"):
        k = 0
        for it in sorted([i for i in ITEMS if i["nhom"] == nh], key=lambda i: i["bd"]):
            if nh == "BE" and it["ai"] == "Kiên":
                continue
            k += 1
            ma[it["ten"]] = f"{nh}{k}"
    return ma


MA = nhan_ma()
HEAD = ["Mã", "Nhóm", "Việc", "Người làm", "Ngày", "Làm gì", "Gợi ý làm (theo source)", "Xong khi", "% hoàn thành", "Hoàn thành", "Lý do"]
WIDTH = [8, 10, 38, 16, 20, 60, 90, 40, 14, 20, 30]
thin = Side(style="thin", color="D1D5DB")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
FILL_HEAD = PatternFill("solid", fgColor="1F2937")
FILL_BANNER = PatternFill("solid", fgColor="E0ECFF")
FILL_NHOM = {"FE": "FDF2F8", "BE": "ECFDF5", "DB": "FFFBEB", "ML": "F5F3FF", "Tài liệu": "F0F9FF"}


def sheet_tuan(wb, ten, d1, d2, moc_key):
    ws = wb.create_sheet(ten)
    moc = next((m for m in bp.MOC if m[0] == moc_key), None)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(HEAD))
    ws["A1"] = f"{ten}: " + (f"mốc kiểm {moc[2]}. Phải xong: {moc[3]}" if moc else "")
    ws["A1"].alignment = Alignment(wrap_text=True, vertical="top")
    ws["A1"].fill = FILL_BANNER
    ws["A1"].font = Font(bold=True, size=11)
    ws.row_dimensions[1].height = 92
    for c, h in enumerate(HEAD, 1):
        cell = ws.cell(row=2, column=c, value=h)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = FILL_HEAD
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        cell.border = BORDER
        ws.column_dimensions[cell.column_letter].width = WIDTH[c - 1]
    dem = 0
    rows = []
    for it in ITEMS:
        a, b = khoang(it["ngay"])
        if b < d1 or a > d2:
            continue
        tt = "bắt đầu" if d1 <= a <= d2 else ("kết thúc" if d1 <= b <= d2 else "tiếp tục")
        if d1 <= a <= d2 and d1 <= b <= d2:
            tt = "bắt đầu và kết thúc"
        rows.append((a, it, tt))
    rows.sort(key=lambda r: (["FE", "BE", "DB", "ML", "Tài liệu"].index(r[1]["nhom"]), r[0]))
    for a, it, tt in rows:
        dem += 1
        r = 2 + dem
        vals = [MA.get(it["ten"], ""), it["nhom"], it["ten"], it["ai"], it["ngay"],
                "\n".join("• " + x for x in it["lam"]),
                "\n".join(f"{i + 1}. {re.sub(r'^Mẹo: ', 'Mẹo: ', x)}" if not x.startswith("Mẹo:") else x for i, x in enumerate(bp.goi_y(it))),
                bp.xong(it), None, None, None]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = BORDER
            if c <= 3:
                cell.fill = PatternFill("solid", fgColor=FILL_NHOM[it["nhom"]])
        ws.cell(row=r, column=3).font = Font(bold=True)
        ws.row_dimensions[r].height = min(409, max(60, 15 * max(vals[5].count("\n") + 1, vals[6].count("\n") + 1, len(vals[6]) // 95 + 1)))
    if dem:
        last = 2 + dem
        for r in range(3, last + 1):
            ws.cell(row=r, column=9).number_format = "0%"
        dv = DataValidation(type="list", formula1='"Đang làm,Chưa hiểu để làm,Đã nhận task,Hoàn thành,Tạm hoãn"', allow_blank=True)
        dp = DataValidation(type="decimal", operator="between", formula1="0", formula2="1", allow_blank=True)
        ws.add_data_validation(dv)
        ws.add_data_validation(dp)
        dv.add(f"J3:J{last}")
        dp.add(f"I3:I{last}")
        for txt, bg in (("Đang làm", "FFE599"), ("Chưa hiểu để làm", "F4B6B6"), ("Đã nhận task", "BDD7EE"), ("Hoàn thành", "B6E2B6"), ("Tạm hoãn", "D9D9D9")):
            ws.conditional_formatting.add(f"J3:J{last}", CellIsRule(operator="equal", formula=[f'"{txt}"'], fill=PatternFill("solid", bgColor=bg, fgColor=bg)))
    ws.freeze_panes = "D3"
    ws.auto_filter.ref = f"A2:{ws.cell(row=2, column=len(HEAD)).column_letter}{2 + dem}"
    return dem


def sheet_tong_quan(wb):
    ws = wb.active
    ws.title = "Tổng quan"
    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 28
    ws.column_dimensions["C"].width = 60
    ws.column_dimensions["D"].width = 60
    r = 1
    ws.cell(row=r, column=1, value=f"Phân việc nhóm — Programming EDU (PE) — {bp.NGAY_LAP}").font = Font(bold=True, size=14)
    r += 2

    def bang(tieu_de, head, rows, widths_note=None):
        nonlocal r
        ws.cell(row=r, column=1, value=tieu_de).font = Font(bold=True, size=12)
        r += 1
        for c, h in enumerate(head, 1):
            cell = ws.cell(row=r, column=c, value=h)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = FILL_HEAD
            cell.border = BORDER
        r += 1
        for row in rows:
            for c, v in enumerate(row, 1):
                cell = ws.cell(row=r, column=c, value=v)
                cell.alignment = Alignment(wrap_text=True, vertical="top")
                cell.border = BORDER
            r += 1
        r += 1

    bang("Năm nhóm", ["Nhóm", "Ai", "Nhiệm vụ 1", "Nhiệm vụ 2"], [[n["ten"], n["nguoi"], n["nv1"], n["nv2"]] for n in bp.NHOM])
    bang("Mốc kiểm theo tuần", ["Tuần", "Kiểm vào", "Phải xong"], [[m[0] + " (" + m[1] + ")", m[2], m[3]] for m in bp.MOC])
    bang("Nguyên tắc không chờ nhau", ["#", "Nội dung"], [[i + 1, x] for i, x in enumerate(bp.NGUYEN_TAC)])
    bang("Quyết định đã đặt mặc định (áp dụng ngay, đổi được sau, không chặn ai)", ["Mã", "Câu hỏi", "Vì sao / Mặc định áp dụng ngay", "Ai quyết"],
         [[q[0], q[1], q[2] + "\nMặc định: " + q[3], q[4]] for q in bp.QUYET_DINH])
    bang("Đã làm (theo repo)", ["Ai", "Việc", "Bằng chứng"], [[d["nguoi"], d["viec"], d["bang_chung"]] for d in bp.DATA["da_lam"]])
    bang("Nếu trễ", ["#", "Nội dung"], [[i + 1, x] for i, x in enumerate(bp.CAT)])


def sheet_hop_dong(wb):
    ws = wb.create_sheet("Hợp đồng chung", 1)
    for col, w in zip("ABCD", (8, 28, 110, 70)):
        ws.column_dimensions[col].width = w
    ws["A1"] = "Hợp đồng chung: mỗi bên làm đúng hợp đồng, không chờ bên kia (bên dùng làm bằng dữ liệu giả đúng hợp đồng và có test hợp đồng)"
    ws["A1"].font = Font(bold=True, size=12)
    for c, h in enumerate(["Mã", "Hợp đồng", "Nội dung", "Ai cấp, ai dùng"], 1):
        cell = ws.cell(row=3, column=c, value=h)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = FILL_HEAD
        cell.border = BORDER
    for r, h in enumerate(bp.HOP_DONG, 4):
        for c, v in enumerate(h, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = BORDER
        ws.row_dimensions[r].height = max(45, 15 * (len(h[2]) // 105 + 1))
    ws.freeze_panes = "A4"


def main():
    wb = Workbook()
    sheet_tong_quan(wb)
    tong = {}
    for ten, d1, d2, key in TUAN:
        tong[ten] = sheet_tuan(wb, ten, d1, d2, key)
    import sys; out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "PHAN-VIEC-NHOM.xlsx"
    wb.save(out)
    print("đã dựng", out.name, tong)


if __name__ == "__main__":
    main()
