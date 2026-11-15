// Kiểm chứng Diễn đàn Lofi (Góc học -> Điện thoại & Thanh bên phải):
//   1. Đúng 4 chuyên mục khớp hợp đồng backend (discuss, question, share, help).
//   2. Đúng 6 loại cảm xúc khớp hợp đồng backend (like, love, haha, wow, sad, angry).
//   3. Bình luận lồng 2 cấp (gốc + phản hồi có đường nối .lf-thread-line) & bật/tắt cảm xúc.
//   4. Chống XSS trên mọi trường người dùng nhập (tác giả, tiêu đề, nội dung, bình luận).
//   5. Đủ bộ asset riêng trong `public/forum-lofi/` (SVG, WebP cảnh, Sprite + JSON, ASSETS.md).
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  BAI_MAU_DIEN_DAN,
  CAM_XUC_DIEN_DAN,
  CHAT_MAU_DIEN_DAN,
  CHUYEN_MUC_DIEN_DAN,
  batTatCamXuc,
  escForumHtml,
  renderForumMarkup,
  tongBinhLuan,
  tongCamXuc,
} from '../../src/components/goc-hoc/forum-lofi.js';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const THU_MUC_ASSET = join(GOC, 'public', 'forum-lofi');

test('4 chuyên mục diễn đàn khớp hợp đồng backend (discuss, question, share, help)', () => {
  const ids = CHUYEN_MUC_DIEN_DAN.map((c) => c.id);
  assert.deepEqual(ids, ['discuss', 'question', 'share', 'help']);
  for (const c of CHUYEN_MUC_DIEN_DAN) {
    assert.ok(c.name && c.desc && c.badge && c.banner);
    const iconPath = join(GOC, 'public', c.badge.replace(/^\//, ''));
    const bannerPath = join(GOC, 'public', c.banner.replace(/^\//, ''));
    assert.ok(existsSync(iconPath), `thiếu icon chuyên mục: ${c.badge}`);
    assert.ok(existsSync(bannerPath), `thiếu banner chuyên mục: ${c.banner}`);
  }
});

test('6 loại cảm xúc diễn đàn khớp hợp đồng backend (like, love, haha, wow, sad, angry)', () => {
  const types = CAM_XUC_DIEN_DAN.map((r) => r.id);
  assert.deepEqual(types, ['like', 'love', 'haha', 'wow', 'sad', 'angry']);
  for (const r of CAM_XUC_DIEN_DAN) {
    assert.ok(r.label && r.icon);
    const svgPath = join(GOC, 'public', r.icon.replace(/^\//, ''));
    assert.ok(existsSync(svgPath), `thiếu SVG cảm xúc: ${r.icon}`);
  }
});

test('bộ asset diễn đàn lofi xuất đúng định dạng (SVG, WebP cảnh, Sprite + JSON, ASSETS.md)', () => {
  const batBuoc = [
    'ASSETS.md',
    'svg/cat-discuss.svg',
    'svg/cat-question.svg',
    'svg/cat-share.svg',
    'svg/cat-help.svg',
    'svg/react-like.svg',
    'svg/react-love.svg',
    'svg/react-haha.svg',
    'svg/react-wow.svg',
    'svg/react-sad.svg',
    'svg/react-angry.svg',
    'svg/phone-shell-lofi.svg',
    'svg/thread-connector.svg',
    'svg/compose-quill.svg',
    'svg/empty-forum.svg',
    'scenes/forum-lounge-1600.webp',
    'scenes/phone-forum-bg.webp',
    'scenes/banner-discuss.webp',
    'scenes/banner-question.webp',
    'scenes/banner-share.webp',
    'scenes/banner-help.webp',
    'sprites/reactions-sprite.webp',
    'sprites/reactions-sprite.json',
    'sprites/forum-badges-sprite.webp',
    'sprites/forum-badges-sprite.json',
  ];
  for (const rel of batBuoc) {
    const p = join(THU_MUC_ASSET, rel);
    assert.ok(existsSync(p), `thiếu tệp asset diễn đàn: ${rel}`);
    assert.ok(statSync(p).size > 80, `tệp asset rỗng: ${rel}`);
  }
});

test('renderForumMarkup dựng danh sách lọc 4 chuyên mục, chi tiết bài, bình luận lồng và 6 cảm xúc', () => {
  const htmlList = renderForumMarkup(
    {
      posts: structuredClone(BAI_MAU_DIEN_DAN),
      chat: structuredClone(CHAT_MAU_DIEN_DAN),
      category: 'all',
      search: '',
      sort: 'newest',
      postId: null,
      composing: false,
      chatOpen: true,
      replyToId: null,
    },
    'Học viên USTH',
  );

  // Đủ nút lọc Tất cả + 4 chuyên mục
  for (const cat of ['all', 'discuss', 'question', 'share', 'help']) {
    assert.match(htmlList, new RegExp(`data-fcat="${cat}"`));
  }
  // Đủ 6 nút cảm xúc trên thẻ bài
  for (const emo of ['like', 'love', 'haha', 'wow', 'sad', 'angry']) {
    assert.match(htmlList, new RegExp(`data-react-type="${emo}"`));
  }

  // Mở chi tiết bài 101 có bình luận lồng 2 cấp (501 -> 502, 503)
  const htmlDetail = renderForumMarkup(
    {
      posts: structuredClone(BAI_MAU_DIEN_DAN),
      chat: structuredClone(CHAT_MAU_DIEN_DAN),
      category: 'all',
      search: '',
      sort: 'newest',
      postId: 101,
      composing: false,
      chatOpen: false,
      replyToId: 501,
    },
    'Học viên USTH',
  );

  assert.match(htmlDetail, /class="lf-post-detail"/);
  assert.match(htmlDetail, /class="lf-replies-wrap"/);
  assert.match(htmlDetail, /class="lf-thread-line"/);
  assert.match(htmlDetail, /class="lf-reply-form"/);
});

test('batTatCamXuc bật và tắt đúng số đếm 6 loại cảm xúc; tongBinhLuan tính cả phản hồi lồng', () => {
  const mau = structuredClone(BAI_MAU_DIEN_DAN[0]);
  // Bài 101 có 2 bình luận gốc (501 có 2 replies, 504 có 0 replies) => tổng 4 bình luận
  assert.equal(tongBinhLuan(mau), 4);

  // Mặc định my_reaction của bài 101 là 'love', đổi sang 'wow' thì tổng giữ nguyên, tắt 'wow' thì giảm 1
  const truoc = tongCamXuc(mau.reactions);
  batTatCamXuc(mau, 'wow');
  assert.equal(mau.my_reaction, 'wow');
  assert.equal(tongCamXuc(mau.reactions), truoc);

  batTatCamXuc(mau, 'wow');
  assert.equal(mau.my_reaction, null);
  assert.equal(tongCamXuc(mau.reactions), truoc - 1);
});

test('chống XSS: escForumHtml khóa thẻ kịch bản trong tên tác giả, tiêu đề và bình luận lồng', () => {
  const xss = '<img src=x onerror=alert(1)><script>evil()</script>';
  assert.ok(!escForumHtml(xss).includes('<script>'));
  assert.ok(!escForumHtml(xss).includes('<img'));

  const baiXss = [
    {
      ...structuredClone(BAI_MAU_DIEN_DAN[0]),
      id: 999,
      author: { name: xss, role: xss, avatar: 'X' },
      title: xss,
      content: xss,
      comments: [
        {
          id: 901,
          author: { name: xss, role: xss, avatar: 'X' },
          createdAt: 'vừa xong',
          content: xss,
          reactions: { like: 1, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
          my_reaction: null,
          replies: [],
        },
      ],
    },
  ];
  const html = renderForumMarkup(
    {
      posts: baiXss,
      chat: [],
      category: 'all',
      search: '',
      sort: 'newest',
      postId: 999,
    },
    xss,
  );
  assert.ok(!html.includes('<script>evil()</script>'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});

test('lối vào Diễn đàn có mặt ở cả Thanh bên phải (shell.js) và Điện thoại trên bàn (engine.js), khởi đầu màn dọc và hỗ trợ xoay ngang', () => {
  const shell = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'shell.js'), 'utf8');
  const engine = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'engine.js'), 'utf8');
  assert.match(shell, /data-go="phone"\s+data-tab="forum"/);
  assert.match(shell, /<b>Diễn đàn<\/b>/);
  assert.match(engine, /G\.route==='phone'\?\{tab:'forum'\}/);
  // Khởi đầu ở màn hình dọc nhỏ (wide: false) và có hàm xoay điện thoại 3D
  assert.match(engine, /wide:\s*false/);
  assert.match(engine, /xoayDienThoai/);
  // Giữ nguyên cấu trúc Hồ sơ (#pvMe) và Xếp hạng (#pvRank) gốc
  assert.match(engine, /<div class="pv" id="pvMe"[^>]*><div class="prof">/);
  assert.match(engine, /<div class="pv" id="pvRank"[^>]*>/);

  const htmlPortrait = renderForumMarkup(
    {
      posts: structuredClone(BAI_MAU_DIEN_DAN),
      chat: structuredClone(CHAT_MAU_DIEN_DAN),
      category: 'all',
      search: '',
      sort: 'newest',
      postId: null,
      wide: false,
    },
    'Học viên USTH',
  );
  assert.match(htmlPortrait, /data-rotate-phone/);
  assert.match(htmlPortrait, /Xoay ngang mở rộng/);

  const htmlLandscape = renderForumMarkup(
    {
      posts: structuredClone(BAI_MAU_DIEN_DAN),
      chat: structuredClone(CHAT_MAU_DIEN_DAN),
      category: 'all',
      search: '',
      sort: 'newest',
      postId: null,
      wide: true,
    },
    'Học viên USTH',
  );
  assert.match(htmlLandscape, /Xoay dọc thu gọn/);
});
