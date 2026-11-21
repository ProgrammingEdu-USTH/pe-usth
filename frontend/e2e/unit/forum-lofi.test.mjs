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
  gopNoiDungVaCode,
  guiBinhLuan,
  guiCamXuc,
  guiSuaBai,
  guiSuaBinhLuan,
  guiTaoBai,
  guiXoaBai,
  guiXoaBinhLuan,
  mapApiPost,
  renderForumMarkup,
  rutLoiDienDan,
  tachNoiDungVaCode,
  taiChiTietBai,
  taiDanhSachBai,
  taoTrangThaiDienDan,
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

test('nối API thật BE7: không còn dữ liệu diễn đàn trong localStorage và không mở route /forum mồ côi', () => {
  const forumJs = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'forum-lofi.js'), 'utf8');
  const engineJs = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'engine.js'), 'utf8');
  const studyRoom = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'StudyRoom.tsx'), 'utf8');

  assert.doesNotMatch(forumJs, /localStorage|sessionStorage/);
  assert.doesNotMatch(engineJs, /docBaiDienDan|docChatDienDan/);
  assert.match(engineJs, /taoTrangThaiDienDan\(/);
  assert.match(studyRoom, /read:\s*apiFetchSessionOnly/);
  assert.match(studyRoom, /write:\s*apiFetch/);
  assert.equal(existsSync(join(GOC, 'src', 'app', 'forum', 'page.tsx')), false);
  assert.equal(existsSync(join(GOC, 'src', 'app', '(auth)', 'forum', 'page.tsx')), false);
});

function fakeJsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('người chưa đăng nhập đọc danh sách bằng apiFetchSessionOnly (api.read), gặp 401 không tự tạo khách', async () => {
  const st = taoTrangThaiDienDan();
  let readCalls = 0;
  let writeCalls = 0;
  const api = {
    read: async (path) => {
      readCalls += 1;
      assert.match(path, /^\/api\/posts\?/);
      return fakeJsonResponse(401, { message: 'Unauthorized' });
    },
    write: async () => {
      writeCalls += 1;
      return fakeJsonResponse(200, {});
    },
  };

  const res = await taiDanhSachBai(st, api);
  assert.equal(res.ok, false);
  assert.equal(res.status, 401);
  assert.equal(readCalls, 1);
  assert.equal(writeCalls, 0);
  assert.equal(st.authRequired, true);
  assert.equal(st.posts.length, 0);

  const html = renderForumMarkup(st, 'Khách');
  assert.match(html, /data-guest-load="1"/);
  assert.match(html, /href="\/login"/);
});

test('đăng bài gửi đúng CreatePostDto {category, title, content} bằng apiFetch và trình duyệt khác đọc lại được đầy đủ', async () => {
  const st1 = taoTrangThaiDienDan({
    composing: true,
    composeDraft: {
      category: 'help',
      title: 'Lỗi ZeroDivisionError',
      content: 'Mình bị lỗi chia 0 ở vòng lặp.',
      code: 'print(10 / 0)',
    },
  });
  let postedBody = null;
  let postWriteCalls = 0;
  const serverRow = {
    id: 77,
    userId: 12,
    category: 'help',
    title: 'Lỗi ZeroDivisionError',
    content: gopNoiDungVaCode('Mình bị lỗi chia 0 ở vòng lặp.', 'print(10 / 0)'),
    likeCount: 0,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  };

  const apiBrowser1 = {
    write: async (path, opts) => {
      postWriteCalls += 1;
      assert.equal(path, '/api/posts');
      assert.equal(opts.method, 'POST');
      postedBody = JSON.parse(opts.body);
      return fakeJsonResponse(200, { ok: true, post: serverRow });
    },
    read: async (path) => {
      if (path === '/api/posts/77') {
        return fakeJsonResponse(200, {
          ok: true,
          post: {
            ...serverRow,
            author: { id: 12, name: 'Minh An', avatar: null },
            reactions: {},
            my_reaction: null,
            comment_count: 0,
          },
        });
      }
      if (path.startsWith('/api/posts/77/comments')) {
        return fakeJsonResponse(200, { ok: true, total: 0, page: 1, replies_truncated: false, comments: [] });
      }
      return fakeJsonResponse(200, {
        ok: true,
        total: 1,
        page: 1,
        page_size: 20,
        posts: [
          {
            ...serverRow,
            author: { id: 12, name: 'Minh An', avatar: null },
            reactions: {},
            my_reaction: null,
            comment_count: 0,
          },
        ],
      });
    },
  };

  const createRes = await guiTaoBai(st1, apiBrowser1, st1.composeDraft);
  assert.equal(createRes.ok, true);
  assert.equal(postWriteCalls, 1);
  // BE ValidationPipe bật forbidNonWhitelisted nên tuyệt đối không gửi field ngoài DTO
  assert.deepEqual(Object.keys(postedBody).sort(), ['category', 'content', 'title']);
  assert.equal(tachNoiDungVaCode(postedBody.content).code, 'print(10 / 0)');

  // Trình duyệt 2 tải danh sách từ API thật -> thấy đúng bài vừa tạo
  const st2 = taoTrangThaiDienDan();
  const listRes = await taiDanhSachBai(st2, {
    read: async () =>
      fakeJsonResponse(200, {
        ok: true,
        total: 1,
        page: 1,
        page_size: 20,
        posts: [
          {
            ...serverRow,
            author: { id: 12, name: 'Minh An', avatar: null },
            reactions: { wow: 2 },
            my_reaction: null,
            comment_count: 3,
          },
        ],
      }),
    write: async () => fakeJsonResponse(500, {}),
  });
  assert.equal(listRes.ok, true);
  assert.equal(st2.posts.length, 1);
  assert.equal(st2.posts[0].author.name, 'Minh An');
  assert.equal(st2.posts[0].code, 'print(10 / 0)');
  assert.equal(tongBinhLuan(st2.posts[0]), 3);

  const html2 = renderForumMarkup(st2, 'Bạn B', { id: 99, role: 'student' });
  assert.match(html2, /Lỗi ZeroDivisionError/);
  assert.match(html2, /print\(10 \/ 0\)/);
  assert.match(html2, /3 bình luận/);
  assert.doesNotMatch(html2, /data-edit-post=/);
});

