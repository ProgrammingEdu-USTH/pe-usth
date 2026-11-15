// E2E khoá pe-da (179 bài, python_advanced) bằng FIXTURE: PY01 và NP02 × hai giao diện
// (lofi / thien-van) × sáng/tối × hai khổ (điện thoại 390×844, máy tính 1280×720) = 16 ca.
//
// VÌ SAO CÓ TỆP NÀY: bộ e2e cũ có 11 ca, 7 ca chơi khoá pe-v3 đã bỏ và 0 ca chạm pe-da,
// nên loại lỗi như 172fcfa (khối code của đề trắc nghiệm dính LIỀN phương án A, 0px ở
// 471/1032 câu) hoàn toàn nằm ngoài tầm với của nó. Bộ unit (`node --test`) đọc CSS tĩnh
// và không thấy được thứ chỉ hiện ra khi dựng cả trang: khoảng cách thật giữa hai khối,
// thanh có thật sự ghim không, nút có thật sự đủ cỡ ngón tay không.
//
// KHÔNG chạm API thật: mọi request tới origin API bị `page.route` chặn và trả dữ liệu từ
// `scripts/pe-da/out/lessons.json` (bản dựng THẬT, không phải fixture bịa — fixture bịa làm
// test nói dối). 0 request tới production, không tạo tài khoản khách thật, không ghi gì.
// Cần `py scripts/pe-da/build.py` đã chạy (tệp `out/lessons.json` có trong cây mã).
//
//   cd frontend && npx playwright test -c e2e/playwright.config.ts python-da --workers=1
//
// BẤT BIẾN mỗi ca (đỏ là đỏ — một ca đỏ THẬT là phát hiện, đừng nới cho xanh):
//   · không tràn ngang; 0 console error;
//   · ở 390: cuộn xuống rồi thanh trên vẫn y=0 (sticky THẬT ghim, xem lesson-chrome-sticky);
//   · khối code của đề trắc nghiệm cách phương án A ≥ 8px (lỗi 172fcfa);
//   · ở 390: đích bấm ≥ 44×44 trừ danh sách ĐỌC từ dich-bam-vo-bai-hoc.test.mjs;
//   · reducedMotion → 0 hoạt ảnh đang chạy.
// Chỉ IN báo cáo, không làm đỏ: số hoạt ảnh vô hạn đang chạy, số phần tử có vành focus.
import { readFileSync } from 'fs';
import { join } from 'path';
import { expect, test, type Page, type Route } from '@playwright/test';

// Khoá và giá trị theo lib/giao-dien.ts (nguồn duy nhất). Chép chuỗi thay vì import vì spec
// chạy bằng trình nạp của Playwright, nơi alias `@/` không có — nhưng `giao-dien.test.mjs`
// đã bắt ba nơi khớp nhau, và ca đầu của tệp này kiểm `data-theme` thật sự được áp.
const KHOA_GIAO_DIEN = 'pe-giao-dien';
const KHOA_CHE_DO = 'theme';

/**
 * PHÁT HIỆN THẬT do chính spec này tìm ra ngày đầu chạy (390×844, màn đầu PY01/NP02): hai đích bấm
 * dưới 44px mà bộ unit không canh, vì cổng `dich-bam-vo-bai-hoc` chỉ quét rule có
 * `cursor: pointer` còn hai thứ này là một `<input>` và một `<a>`. Khai ở đây thay vì nới bất biến,
 * kèm số đo; việc SỬA CSS của chúng là một lát riêng (xem báo cáo của vòng tạo spec).
 * Mỗi mục là chuỗi con của tên lớp đã băm. Danh sách này CHỈ ĐƯỢC NGẮN ĐI.
 */
const DA_BIET_DUOI_SAN: Record<string, string> = {
  tracePredictInput: 'ô gõ dự đoán của cổng dự đoán: 301×37 ở 390px',
  TryItButton_button: 'liên kết "Thử ngay trong IDE": 185×42 ở 390px',
};

const API = process.env.E2E_API_URL || 'http://localhost:5000';
const GOC = join(__dirname, '..', '..');
const BUNDLE = join(GOC, 'scripts', 'pe-da', 'out', 'lessons.json');

type Row = { lesson_code: string; sort_order: number; title: string; xp_reward: number; content_json: unknown };
const rows: Row[] = JSON.parse(readFileSync(BUNDLE, 'utf8')).lessons;
const theoMa = (ma: string) => {
  const r = rows.find((x) => x.lesson_code === ma);
  if (!r) throw new Error(`bản dựng không có bài ${ma}`);
  return r;
};

