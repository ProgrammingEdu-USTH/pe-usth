/*
 * Diễn đàn Lofi Dark-Purple tích hợp trong màn Điện thoại (#phone) và thanh bên
 * phải của Góc học:
 *  - Danh sách bài viết có lọc 4 chuyên mục (discuss, question, share, help)
 *  - Tạo chủ đề thảo luận mới (Create Thread) & Phòng chat nhanh (Live Chat)
 *  - Chi tiết bài viết kèm khối code Python
 *  - Bình luận lồng 2 cấp (bình luận gốc + replies nối bằng thread-connector.svg)
 *  - 6 loại cảm xúc tương tác (like, love, haha, wow, sad, angry) trên cả bài
 *    viết lẫn từng bình luận.
 */

export const CHUYEN_MUC_DIEN_DAN = [
  {
    id: 'discuss',
    name: 'Thảo luận',
    short: 'Thảo luận',
    desc: 'Góc nhìn, kinh nghiệm tự học Python & phân tích dữ liệu',
    badge: '/forum-lofi/svg/cat-discuss.svg',
    banner: '/forum-lofi/scenes/banner-discuss.webp',
    color: '#f6b86b',
  },
  {
    id: 'question',
    name: 'Hỏi đáp',
    short: 'Hỏi đáp',
    desc: 'Giải đáp thắc mắc lý thuyết, cú pháp và bài tập trong khóa',
    badge: '/forum-lofi/svg/cat-question.svg',
    banner: '/forum-lofi/scenes/banner-question.webp',
    color: '#a98cf5',
  },
  {
    id: 'share',
    name: 'Chia sẻ',
    short: 'Chia sẻ',
    desc: 'Mẹo viết code gọn, ghi chú sổ tay và mini-project cá nhân',
    badge: '/forum-lofi/svg/cat-share.svg',
    banner: '/forum-lofi/scenes/banner-share.webp',
    color: '#e58cc8',
  },
  {
    id: 'help',
    name: 'Gỡ lỗi',
    short: 'Gỡ lỗi',
    desc: 'Cứu trợ bug Python, NumPy, pandas kèm traceback cụ thể',
    badge: '/forum-lofi/svg/cat-help.svg',
    banner: '/forum-lofi/scenes/banner-help.webp',
    color: '#5cd6a9',
  },
];

export const CAM_XUC_DIEN_DAN = [
  { id: 'like', label: 'Thích', icon: '/forum-lofi/svg/react-like.svg', spriteX: 0 },
  { id: 'love', label: 'Yêu thích', icon: '/forum-lofi/svg/react-love.svg', spriteX: -64 },
  { id: 'haha', label: 'Haha', icon: '/forum-lofi/svg/react-haha.svg', spriteX: -128 },
  { id: 'wow', label: 'Wow', icon: '/forum-lofi/svg/react-wow.svg', spriteX: -192 },
  { id: 'sad', label: 'Buồn', icon: '/forum-lofi/svg/react-sad.svg', spriteX: -256 },
  { id: 'angry', label: 'Phẫn nộ', icon: '/forum-lofi/svg/react-angry.svg', spriteX: -320 },
];

export function escForumHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LS_FORUM_POSTS = 'pe_goc_hoc_forum_posts_v1';
const LS_FORUM_CHAT = 'pe_goc_hoc_forum_chat_v1';