test('gặp 429 khi đăng bài / bình luận thì hiện thông báo thân thiện và giữ nguyên nháp', async () => {
  const st = taoTrangThaiDienDan({
    posts: [mapApiPost({ id: 55, category: 'discuss', title: 'Test', content: 'Hi', reactions: {}, comment_count: 0 })],
    postId: 55,
    composing: true,
    composeDraft: { category: 'discuss', title: 'Chủ đề giữ lại', content: 'Nội dung còn nguyên', code: '' },
  });

  const post429 = await guiTaoBai(
    st,
    {
      write: async () =>
        fakeJsonResponse(429, { message: 'Bạn đăng bài hơi nhanh, đợi vài phút rồi thử lại' }),
    },
    st.composeDraft,
  );
  assert.equal(post429.ok, false);
  assert.equal(post429.status, 429);
  assert.equal(post429.message, 'Bạn đăng bài hơi nhanh, đợi vài phút rồi thử lại');
  assert.equal(st.composeDraft.title, 'Chủ đề giữ lại');

  const cmt429 = await guiBinhLuan(
    st,
    {
      write: async () =>
        fakeJsonResponse(429, { message: 'ThrottlerException: Too Many Requests' }),
    },
    55,
    'Bình luận bị giới hạn',
  );
  assert.equal(cmt429.ok, false);
  assert.equal(cmt429.status, 429);
  assert.doesNotMatch(cmt429.message, /ThrottlerException/i);
  assert.match(rutLoiDienDan(429, { message: 'Too Many Requests' }), /nhanh|đợi/i);
});