if (process.env.PW_CHANNEL) test.use({ channel: process.env.PW_CHANNEL });

/**
 * Đích bấm CỐ Ý/CHƯA ĐO dưới sàn — ĐỌC từ chính cổng unit, không chép sang bản thứ hai.
 * Một bản chép sẽ trôi khỏi bản gốc, và trôi theo chiều "đỏ oan" hoặc "xanh giả".
 * Lấy tên LỚP của mọi khoá thuộc ba danh sách khai (CHUA_DO · KHONG_CO_DUONG_TOI · NGOAI_TAM).
 */
function lopMienSan(): string[] {
  const nguon = readFileSync(join(__dirname, 'unit', 'dich-bam-vo-bai-hoc.test.mjs'), 'utf8');
  const ten = new Set<string>();
  for (const tenHang of ['CHUA_DO', 'KHONG_CO_DUONG_TOI', 'NGOAI_TAM']) {
    const at = nguon.indexOf(`const ${tenHang} = {`);
    if (at < 0) throw new Error(`dich-bam-vo-bai-hoc.test.mjs không còn \`const ${tenHang}\``);
    const het = nguon.indexOf('\n};', at);
    for (const m of nguon.slice(at, het).matchAll(/^ {2}'([^']+)':/gm))
      for (const c of m[1].matchAll(/\.([A-Za-z_][\w-]*)/g)) ten.add(c[1]);
  }
  // Phép đọc trả rỗng là cổng tự khai khống độ phủ — đòi có kết quả.
  if (ten.size < 5) throw new Error(`chỉ đọc được ${ten.size} lớp miễn sàn — phép đọc trượt?`);
  return [...ten];
}

async function mockApi(page: Page, loi: string[]) {
  const cors = { 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Credentials': 'true' };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    if (req.method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Headers': 'authorization,content-type',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE',
        },
      });
    if (p.startsWith('/auth/')) return json(route, { access: 'fx', refreshExpiresIn: 86400 });
    if (p === '/api/user') return json(route, { ok: true, id: 1, role: 'user', email: 'fx@guest.local', name: 'Khách thử' });
    if (p === '/api/enrolled')
      return json(route, {
        ok: true,
        enrolled: [{ id: 'python_advanced', courseId: 'python_advanced', totalLessons: rows.length, completedLessons: 0, progress: 0 }],
      });
    if (p === '/api/stats') return json(route, { ok: true, streak: 3 });
    // Lớp ghi nhật ký TẮT: không đồng ý thì không ghi (và không hỏi, để banner không che màn).
    if (p.startsWith('/api/events/consent')) return json(route, { ok: true, shouldAsk: false, granted: false, version: 0 });
    if (p.startsWith('/api/events')) return json(route, { ok: true, refused: 'no-consent' }, 202);
    const noiDung = /^\/api\/courses\/python_advanced\/lessons\/(\d+)\/content$/.exec(p);
    if (noiDung) {
      const r = rows.find((x) => x.sort_order === Number(noiDung[1]));
      if (!r) return json(route, { ok: false, message: 'Không có bài' }, 404);
      return json(route, { ok: true, completed: false, lesson: { title: r.title, xpReward: r.xp_reward, contentJson: r.content_json } });
    }
    // Mọi đường khác: trả ok rỗng nhưng GHI LẠI — một lời gọi bất ngờ là thứ ca phải thấy.
    loi.push(`API chưa giả: ${req.method()} ${p}`);
    return json(route, { ok: true });
  });
}

const BAI = ['PY01', 'NP02'] as const;
const GIAO_DIEN = ['lofi', 'thien-van'] as const;
const CHE_DO = ['sang', 'toi'] as const;
const KHO = [
  { ten: '390x844', width: 390, height: 844 },
  { ten: '1280x720', width: 1280, height: 720 },
] as const;

