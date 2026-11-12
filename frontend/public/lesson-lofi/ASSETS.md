# Bảng asset — màn bài học (lofi tím tối)

Sinh tự động bởi `scripts/build-lesson-assets.mjs` — **đừng sửa tay**, sửa script rồi chạy lại.
Đường dẫn công khai: `/lesson-lofi/<tên>`. Tổng: 20 tệp, 119 KB.

Quy ước định dạng: **SVG** cho hình đơn giản · **WebP** cho cảnh · **sprite WebP** cho nhóm vật nhỏ.
Nguồn tranh vẽ tay của banner/nền: `public/goc-hoc/items/*.webp` và `public/goc-hoc/room-blur.webp` (không đổi).

| Tên | Định dạng | Kích thước (px) | Dung lượng | Dùng ở |
|---|---|---|---|---|
| `scenes/banner-example.webp` | WEBP | 480×192 | 19 KB | ShellB: vật đứng trên mép thẻ · Ví dụ (laptop có dòng mã) |
| `scenes/banner-predict.webp` | WEBP | 480×192 | 17 KB | ShellB: vật đứng trên mép thẻ · Dự đoán (bảng ghim + bong bóng ?) |
| `scenes/banner-quiz.webp` | WEBP | 480×192 | 16 KB | ShellB: vật đứng trên mép thẻ · Trắc nghiệm (điện thoại + A B C) |
| `scenes/banner-recap.webp` | WEBP | 480×192 | 17 KB | Recap: vật đứng trên mép thẻ · Tổng kết (cúp + huy chương) |
| `scenes/banner-theory.webp` | WEBP | 480×192 | 15 KB | ShellB: vật đứng trên mép thẻ · Lý thuyết / Bài đọc (sách mở + cà phê) |
| `scenes/night-desk-1600.webp` | WEBP | 1600×893 | 7.5 KB | LofiBackdrop: phông nền đêm khổ ngang (≥ 720px) |
| `scenes/night-desk-720.webp` | WEBP | 720×1280 | 5.0 KB | LofiBackdrop: phông nền đêm khổ dọc (điện thoại) |
| `sprites/props.json` | JSON | — | 0.1 KB | Bản đồ ô của `props.webp` (thứ tự ô, cỡ ô) — tài liệu cho CSS/thiết kế |
| `sprites/props.webp` | WEBP | 512×64 | 5.8 KB | LofiBackdrop: 8 vật nhỏ (sao, lấp lánh, tim, lửa, lá, giấy nhớ, bút chì, chấm sáng) bay chậm; CSS `background-position` theo chỉ số ô |
| `svg/badge-example.svg` | SVG | 96×96 | 0.9 KB | ShellB: huy hiệu đầu thẻ · màn Ví dụ (`context`, `explain`, `trace`, `memory`) |
| `svg/badge-predict.svg` | SVG | 96×96 | 1.1 KB | ShellB: huy hiệu đầu thẻ · màn Dự đoán kết quả (`predict`, `counter`) |
| `svg/badge-quiz.svg` | SVG | 96×96 | 1.4 KB | ShellB: huy hiệu đầu thẻ · màn Trắc nghiệm (`mcq`, `classify`, `practice`…) |
| `svg/badge-recap.svg` | SVG | 96×96 | 1.0 KB | Recap: huy hiệu đầu thẻ · màn Tổng kết (`recap`) |
| `svg/badge-theory.svg` | SVG | 96×96 | 1.0 KB | ShellB: huy hiệu đầu thẻ · màn Lý thuyết & Bài đọc (`theory`, `read`) |
| `svg/bookmark.svg` | SVG | 30×100 | 0.4 KB | ShellB: dải đánh dấu trang treo mép thẻ Lý thuyết/Bài đọc |
| `svg/lamp.svg` | SVG | 220×340 | 0.9 KB | LofiBackdrop: đèn bàn góc trái dưới + nón sáng (chỉ màn ≥ 1100px) |
| `svg/moon.svg` | SVG | 160×160 | 0.5 KB | LofiBackdrop: trăng góc phải trên (nền mọi màn bài học) |
| `svg/plant.svg` | SVG | 170×250 | 0.6 KB | LofiBackdrop: chậu cây góc phải dưới, đung đưa (chỉ màn ≥ 1100px) |
| `svg/string-lights.svg` | SVG | 1440×72 | 8.1 KB | LofiBackdrop: dây đèn nhấp nháy dưới thanh trên (ẩn ở điện thoại hẹp) |
| `svg/washi-tape.svg` | SVG | 120×34 | 0.5 KB | ShellB: băng dính ở góc thẻ Lý thuyết/Bài đọc |