test('thả cảm xúc, bình luận lồng, sửa/xoá qua API thật và rollback nếu server lỗi', async () => {
  const st = taoTrangThaiDienDan({
    posts: [
      mapApiPost({
        id: 88,
        category: 'share',
        title: 'Chia sẻ',
        content: 'Hay quá',
        author: { id: 10, name: 'Chủ bài', avatar: 'C' },
        reactions: { like: 2 },
        my_reaction: null,
        comment_count: 1,
      }),
    ],
    postId: 88,
  });

  // 1. Thả cảm xúc bị lỗi 500 -> rollback nguyên trạng thái cũ
  const failReact = await guiCamXuc(
    st,
    { write: async () => fakeJsonResponse(500, { message: 'DB error' }) },
    'post',
    88,
    'love',
  );
  assert.equal(failReact.ok, false);
  assert.equal(st.posts[0].my_reaction, null);
  assert.equal(st.posts[0].reactions.love, 0);
  assert.equal(st.posts[0].reactions.like, 2);

  // 2. Thả cảm xúc thành công -> nhận đúng payload { reaction } và đồng bộ từ server
  const okReact = await guiCamXuc(
    st,
    {
      write: async (path, opts) => {
        assert.equal(path, '/api/posts/88/react');
        assert.deepEqual(JSON.parse(opts.body), { reaction: 'haha' });
        return fakeJsonResponse(200, { ok: true, my_reaction: 'haha', like_count: 3, reactions: { like: 2, haha: 1 } });
      },
    },
    'post',
    88,
    'haha',
  );
  assert.equal(okReact.ok, true);
  assert.equal(st.posts[0].my_reaction, 'haha');
  assert.equal(st.posts[0].reactions.haha, 1);

  // 3. Tải chi tiết + bình luận lồng 2 cấp, kiểm tra quyền tác giả & XSS ở thông báo lỗi
  const detailRes = await taiChiTietBai(
    st,
    {
      read: async (path) => {
        if (path === '/api/posts/88') {
          return fakeJsonResponse(200, {
            ok: true,
            post: {
              id: 88,
              category: 'share',
              title: 'Chia sẻ',
              content: 'Hay quá',
              author: { id: 10, name: 'Chủ bài', avatar: 'C' },
              reactions: { like: 2, haha: 1 },
              my_reaction: 'haha',
              comment_count: 2,
            },
          });
        }
        return fakeJsonResponse(200, {
          ok: true,
          total: 1,
          page: 1,
          replies_truncated: false,
          comments: [
            {
              id: 301,
              content: 'Bình luận gốc',
              createdAt: '2026-11-21T10:00:00Z',
              parentCommentId: null,
              author: { id: 10, name: 'Chủ bài', avatar: null },
              reactions: {},
              my_reaction: null,
              replies: [
                {
                  id: 302,
                  content: 'Phản hồi lồng',
                  createdAt: '2026-11-21T10:01:00Z',
                  parentCommentId: 301,
                  author: { id: 22, name: 'Bạn khác', avatar: null },
                  reactions: { like: 1 },
                  my_reaction: null,
                },
              ],
            },
          ],
        });
      },
    },
    88,
  );
  assert.equal(detailRes.ok, true);
  assert.equal(st.posts[0].comments[0].replies.length, 1);

  st.actionError = '<script>xss()</script>';
  const detailHtml = renderForumMarkup(st, 'Chủ bài', { id: 10, role: 'student' });
  assert.match(detailHtml, /data-edit-post="88"/);
  assert.match(detailHtml, /data-edit-cmt="301"/);
  assert.doesNotMatch(detailHtml, /data-edit-cmt="302"/);
  assert.ok(!detailHtml.includes('<script>xss()</script>'));

  // 4. Sửa bài, sửa bình luận, xoá bình luận, xoá bài
  const editPostOk = await guiSuaBai(
    st,
    {
      write: async (path, opts) => {
        assert.equal(path, '/api/posts/88');
        assert.equal(opts.method, 'PUT');
        return fakeJsonResponse(200, { ok: true, post: { id: 88, content: 'Đã sửa' } });
      },
      read: async (path) => {
        if (path === '/api/posts/88') {
          return fakeJsonResponse(200, {
            ok: true,
            post: { id: 88, category: 'share', title: 'Sửa tiêu đề', content: 'Đã sửa', author: { id: 10, name: 'Chủ bài' }, reactions: {}, my_reaction: null, comment_count: 2 },
          });
        }
        return fakeJsonResponse(200, { ok: true, total: 1, page: 1, replies_truncated: false, comments: [] });
      },
    },
    88,
    { category: 'share', title: 'Sửa tiêu đề', content: 'Đã sửa', code: '' },
  );
  assert.equal(editPostOk.ok, true);
  assert.equal(st.posts[0].content, 'Đã sửa');

  const editCmtOk = await guiSuaBinhLuan(
    st,
    {
      write: async (path, opts) => {
        assert.equal(path, '/api/comments/301');
        assert.equal(opts.method, 'PUT');
        return fakeJsonResponse(200, { ok: true, comment: { id: 301, content: 'Sửa cmt' } });
      },
      read: async () => fakeJsonResponse(200, { ok: true, total: 0, page: 1, replies_truncated: false, comments: [] }),
    },
    88,
    301,
    'Sửa cmt',
  );
  assert.equal(editCmtOk.ok, true);

  const delCmtOk = await guiXoaBinhLuan(
    st,
    {
      write: async (path, opts) => {
        assert.equal(path, '/api/comments/301');
        assert.equal(opts.method, 'DELETE');
        return fakeJsonResponse(200, { ok: true });
      },
      read: async () => fakeJsonResponse(200, { ok: true, total: 0, page: 1, replies_truncated: false, comments: [] }),
    },
    88,
    301,
  );
  assert.equal(delCmtOk.ok, true);

  const delPostOk = await guiXoaBai(
    st,
    {
      write: async (path, opts) => {
        assert.equal(path, '/api/posts/88');
        assert.equal(opts.method, 'DELETE');
        return fakeJsonResponse(200, { ok: true });
      },
    },
    88,
  );
  assert.equal(delPostOk.ok, true);
  assert.equal(st.posts.length, 0);
  assert.equal(st.postId, null);
});