export const BAI_MAU_DIEN_DAN = [
  {
    id: 101,
    category: 'question',
    pinned: true,
    solved: true,
    title: 'Vì sao phép chia 7 // 2 ra 3 nhưng -7 // 2 lại ra -4 trong Bài 1?',
    content:
      'Mình vừa đọc xong màn Lý thuyết (Sách mở) của Bài 1. Khi thử trong REPL thì thấy `7 // 2 == 3`, nhưng thử số âm `-7 // 2` thì kết quả lại là `-4` chứ không phải `-3`. Có bạn nào giải thích giúp cơ chế làm tròn của `//` không?',
    code: 'print(7 // 2)   # -> 3\nprint(-7 // 2)  # -> -4 (sao không phải -3?)',
    author: { name: 'Minh Anh · K14', role: 'Học viên M1', avatar: 'M' },
    createdAt: '15 phút trước',
    my_reaction: 'love',
    reactions: { like: 8, love: 6, haha: 1, wow: 4, sad: 0, angry: 0 },
    comments: [
      {
        id: 501,
        author: { name: 'Hải Đăng · Mentor', role: 'Trợ giảng', avatar: 'H' },
        createdAt: '12 phút trước',
        content:
          'Câu hỏi rất hay! Toán tử `//` trong Python là **floor division** (làm tròn XUỐNG về phía âm vô cùng), không phải cắt phần thập phân (truncate). Vì -3.5 nằm giữa -4 và -3 nên làm tròn xuống sẽ về `-4`.',
        my_reaction: 'like',
        reactions: { like: 9, love: 4, haha: 0, wow: 2, sad: 0, angry: 0 },
        replies: [
          {
            id: 502,
            parentCommentId: 501,
            author: { name: 'Minh Anh · K14', role: 'Tác giả', avatar: 'M' },
            createdAt: '9 phút trước',
            content:
              'À rõ ràng quá! Vậy nếu muốn cắt phần thập phân về phía số 0 thì dùng `int(-7 / 2)` sẽ ra `-3` đúng không ạ?',
            my_reaction: null,
            reactions: { like: 4, love: 2, haha: 0, wow: 1, sad: 0, angry: 0 },
          },
          {
            id: 503,
            parentCommentId: 501,
            author: { name: 'Hải Đăng · Mentor', role: 'Trợ giảng', avatar: 'H' },
            createdAt: '6 phút trước',
            content:
              'Chuẩn luôn @Minh Anh! `int(-3.5)` hoặc `math.trunc(-3.5)` đều cắt về phía 0 nên cho kết quả `-3`.',
            my_reaction: 'love',
            reactions: { like: 5, love: 3, haha: 0, wow: 0, sad: 0, angry: 0 },
          },
        ],
      },
      {
        id: 504,
        author: { name: 'Tuấn Kiệt', role: 'Học viên M2', avatar: 'T' },
        createdAt: '4 phút trước',
        content:
          'Nhờ câu này mà mình để ý thêm cặp `(a // b) * b + (a % b) == a` luôn đúng với mọi số âm trong Python.',
        my_reaction: null,
        reactions: { like: 3, love: 1, haha: 0, wow: 2, sad: 0, angry: 0 },
        replies: [],
      },
    ],
  },
  {
    id: 102,
    category: 'share',
    pinned: true,
    solved: false,
    title: 'Chia sẻ bộ ghi chú Sổ tay M1 + cách bật nhạc lofi học đêm cực tập trung',
    content:
      'Mình tổng hợp lại các quy tắc đặt tên biến, ép kiểu `int/float/str` và 5 bẫy hay gặp ở Học phần 1 thành một đoạn cheat-sheet ngắn. Mọi người lưu lại vào cuốn sổ trên bàn để ôn trước khi làm đề nhé!',
    code: '# Mẹo kiểm tra nhanh kiểu dữ liệu và giá trị rỗng\nmau_thu = [0, "", [], None, 42]\nloc_hop_le = [x for x in mau_thu if x is not None]\nprint(loc_hop_le)  # [0, "", [], 42]',
    author: { name: 'Lan Phương', role: 'Học viên M3', avatar: 'L' },
    createdAt: '42 phút trước',
    my_reaction: null,
    reactions: { like: 11, love: 9, haha: 2, wow: 5, sad: 0, angry: 0 },
    comments: [
      {
        id: 505,
        author: { name: 'Quốc Bảo', role: 'Học viên M1', avatar: 'Q' },
        createdAt: '28 phút trước',
        content:
          'Ví dụ phân biệt `if x:` với `if x is not None:` cứu mình đúng lúc đang làm sạch cột điểm số có số 0!',
        my_reaction: 'like',
        reactions: { like: 6, love: 2, haha: 0, wow: 0, sad: 0, angry: 0 },
        replies: [
          {
            id: 506,
            parentCommentId: 505,
            author: { name: 'Lan Phương', role: 'Tác giả', avatar: 'L' },
            createdAt: '20 phút trước',
            content:
              'Đúng rồi, điểm 0 là dữ liệu thật chứ không phải ô trống, dùng `if x:` là bay mất điểm 0 ngay 😄',
            my_reaction: null,
            reactions: { like: 4, love: 1, haha: 3, wow: 0, sad: 0, angry: 0 },
          },
        ],
      },
    ],
  },
  {
    id: 103,
    category: 'help',
    pinned: false,
    solved: true,
    title: 'Gỡ lỗi: TypeError khi nối chuỗi thông báo với kết quả phép tính',
    content:
      'Mình chạy đoạn mã in tổng số phút học trong tuần nhưng gặp lỗi `TypeError: can only concatenate str (not "int") to str`. Cách sửa nào gọn và chuẩn nhất trong Python 3?',
    code: 'tong_phut = 25 * 5 + 40\n# Dòng dưới báo TypeError:\n# print("Tổng thời gian: " + tong_phut + " phút")\nprint(f"Tổng thời gian: {tong_phut} phút")',
    author: { name: 'Hoàng Nam', role: 'Học viên M1', avatar: 'N' },
    createdAt: '1 giờ trước',
    my_reaction: null,
    reactions: { like: 5, love: 1, haha: 2, wow: 1, sad: 2, angry: 1 },
    comments: [
      {
        id: 507,
        author: { name: 'Thảo Vy', role: 'Học viên M2', avatar: 'V' },
        createdAt: '50 phút trước',
        content:
          'Dùng f-string `f"Tổng thời gian: {tong_phut} phút"` như dòng cuối bạn viết là chuẩn và dễ đọc nhất nhé!',
        my_reaction: null,
        reactions: { like: 5, love: 2, haha: 0, wow: 0, sad: 0, angry: 0 },
        replies: [],
      },
    ],
  },
  {
    id: 104,
    category: 'discuss',
    pinned: false,
    solved: false,
    title: 'Mọi người thường học vào khung giờ nào trong Góc học Lofi?',
    content:
      'Mình thích kéo thanh giờ trong ngày sang 22:00 Đêm, bật mưa ngoài cửa sổ rồi ngồi làm 2 bài Python mỗi tối. Không biết hội cú đêm USTH hay online giờ nào để cùng thảo luận bài tập?',
    code: '',
    author: { name: 'Đức Thịnh', role: 'Học viên M2', avatar: 'Đ' },
    createdAt: '2 giờ trước',
    my_reaction: 'haha',
    reactions: { like: 14, love: 10, haha: 7, wow: 3, sad: 1, angry: 0 },
    comments: [
      {
        id: 508,
        author: { name: 'Ngọc Ánh', role: 'Học viên M1', avatar: 'A' },
        createdAt: '1 giờ trước',
        content:
          'Team 21h30 – 23h00 điểm danh! Bật đèn bàn ấm + tiếng mưa rơi làm bài tập đỡ căng thẳng hẳn.',
        my_reaction: 'love',
        reactions: { like: 6, love: 5, haha: 2, wow: 0, sad: 0, angry: 0 },
        replies: [],
      },
    ],
  },
];

