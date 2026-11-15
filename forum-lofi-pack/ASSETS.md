# Bảng Quản Lý Asset Diễn Đàn Lofi (`frontend/public/forum-lofi/`)

Bộ asset phục vụ các màn của **Diễn đàn thảo luận Lofi Dark-Purple** (truy cập từ **Điện thoại** trên bàn học và mục **Diễn đàn** ở thanh bên phải Góc học):
- **Danh sách có lọc 4 chuyên mục**: Thảo luận (`discuss`), Hỏi đáp (`question`), Chia sẻ (`share`), Gỡ lỗi (`help`)
- **Chi tiết bài viết & tạo chủ đề mới**
- **Bình luận lồng 2 cấp (`parentCommentId` / `replies`)**
- **6 loại cảm xúc tương tác**: Thích (`like`), Yêu thích (`love`), Haha (`haha`), Wow (`wow`), Buồn (`sad`), Phẫn nộ (`angry`)

| Tên file | Định dạng | Kích thước (px) | Dung lượng | Dùng ở đâu |
| :--- | :--- | :--- | :--- | :--- |
| `svg/cat-discuss.svg` | SVG | `96×96` | 1.2 KB | Huy hiệu chuyên mục **Thảo luận** (`discuss`) ở thanh lọc & thẻ bài viết |
| `svg/cat-question.svg` | SVG | `96×96` | 1.2 KB | Huy hiệu chuyên mục **Hỏi đáp** (`question`) ở thanh lọc & thẻ bài viết |
| `svg/cat-share.svg` | SVG | `96×96` | 1.1 KB | Huy hiệu chuyên mục **Chia sẻ** (`share`) ở thanh lọc & thẻ bài viết |
| `svg/cat-help.svg` | SVG | `96×96` | 1.0 KB | Huy hiệu chuyên mục **Gỡ lỗi / Cần giúp** (`help`) ở thanh lọc & thẻ bài viết |
| `svg/react-like.svg` | SVG | `64×64` | 0.6 KB | Biểu cảm **Thích** (`like`) trên bài viết & bình luận lồng |
| `svg/react-love.svg` | SVG | `64×64` | 0.6 KB | Biểu cảm **Yêu thích** (`love`) trên bài viết & bình luận lồng |
| `svg/react-haha.svg` | SVG | `64×64` | 0.7 KB | Biểu cảm **Haha** (`haha`) trên bài viết & bình luận lồng |
| `svg/react-wow.svg` | SVG | `64×64` | 0.7 KB | Biểu cảm **Wow** (`wow`) trên bài viết & bình luận lồng |
| `svg/react-sad.svg` | SVG | `64×64` | 0.7 KB | Biểu cảm **Buồn** (`sad`) trên bài viết & bình luận lồng |
| `svg/react-angry.svg` | SVG | `64×64` | 0.8 KB | Biểu cảm **Phẫn nộ** (`angry`) trên bài viết & bình luận lồng |
| `svg/phone-shell-lofi.svg` | SVG | `420×820` | 1.2 KB | Khung viền điện thoại Lofi Dark-Purple (`#phone` / mockup Figma) |
| `svg/thread-connector.svg` | SVG | `36×120` | 0.5 KB | Đường nối nhánh bình luận lồng 2 cấp (`parentCommentId` → `replies`) |
| `svg/compose-quill.svg` | SVG | `64×64` | 0.6 KB | Biểu tượng nút **Tạo chủ đề mới** & khung soạn thảo bài viết |
| `svg/empty-forum.svg` | SVG | `180×140` | 0.8 KB | Minh họa trạng thái trống khi bộ lọc chuyên mục chưa có bài viết |
| `scenes/forum-lounge-1600.webp` | WebP | `1600×893` | 8.1 KB | Cảnh nền phòng thảo luận lofi ban đêm (`1600×893`) |
| `scenes/phone-forum-bg.webp` | WebP | `540×960` | 3.3 KB | Hình nền lofi tím trầm bên trong màn hình Điện thoại (`#phone .scr`) |
| `scenes/banner-discuss.webp` | WebP | `480×160` | 2.1 KB | Banner đầu chuyên mục **Thảo luận** (`discuss`) |
| `scenes/banner-question.webp` | WebP | `480×160` | 1.7 KB | Banner đầu chuyên mục **Hỏi đáp** (`question`) |
| `scenes/banner-share.webp` | WebP | `480×160` | 1.7 KB | Banner đầu chuyên mục **Chia sẻ** (`share`) |
| `scenes/banner-help.webp` | WebP | `480×160` | 2.0 KB | Banner đầu chuyên mục **Gỡ lỗi / Cần giúp** (`help`) |
| `sprites/reactions-sprite.webp` | Sprite WebP + JSON | `384×64 (6 ô 64×64)` | 10.6 KB | Sprite 6 loại cảm xúc (`like`, `love`, `haha`, `wow`, `sad`, `angry`) cho khay cảm xúc nhanh |
| `sprites/forum-badges-sprite.webp` | Sprite WebP + JSON | `384×64 (6 ô 64×64)` | 6.7 KB | Sprite 6 nhãn nhỏ diễn đàn (`pin`, `solved`, `hot`, `reply`, `code`, `online`) |
