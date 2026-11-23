// Cấu hình Playwright cho bộ e2e kiểm thử trên trình duyệt.
//
// Các spec chạy hoàn toàn bằng dữ liệu giả lập (`page.route`) + Pyodide tự host
// (`public/pyodide/`), không cần backend hay DB:
// - `python-advanced`: luồng bài học LofiWorkspace + Pyodide
// - `mobile-responsive`: kiểm tra co giãn giao diện trên màn hình nhỏ
// Chạy: cd frontend && npm run test:e2e
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  retries: 0,
  workers: 1, // các test dùng chung tài khoản — chạy tuần tự
  // Báo cáo HTML để đẩy lên artifact khi CI đỏ; `open: 'never'` kẻo nó tự mở
  // trình duyệt và treo runner.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1600, height: 1000 },
    headless: true,
    trace: 'retain-on-failure',
  },

  // Trước đây không có khối này: config giả định người chạy đã tự `npm run dev`
  // ở cổng 3000, nên CI không thể chạy e2e (xem chú thích trong ci.yml).
  //
  // Vì sao `build && start` chứ không `dev`:
  //  - `next dev` bật React StrictMode, mount component HAI lần. Runner
  //    studio-lesson vừa sửa đúng một lỗi StrictMode, mà e2e lại khẳng định
  //    `consoleErrors` rỗng — chạy ở dev là test chế độ người học KHÔNG dùng,
  //    double-mount sinh cảnh báo/đỏ giả không liên quan tới bug thật.
  //  - dev biên dịch theo yêu cầu: lần vào trang đầu tiên mất vài giây mới
  //    xong, nằm luôn trong đồng hồ của test.
  //  - bản build là thứ thật sự ship; bắt được cả lỗi chỉ xuất hiện khi
  //    minify/SSR production.
  // Đổi lại là chờ build lúc khởi động, nên timeout dưới đây tính cả build.
  webServer: {
    command: 'npm run build && npm run start',
    // Config nằm trong e2e/, mà script npm nằm ở frontend/ — Playwright lấy cwd
    // mặc định là thư mục chứa config.
    cwd: '..',
    url: 'http://localhost:3000',
    // Build + khởi động Next trên runner CI nguội chậm hơn máy làm việc nhiều
    // (lần nạp Pyodide đầu ~2s ở máy, runner thì chậm hơn). 300s là để build
    // xong chứ không phải để chờ một request.
    timeout: 300_000,
    // Ở máy: đang mở `npm run dev` thì dùng luôn, đừng build lại. Trên CI thì
    // không có gì sẵn — và nếu có, đó là dấu hiệu port bị chiếm, nên cứ để đỏ.
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