export const CHAT_MAU_DIEN_DAN = [
  { id: 1, user: 'Minh Anh', avatar: 'M', time: '21:15', text: 'Có ai đang làm Bài 4 học phần M1 không nhỉ?' },
  { id: 2, user: 'Tuấn Kiệt', avatar: 'T', time: '21:16', text: 'Mình vừa qua Bài 4 xong! Nhớ chú ý quy tắc đặt tên biến không bắt đầu bằng số nhé.' },
  { id: 3, user: 'Lan Phương', avatar: 'L', time: '21:18', text: 'Mình vừa đăng bản tóm tắt M1 ở mục Chia sẻ, mọi người ghé xem nha ✨' },
];

function cloneMau() {
  return JSON.parse(JSON.stringify(BAI_MAU_DIEN_DAN));
}

export function docBaiDienDan() {
  try {
    const raw = localStorage.getItem(LS_FORUM_POSTS);
    if (!raw) return cloneMau();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : cloneMau();
  } catch {
    return cloneMau();
  }
}

export function luuBaiDienDan(posts) {
  try {
    localStorage.setItem(LS_FORUM_POSTS, JSON.stringify(posts));
  } catch {
    /* chế độ riêng tư: giữ trong bộ nhớ phiên */
  }
}

export function docChatDienDan() {
  try {
    const raw = localStorage.getItem(LS_FORUM_CHAT);
    if (!raw) return [...CHAT_MAU_DIEN_DAN];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...CHAT_MAU_DIEN_DAN];
  } catch {
    return [...CHAT_MAU_DIEN_DAN];
  }
}

export function luuChatDienDan(msgs) {
  try {
    localStorage.setItem(LS_FORUM_CHAT, JSON.stringify(msgs));
  } catch {
    /* ignore */
  }
}