for (const ma of BAI)
  for (const gd of GIAO_DIEN)
    for (const cd of CHE_DO)
      for (const kho of KHO) {
        test(`pe-da ${ma} · ${gd} · ${cd} · ${kho.ten}`, async ({ page }) => {
          const hang = theoMa(ma);
          const consoleErrors: string[] = [];
          const apiLa: string[] = [];
          page.on('console', (m) => {
            if (m.type() === 'error') consoleErrors.push(m.text());
          });
          page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
          await page.setViewportSize({ width: kho.width, height: kho.height });
          await mockApi(page, apiLa);
          // Đặt giao diện + sáng/tối TRƯỚC khi vẽ, đúng đường script trước-paint của layout đọc.
          await page.addInitScript(
            ([kg, kc, giaoDien, cheDo]) => {
              try {
                localStorage.setItem(kc, cheDo === 'toi' ? 'dark' : 'light');
                if (giaoDien === 'lofi') localStorage.removeItem(kg);
                else localStorage.setItem(kg, giaoDien);
              } catch {
                /* không ghi được thì ca sẽ đỏ ở phép kiểm giao diện bên dưới */
              }
            },
            [KHOA_GIAO_DIEN, KHOA_CHE_DO, gd, cd] as const,
          );

          await page.goto(`/lesson/python_advanced?lesson=${hang.sort_order - 1}`);
          await expect(page.locator('[data-cta="primary"]')).toBeVisible({ timeout: 120_000 });

          // 0) Giao diện THẬT được áp — nếu không, mọi bất biến dưới đây đo nhầm bảng.
          const ap = await page.evaluate(() => ({
            theme: document.documentElement.getAttribute('data-theme'),
            dark: document.body.classList.contains('dark'),
          }));
          expect(ap.theme, 'data-theme trên <html>').toBe(gd === 'lofi' ? null : gd);
          expect(ap.dark, 'body.dark').toBe(cd === 'toi');

          // 1) Không tràn ngang (đo cả body: body có overflow-x thì documentElement che mất).
          const tran = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
          });
          expect(tran, 'tràn ngang (px)').toBeLessThanOrEqual(0);

          // 2) Thanh trên ghim THẬT (chỉ điện thoại — ở máy tính trang đủ rộng để không tràn).
          if (kho.width < 600) {
            const cuon = await page.evaluate(async () => {
              const cao = document.documentElement.scrollHeight - innerHeight;
              window.scrollTo(0, Math.min(400, cao));
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
              const bar = document.querySelector('header[class*="topBar"]');
              return { y: bar ? Math.round(bar.getBoundingClientRect().top) : null, scrollY: Math.round(scrollY), cao };
            });
            expect(cuon.y, 'không tìm thấy header.topBar').not.toBeNull();
            expect(cuon.y, `thanh trên y sau khi cuộn ${cuon.scrollY}px (trang cao dư ${cuon.cao}px)`).toBe(0);
            await page.evaluate(() => window.scrollTo(0, 0));
          }

          // 3) Đích bấm ≥ 44×44 ở điện thoại. Đo bằng offset*: getBoundingClientRect nói dối ~0,7px
          //    khi tổ tiên đang chạy hoạt ảnh vào màn (xem AGENTS.md, mục .stepEnter).
          const mien = lopMienSan();
          const demDichBam = async (nhan: string) => {
            if (kho.width >= 1024) return;
            await page.waitForTimeout(700); // chờ hoạt ảnh vào màn lắng
            const nho = await page.evaluate(({ lop, biet }) => {
              const lopCua = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
              const duocMien = (el: Element) =>
                lopCua(el).some((c) => lop.some((n) => c === n || c.includes('_' + n + '__') || c.endsWith('__' + n)) || biet.some((n) => c.includes(n)));
              const ra: string[] = [];
              for (const el of document.querySelectorAll<HTMLElement>(
                'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button]',
              )) {
                const cs = getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none') continue;
                // ô radio/checkbox ẩn thật (opacity 0 + nằm trong <label>) thì nhãn là đích bấm
                if (el.tagName === 'INPUT' && el.closest('label') && (cs.opacity === '0' || el.offsetWidth < 2)) continue;
                if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
                // Phần tử không nằm trong khung nhìn ngang (cuộn ngang nội bộ, ví dụ bảng) vẫn tính.
                if (el.offsetWidth >= 44 && el.offsetHeight >= 44) continue;
                let cha: Element | null = el;
                let mienTru = false;
                while (cha && cha !== document.body) {
                  if (duocMien(cha)) { mienTru = true; break; }
                  cha = cha.parentElement;
                }
                if (mienTru) continue;
                ra.push(`<${el.tagName.toLowerCase()} class="${(el.getAttribute('class') ?? '').slice(0, 60)}"> ${el.offsetWidth}×${el.offsetHeight} «${(el.textContent ?? '').trim().slice(0, 24)}»`);
              }
              return ra;
            }, { lop: mien, biet: Object.keys(DA_BIET_DUOI_SAN) });
            expect(nho, `${nhan}: đích bấm dưới 44×44 ngoài danh sách miễn của dich-bam-vo-bai-hoc`).toEqual([]);
          };
          await demDichBam('màn đầu');

          // 4) Khối code của ĐỀ TRẮC NGHIỆM cách phương án A ≥ 8px (172fcfa: 0px ở 471/1032 câu).
          //    Đi tiếp bằng nút chính tới màn trắc nghiệm có khối code; PY01 và NP02 đều có sẵn.
          const MAN_TOI_DA = 24;
          let khoang: { codeBottom: number; aTop: number } | null = null;
          const vet: string[] = [];
          for (let i = 0; i < MAN_TOI_DA && !khoang; i++) {
            khoang = await page.evaluate(() => {
              // CodeBlock của đề đặt filename="python" + langTag "đoạn code của câu hỏi".
              const the = [...document.querySelectorAll('*')].find(
                (e) => e.children.length === 0 && (e.textContent ?? '').trim() === 'đoạn code của câu hỏi',
              );
              if (!the) return null;
              // Leo lên tới khối bọc có phương án phía sau: khối <div> bọc CodeBlock trong McqScreen.
              let khoi: Element | null = the;
              while (khoi && !khoi.parentElement?.querySelector('[role="radio"], [role="radiogroup"], button[class*="optionCard"], [class*="optionCard"]'))
                khoi = khoi.parentElement;
              if (!khoi || !khoi.parentElement) return null;
              const a = khoi.parentElement.querySelector('[class*="optionCard"], [role="radio"]');
              if (!a) return null;
              // Đáy của KHỐI CODE là đáy phần tử gần nhất có chữ "đoạn code" — dùng đáy của khối bọc
              // trực tiếp con của cha chung với phương án A: đó là thứ người học thấy kề phương án.
              return { codeBottom: khoi.getBoundingClientRect().bottom, aTop: a.getBoundingClientRect().top };
            });
            if (khoang) break;
            const nut = page.locator('[data-cta="primary"]');
            vet.push(`${i}:${((await nut.textContent()) ?? '').trim()}${(await nut.isEnabled()) ? '' : '(tắt)'}`);
            if (!(await nut.isEnabled())) {
              // Màn trắc nghiệm đang đợi một lựa chọn: chọn phương án đầu (đúng hay sai đều đi tiếp được).
              const the = page.locator('[class*="optionCard"]').first();
              if (!(await the.count())) break;
              await the.click();
              if (!(await nut.isEnabled())) break;
            }
            await nut.click();
            await page.waitForTimeout(120);
          }
          expect(khoang, `không tới được màn trắc nghiệm có khối code — vết nút chính: ${vet.join(' | ')}`).not.toBeNull();
          if (khoang) {
            expect(
              Math.round(khoang.aTop - khoang.codeBottom),
              `khoảng cách đáy khối code → phương án A (code ${Math.round(khoang.codeBottom)}, A ${Math.round(khoang.aTop)})`,
            ).toBeGreaterThanOrEqual(8);
          }
          await demDichBam('màn trắc nghiệm');

          // IN BÁO CÁO (không làm đỏ): hoạt ảnh vô hạn đang chạy.
          const baoCao = await page.evaluate(() => {
            const an = document.getAnimations().filter((a) => a.playState === 'running');
            return { dangChay: an.length, voHan: an.filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length };
          });
          test.info().annotations.push({ type: 'hoat-anh', description: `đang chạy ${baoCao.dangChay}, vô hạn ${baoCao.voHan}` });

          // 5) reducedMotion → 0 hoạt ảnh đang chạy.
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForTimeout(400);
          const conChay = await page.evaluate(() =>
            document
              .getAnimations()
              .filter((a) => a.playState === 'running')
              .map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.id ?? '?'),
          );
          expect(conChay, 'hoạt ảnh còn chạy dưới prefers-reduced-motion').toEqual([]);

          // 6) Console sạch + không lời gọi API ngoài danh sách đã giả.
          expect(consoleErrors, 'console error').toEqual([]);
          expect(apiLa, 'lời gọi API chưa được giả').toEqual([]);
        });
      }