export function tongCamXuc(reactions) {
  if (!reactions) return 0;
  return Object.values(reactions).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function tongBinhLuan(post) {
  if (!post || !Array.isArray(post.comments)) return 0;
  return post.comments.reduce(
    (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
    0,
  );
}

export function batTatCamXuc(target, type) {
  if (!target.reactions) {
    target.reactions = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
  }
  const prev = target.my_reaction;
  if (prev === type) {
    target.reactions[type] = Math.max(0, (target.reactions[type] || 1) - 1);
    target.my_reaction = null;
  } else {
    if (prev && target.reactions[prev] > 0) {
      target.reactions[prev] -= 1;
    }
    target.reactions[type] = (target.reactions[type] || 0) + 1;
    target.my_reaction = type;
  }
  return target;
}

function renderReactionBar(targetKind, targetId, target) {
  const rx = target.reactions || {};
  const my = target.my_reaction;
  const pills = CAM_XUC_DIEN_DAN.map((emo) => {
    const count = Number(rx[emo.id] || 0);
    const active = my === emo.id;
    return `<button type="button" class="lf-emo-btn${active ? ' on' : ''}${count > 0 ? ' has' : ''}" data-react-kind="${targetKind}" data-react-id="${targetId}" data-react-type="${emo.id}" title="${emo.label} (${count})">
      <img src="${emo.icon}" alt="${emo.label}" width="18" height="18">
      <span class="lf-emo-lbl">${emo.label}</span>
      <b class="lf-emo-cnt">${count}</b>
    </button>`;
  }).join('');

  return `<div class="lf-react-bar" role="group" aria-label="6 loại cảm xúc">${pills}</div>`;
}

export function renderForumMarkup(st, userName) {
  const posts = st.posts || [];
  const catFilter = st.category || 'all';
  const sortBy = st.sort || 'newest';
  const query = (st.search || '').trim().toLowerCase();

  const counts = { all: posts.length };
  CHUYEN_MUC_DIEN_DAN.forEach((c) => {
    counts[c.id] = posts.filter((p) => p.category === c.id).length;
  });

  const filtered = posts
    .filter((p) => (catFilter === 'all' ? true : p.category === catFilter))
    .filter((p) => {
      if (!query) return true;
      return (
        String(p.title || '').toLowerCase().includes(query) ||
        String(p.content || '').toLowerCase().includes(query) ||
        String(p.author?.name || '').toLowerCase().includes(query)
      );
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === 'likes') return tongCamXuc(b.reactions) - tongCamXuc(a.reactions);
      return Number(b.id) - Number(a.id);
    });

  const activeCatMeta =
    CHUYEN_MUC_DIEN_DAN.find((c) => c.id === catFilter) || CHUYEN_MUC_DIEN_DAN[0];

  const orientBarHtml = `<div class="lf-orient-bar">
    <span class="lf-orient-status">${
      st.wide
        ? '📲 Chế độ xoay ngang · Bàn thảo luận rộng'
        : '📱 Màn hình dọc · Xoay ngang để xem rộng'
    }</span>
    <button type="button" class="lf-rotate-btn" data-rotate-phone="1" title="${
      st.wide ? 'Xoay dọc điện thoại về màn hình nhỏ' : 'Xoay ngang điện thoại để mở rộng màn hình thảo luận'
    }">
      <svg class="lf-rot-svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M21 12a9 9 0 0 0-9-9M3 12a9 9 0 0 0 9 9"/><polyline points="18 3 21 3 21 6"/></svg>
      <span>${st.wide ? 'Xoay dọc thu gọn' : 'Xoay ngang mở rộng'}</span>
    </button>
  </div>`;

  // Thanh lọc 4 chuyên mục
  const catTabs = [
    `<button type="button" class="lf-cat-pill${catFilter === 'all' ? ' active' : ''}" data-fcat="all">
      <span>✨ Tất cả</span><b>${counts.all}</b>
    </button>`,
    ...CHUYEN_MUC_DIEN_DAN.map(
      (c) => `<button type="button" class="lf-cat-pill${catFilter === c.id ? ' active' : ''}" data-fcat="${c.id}">
        <img src="${c.badge}" alt="" width="20" height="20">
        <span>${escForumHtml(c.short)}</span>
        <b>${counts[c.id] || 0}</b>
      </button>`,
    ),
  ].join('');

  // Nếu đang xem CHI TIẾT BÀI VIẾT
  const activePost = st.postId ? posts.find((p) => Number(p.id) === Number(st.postId)) : null;
  if (activePost) {
    const cat =
      CHUYEN_MUC_DIEN_DAN.find((c) => c.id === activePost.category) || CHUYEN_MUC_DIEN_DAN[0];
    const commentsHtml = (activePost.comments || [])
      .map((c) => {
        const repliesHtml = (c.replies || [])
          .map(
            (rp) => `<div class="lf-reply-item">
              <img class="lf-thread-line" src="/forum-lofi/svg/thread-connector.svg" alt="" aria-hidden="true">
              <div class="lf-cmt-card lf-cmt-nested">
                <div class="lf-cmt-head">
                  <span class="lf-ava sm">${escForumHtml(rp.author?.avatar || rp.author?.name?.[0] || 'U')}</span>
                  <b class="fpc-author">${escForumHtml(rp.author?.name || 'Học viên')}</b>
                  <span class="lf-role-tag">${escForumHtml(rp.author?.role || 'Phản hồi')}</span>
                  <small class="lf-time">${escForumHtml(rp.createdAt || 'Vừa xong')}</small>
                </div>
                <p class="lf-cmt-body">${escForumHtml(rp.content)}</p>
                ${renderReactionBar('comment', rp.id, rp)}
              </div>
            </div>`,
          )
          .join('');

        const isReplyingThis = Number(st.replyToId) === Number(c.id);
        return `<article class="lf-cmt-thread">
          <div class="lf-cmt-card">
            <div class="lf-cmt-head">
              <span class="lf-ava">${escForumHtml(c.author?.avatar || c.author?.name?.[0] || 'U')}</span>
              <div>
                <b class="fpc-author">${escForumHtml(c.author?.name || 'Học viên')}</b>
                <span class="lf-role-tag">${escForumHtml(c.author?.role || 'Thành viên')}</span>
              </div>
              <small class="lf-time">${escForumHtml(c.createdAt || 'Vừa xong')}</small>
            </div>
            <p class="lf-cmt-body">${escForumHtml(c.content)}</p>
            <div class="lf-cmt-foot">
              ${renderReactionBar('comment', c.id, c)}
              <button type="button" class="lf-reply-trig" data-reply-to="${c.id}" data-reply-name="${escForumHtml(c.author?.name || 'bạn học')}">
                ↩ Trả lời (${(c.replies || []).length})
              </button>
            </div>
            ${
              isReplyingThis
                ? `<form class="lf-reply-form" data-reply-form="${c.id}">
                    <input type="text" class="lf-input" name="replyContent" placeholder="Trả lời @${escForumHtml(c.author?.name || 'bạn học')}…" required maxlength="1000">
                    <button type="submit" class="lf-btn-amber">Gửi trả lời</button>
                    <button type="button" class="lf-btn-ghost" data-cancel-reply="1">Huỷ</button>
                  </form>`
                : ''
            }
          </div>
          ${repliesHtml ? `<div class="lf-replies-wrap">${repliesHtml}</div>` : ''}
        </article>`;
      })
      .join('');

    return `<div class="lf-forum-wrap">
      ${orientBarHtml}
      <div class="lf-detail-topbar">
        <button type="button" class="lf-btn-ghost" data-fback="1">← Danh sách 4 chuyên mục</button>
        <span class="lf-cat-chip"><img src="${cat.badge}" alt="" width="18" height="18">${escForumHtml(cat.name)}</span>
      </div>

      <article class="lf-post-detail">
        <img class="lf-post-banner" src="${cat.banner}" alt="">
        <div class="lf-post-head">
          <span class="lf-ava lg">${escForumHtml(activePost.author?.avatar || activePost.author?.name?.[0] || 'U')}</span>
          <div class="lf-post-meta">
            <div class="lf-author-row">
              <b class="fpc-author">${escForumHtml(activePost.author?.name || 'Học viên')}</b>
              <span class="lf-role-tag">${escForumHtml(activePost.author?.role || 'Thành viên')}</span>
              ${activePost.solved ? '<span class="lf-solved-tag">✓ Đã giải đáp</span>' : ''}
            </div>
            <small class="lf-time">${escForumHtml(activePost.createdAt || 'Vừa xong')} · Chuyên mục ${escForumHtml(cat.name)}</small>
          </div>
        </div>

        <h3 class="lf-detail-title">${escForumHtml(activePost.title)}</h3>
        <p class="lf-detail-content">${escForumHtml(activePost.content)}</p>
        ${
          activePost.code
            ? `<pre class="lf-code-block"><code>${escForumHtml(activePost.code)}</code></pre>`
            : ''
        }

        <div class="lf-detail-reactions">
          <span class="lf-react-caption">Thả cảm xúc (6 loại):</span>
          ${renderReactionBar('post', activePost.id, activePost)}
        </div>
      </article>

      <section class="lf-comments-sec" aria-label="Bình luận lồng">
        <div class="lf-sec-head">
          <h4>💬 Bình luận lồng (${tongBinhLuan(activePost)})</h4>
          <small>Hỗ trợ trả lời theo nhánh & thả 6 loại cảm xúc</small>
        </div>

        <form class="lf-comment-form" id="lfRootCommentForm" data-post-id="${activePost.id}">
          <input type="text" class="lf-input" id="lfRootCommentIn" placeholder="Viết bình luận của ${escForumHtml(userName)}…" required maxlength="2000">
          <button type="submit" class="lf-btn-amber">Gửi bình luận</button>
        </form>

        <div class="lf-cmt-list">
          ${commentsHtml || '<p class="lf-empty-note">Chưa có bình luận nào. Hãy mở lời đầu tiên!</p>'}
        </div>
      </section>
    </div>`;
  }

  // Màn DANH SÁCH CÓ LỌC 4 CHUYÊN MỤC + TẠO BÀI + CHAT NHANH
  const composerHtml = st.composing
    ? `<form class="lf-composer-card" id="lfCreatePostForm">
        <div class="lf-composer-head">
          <img src="/forum-lofi/svg/compose-quill.svg" alt="" width="28" height="28">
          <div>
            <b>Tạo chủ đề thảo luận mới</b>
            <small>Đăng bởi ${escForumHtml(userName)} · Chọn 1 trong 4 chuyên mục</small>
          </div>
        </div>
        <div class="lf-form-row">
          <select class="lf-select" name="category" aria-label="Chuyên mục">
            ${CHUYEN_MUC_DIEN_DAN.map(
              (c) =>
                `<option value="${c.id}" ${catFilter === c.id ? 'selected' : ''}>${escForumHtml(c.name)} — ${escForumHtml(c.desc)}</option>`,
            ).join('')}
          </select>
        </div>
        <input type="text" class="lf-input" name="title" placeholder="Tiêu đề câu hỏi hoặc chủ đề thảo luận…" required maxlength="300">
        <textarea class="lf-textarea" name="content" rows="3" placeholder="Nội dung chi tiết (hỗ trợ đính kèm đoạn mã Python bên dưới)…" required maxlength="5000"></textarea>
        <input type="text" class="lf-input mono" name="code" placeholder="Đoạn mã Python minh họa (tuỳ chọn, ví dụ: print(7 // 2))" maxlength="1500">
        <div class="lf-composer-actions">
          <button type="button" class="lf-btn-ghost" data-toggle-compose="0">Huỷ</button>
          <button type="submit" class="lf-btn-amber">Đăng chủ đề lên diễn đàn</button>
        </div>
      </form>`
    : '';

  const chatDrawerHtml = st.chatOpen
    ? `<section class="lf-chat-box" aria-label="Chat nhanh bàn học đêm">
        <div class="lf-chat-head">
          <span>🟢 Phòng chat bàn học đêm (${(st.chat || []).length} tin nhắn)</span>
          <button type="button" class="lf-btn-ghost sm" data-toggle-chat="0">Đóng chat</button>
        </div>
        <div class="lf-chat-messages" id="lfChatList">
          ${(st.chat || [])
            .map(
              (m) => `<div class="lf-chat-msg">
                <span class="lf-ava sm">${escForumHtml(m.avatar || m.user?.[0] || 'U')}</span>
                <div class="lf-chat-bubble">
                  <div class="lf-chat-meta"><b>${escForumHtml(m.user)}</b><small>${escForumHtml(m.time)}</small></div>
                  <p>${escForumHtml(m.text)}</p>
                </div>
              </div>`,
            )
            .join('')}
        </div>
        <form class="lf-chat-form" id="lfChatForm">
          <input type="text" class="lf-input" id="lfChatIn" placeholder="Nhắn nhanh với bạn cùng phòng học…" required maxlength="400">
          <button type="submit" class="lf-btn-amber">Gửi</button>
        </form>
      </section>`
    : '';

  const listHtml = filtered.length
    ? filtered
        .map((p) => {
          const cat =
            CHUYEN_MUC_DIEN_DAN.find((c) => c.id === p.category) || CHUYEN_MUC_DIEN_DAN[0];
          const nCmt = tongBinhLuan(p);
          return `<article class="lf-post-card" data-open-post="${p.id}">
            <div class="lf-card-top">
              <span class="lf-cat-chip" style="--cc:${cat.color}">
                <img src="${cat.badge}" alt="" width="16" height="16">
                ${escForumHtml(cat.short)}
              </span>
              ${p.pinned ? '<span class="lf-pin-chip">📌 Ghim</span>' : ''}
              ${p.solved ? '<span class="lf-solved-tag">✓ Đã giải đáp</span>' : ''}
              <small class="lf-time">${escForumHtml(p.createdAt || 'Vừa xong')}</small>
            </div>

            <h4 class="lf-card-title">${escForumHtml(p.title)}</h4>
            <p class="lf-card-excerpt">${escForumHtml(p.content)}</p>
            ${
              p.code
                ? `<pre class="lf-code-preview"><code>${escForumHtml(p.code)}</code></pre>`
                : ''
            }

            <div class="lf-card-foot">
              <div class="lf-author-mini">
                <span class="lf-ava sm">${escForumHtml(p.author?.avatar || p.author?.name?.[0] || 'U')}</span>
                <b class="fpc-author">${escForumHtml(p.author?.name || 'Học viên')}</b>
              </div>
              <button type="button" class="lf-cmt-pill" data-open-post="${p.id}">
                💬 ${nCmt} bình luận
              </button>
            </div>
            <div class="lf-card-reacts" data-stop-open="1">
              ${renderReactionBar('post', p.id, p)}
            </div>
          </article>`;
        })
        .join('')
    : `<div class="lf-empty-state">
        <img src="/forum-lofi/svg/empty-forum.svg" alt="" width="130" height="100">
        <b>Chưa có bài viết phù hợp</b>
        <p>Thử đổi chuyên mục hoặc bấm “＋ Tạo chủ đề” để mở cuộc trò chuyện mới.</p>
      </div>`;

  return `<div class="lf-forum-wrap">
    ${orientBarHtml}
    <!-- Banner chuyên mục đang chọn -->
    <div class="lf-hero-banner">
      <img class="lf-hero-img" src="${activeCatMeta.banner}" alt="">
      <div class="lf-hero-txt">
        <span class="lf-hero-eyebrow">DIỄN ĐÀN GÓC HỌC · 4 CHUYÊN MỤC</span>
        <h3>${catFilter === 'all' ? 'Cộng đồng Python Lofi Đêm' : escForumHtml(activeCatMeta.name)}</h3>
        <p>${catFilter === 'all' ? 'Hỏi bài, chia sẻ sổ tay, gỡ lỗi code & trò chuyện trực tiếp' : escForumHtml(activeCatMeta.desc)}</p>
      </div>
      <div class="lf-hero-btns">
        <button type="button" class="lf-btn-amber" data-toggle-compose="${st.composing ? '0' : '1'}">
          ${st.composing ? '✕ Đóng khung đăng' : '＋ Tạo chủ đề'}
        </button>
        <button type="button" class="lf-btn-ghost" data-toggle-chat="${st.chatOpen ? '0' : '1'}">
          💬 Chat phòng học (${(st.chat || []).length})
        </button>
      </div>
    </div>

    ${composerHtml}
    ${chatDrawerHtml}

    <!-- Bộ lọc 4 chuyên mục -->
    <div class="lf-cat-bar" role="tablist" aria-label="Lọc theo 4 chuyên mục">
      ${catTabs}
    </div>

    <!-- Thanh tìm kiếm & sắp xếp -->
    <div class="lf-toolbar">
      <input type="search" class="lf-input lf-search" id="lfSearchIn" value="${escForumHtml(st.search || '')}" placeholder="Tìm bài viết, từ khóa, mã lỗi…" aria-label="Tìm bài viết">
      <div class="lf-sort-group">
        <button type="button" class="lf-sort-btn${sortBy === 'newest' ? ' active' : ''}" data-fsort="newest">Mới nhất</button>
        <button type="button" class="lf-sort-btn${sortBy === 'likes' ? ' active' : ''}" data-fsort="likes">Nhiều cảm xúc</button>
      </div>
    </div>

    <div class="lf-post-list">
      ${listHtml}
    </div>
  </div>`;
}

export function wireForumInteractions(root, st, getUserName, onUpdate, onToast, onRotate) {
  if (!root) return;

  // Nút xoay ngang / xoay dọc điện thoại
  root.querySelectorAll('[data-rotate-phone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (onRotate) onRotate(!st.wide);
      else {
        st.wide = !st.wide;
        onUpdate();
      }
    });
  });

  // Chặn click trên thanh cảm xúc làm mở nhầm thẻ bài viết
  root.querySelectorAll('[data-stop-open]').forEach((el) => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });

  // Lọc 4 chuyên mục
  root.querySelectorAll('[data-fcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.category = btn.dataset.fcat || 'all';
      st.postId = null;
      onUpdate();
    });
  });

  // Sắp xếp
  root.querySelectorAll('[data-fsort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.sort = btn.dataset.fsort || 'newest';
      onUpdate();
    });
  });

  // Tìm kiếm
  const searchIn = root.querySelector('#lfSearchIn');
  if (searchIn) {
    searchIn.addEventListener('input', (e) => {
      st.search = e.target.value;
      onUpdate(true);
    });
  }

  // Bật/tắt khung tạo chủ đề mới
  root.querySelectorAll('[data-toggle-compose]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.composing = btn.dataset.toggleCompose === '1';
      onUpdate();
    });
  });

  // Bật/tắt phòng chat nhanh
  root.querySelectorAll('[data-toggle-chat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.chatOpen = btn.dataset.toggleChat === '1';
      onUpdate();
    });
  });

  // Tạo chủ đề thảo luận mới
  const createForm = root.querySelector('#lfCreatePostForm');
  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(createForm);
      const title = String(fd.get('title') || '').trim();
      const content = String(fd.get('content') || '').trim();
      const category = String(fd.get('category') || 'discuss');
      const code = String(fd.get('code') || '').trim();
      if (!title || !content) return;
      const uName = getUserName();
      const newPost = {
        id: Date.now(),
        category,
        pinned: false,
        solved: false,
        title,
        content,
        code,
        author: {
          name: uName,
          role: 'Thành viên Góc học',
          avatar: (uName.trim()[0] || 'K').toUpperCase(),
        },
        createdAt: 'Vừa xong',
        my_reaction: 'like',
        reactions: { like: 1, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        comments: [],
      };
      st.posts.unshift(newPost);
      luuBaiDienDan(st.posts);
      st.composing = false;
      st.postId = newPost.id;
      if (onToast) onToast('Đã đăng chủ đề thảo luận mới!');
      onUpdate();
    });
  }

  // Gửi tin nhắn trong phòng chat nhanh
  const chatForm = root.querySelector('#lfChatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = root.querySelector('#lfChatIn');
      const txt = inp ? inp.value.trim() : '';
      if (!txt) return;
      const uName = getUserName();
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      st.chat.push({
        id: Date.now(),
        user: uName,
        avatar: (uName.trim()[0] || 'K').toUpperCase(),
        time: hm,
        text: txt,
      });
      luuChatDienDan(st.chat);
      onUpdate();
    });
  }

  // Mở chi tiết bài viết
  root.querySelectorAll('[data-open-post]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-stop-open]') || e.target.closest('[data-react-type]')) return;
      st.postId = Number(el.dataset.openPost);
      st.replyToId = null;
      if (!st.wide && onRotate) {
        onRotate(true);
      } else {
        onUpdate();
      }
    });
  });

  // Quay lại danh sách
  root.querySelectorAll('[data-fback]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.postId = null;
      st.replyToId = null;
      onUpdate();
    });
  });

  // Thả 1 trong 6 loại cảm xúc (trên bài viết hoặc bình luận)
  root.querySelectorAll('[data-react-type]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kind = btn.dataset.reactKind;
      const id = Number(btn.dataset.reactId);
      const type = btn.dataset.reactType;
      if (kind === 'post') {
        const p = st.posts.find((x) => Number(x.id) === id);
        if (p) batTatCamXuc(p, type);
      } else {
        for (const p of st.posts) {
          for (const c of p.comments || []) {
            if (Number(c.id) === id) batTatCamXuc(c, type);
            for (const rp of c.replies || []) {
              if (Number(rp.id) === id) batTatCamXuc(rp, type);
            }
          }
        }
      }
      luuBaiDienDan(st.posts);
      onUpdate();
    });
  });

  // Mở ô trả lời bình luận cha (1 cấp lồng)
  root.querySelectorAll('[data-reply-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = Number(btn.dataset.replyTo);
      st.replyToId = st.replyToId === cid ? null : cid;
      onUpdate();
    });
  });

  root.querySelectorAll('[data-cancel-reply]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.replyToId = null;
      onUpdate();
    });
  });

  // Gửi bình luận gốc
  const rootCmtForm = root.querySelector('#lfRootCommentForm');
  if (rootCmtForm) {
    rootCmtForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pid = Number(rootCmtForm.dataset.postId);
      const inp = root.querySelector('#lfRootCommentIn');
      const txt = inp ? inp.value.trim() : '';
      if (!txt) return;
      const p = st.posts.find((x) => Number(x.id) === pid);
      if (!p) return;
      const uName = getUserName();
      p.comments = p.comments || [];
      p.comments.push({
        id: Date.now(),
        author: {
          name: uName,
          role: 'Thành viên',
          avatar: (uName.trim()[0] || 'K').toUpperCase(),
        },
        createdAt: 'Vừa xong',
        content: txt,
        my_reaction: null,
        reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        replies: [],
      });
      luuBaiDienDan(st.posts);
      if (onToast) onToast('Đã gửi bình luận!');
      onUpdate();
    });
  }

  // Gửi trả lời lồng (nested reply)
  root.querySelectorAll('[data-reply-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const parentId = Number(form.dataset.replyForm);
      const fd = new FormData(form);
      const txt = String(fd.get('replyContent') || '').trim();
      if (!txt) return;
      const uName = getUserName();
      for (const p of st.posts) {
        const parent = (p.comments || []).find((c) => Number(c.id) === parentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push({
            id: Date.now(),
            parentCommentId: parent.id,
            author: {
              name: uName,
              role: 'Phản hồi',
              avatar: (uName.trim()[0] || 'K').toUpperCase(),
            },
            createdAt: 'Vừa xong',
            content: txt,
            my_reaction: null,
            reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
          });
          break;
        }
      }
      st.replyToId = null;
      luuBaiDienDan(st.posts);
      if (onToast) onToast('Đã gửi phản hồi lồng!');
      onUpdate();
    });
  });
}
