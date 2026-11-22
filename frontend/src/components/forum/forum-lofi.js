/*
 * Diễn đàn Lofi Dark-Purple tích hợp trong màn Điện thoại (#phone) và thanh bên
 * phải của Góc học:
 *  - Đọc và đồng bộ trực tiếp qua API thật của BE7 (không lưu diễn đàn cục bộ)
 *  - 4 chuyên mục khớp backend (discuss, question, share, help)
 *  - 6 loại cảm xúc tương tác (like, love, haha, wow, sad, angry) trên bài & bình luận
 *  - Bình luận lồng 2 cấp (bình luận gốc + replies nối bằng thread-connector.svg)
 *  - Sửa / xoá bài viết và bình luận thuộc quyền tác giả hoặc admin
 *  - Người chưa đăng nhập: đọc bằng apiFetchSessionOnly (không tự tạo khách),
 *    thao tác ghi (đăng bài, bình luận, cảm xúc) bằng apiFetch, xử lý 429 thân thiện.
 */

import { friendlyApiError } from '../../lib/friendly-api-error.mjs';

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

/*
 * Dữ liệu fixture thuần bộ nhớ chỉ phục vụ kiểm thử đơn vị (forum-lofi.test.mjs).
 * Runtime của Góc học luôn khởi tạo danh sách rỗng và tải từ backend.
 */
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
    comments: [],
  },
];

export const CHAT_MAU_DIEN_DAN = [
  { id: 1, user: 'Minh Anh', avatar: 'M', time: '21:15', text: 'Có ai đang làm Bài 4 học phần M1 không nhỉ?' },
];

export function taoCamXucRong() {
  return { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
}

export function chuanHoaCamXuc(raw) {
  const out = taoCamXucRong();
  if (!raw || typeof raw !== 'object') return out;
  for (const r of CAM_XUC_DIEN_DAN) {
    const n = Number(raw[r.id]);
    out[r.id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

export function dinhDangThoiGian(raw) {
  if (!raw) return 'Vừa xong';
  if (typeof raw === 'string' && !/\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw;
  }
  let ms = NaN;
  if (raw instanceof Date) {
    ms = raw.getTime();
  } else {
    const s = String(raw).trim();
    const iso = /[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
    ms = Date.parse(iso);
  }
  if (!Number.isFinite(ms)) return 'Vừa xong';
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} ngày trước`;
  try {
    return new Date(ms).toLocaleDateString('vi-VN');
  } catch {
    return 'Vừa xong';
  }
}

/* Backend CreatePostDto chỉ nhận (title, content, category) và bật forbidNonWhitelisted.
   Nên đoạn mã Python tuỳ chọn được gộp vào content dưới dạng khối ```python ... ``` để
   lưu được vào Postgres và giữ nguyên giao diện khối mã ở mọi trình duyệt. */
export function tachNoiDungVaCode(rawContent) {
  const src = String(rawContent ?? '');
  const m = /\n*```(?:python|py)?[ \t]*\r?\n([\s\S]*?)\r?\n?```\s*$/.exec(src);
  if (!m) return { text: src, code: '' };
  const text = src.slice(0, m.index).trimEnd();
  return { text, code: m[1].trim() };
}

export function gopNoiDungVaCode(text, code) {
  const cleanText = String(text ?? '').trim();
  const cleanCode = String(code ?? '').trim();
  if (!cleanCode) return cleanText;
  return `${cleanText}\n\n\`\`\`python\n${cleanCode}\n\`\`\``;
}

function layChuCaiAvatar(author) {
  if (!author) return 'H';
  const av = typeof author.avatar === 'string' ? author.avatar.trim() : '';
  if (av && av.length <= 4 && !av.startsWith('http') && !av.startsWith('/')) {
    return av;
  }
  const name = typeof author.name === 'string' ? author.name.trim() : '';
  return (name[0] || 'H').toUpperCase();
}

export function mapApiComment(row) {
  if (!row || typeof row !== 'object') return null;
  const authorName =
    row.author && typeof row.author.name === 'string' && row.author.name.trim()
      ? row.author.name.trim()
      : 'Học viên';
  return {
    id: Number(row.id),
    parentCommentId: row.parentCommentId != null ? Number(row.parentCommentId) : null,
    content: String(row.content ?? ''),
    author: {
      id: row.author && row.author.id != null ? Number(row.author.id) : null,
      name: authorName,
      avatar: layChuCaiAvatar(row.author),
    },
    createdAt: dinhDangThoiGian(row.createdAt),
    reactions: chuanHoaCamXuc(row.reactions),
    my_reaction: row.my_reaction || null,
    replies: Array.isArray(row.replies)
      ? row.replies.map(mapApiComment).filter(Boolean)
      : [],
  };
}

export function mapApiPost(row) {
  if (!row || typeof row !== 'object') return null;
  const rawContent = String(row.content ?? '');
  const parsed =
    row.code != null
      ? { text: rawContent, code: String(row.code ?? '') }
      : tachNoiDungVaCode(rawContent);
  const authorName =
    row.author && typeof row.author.name === 'string' && row.author.name.trim()
      ? row.author.name.trim()
      : 'Học viên';
  const authorId =
    row.author && row.author.id != null
      ? Number(row.author.id)
      : row.userId != null
        ? Number(row.userId)
        : null;
  return {
    id: Number(row.id),
    category: CHUYEN_MUC_DIEN_DAN.some((c) => c.id === row.category) ? row.category : 'discuss',
    title: row.title ? String(row.title) : '',
    content: parsed.text,
    code: parsed.code,
    author: {
      id: authorId,
      name: authorName,
      avatar: layChuCaiAvatar(row.author),
    },
    createdAt: dinhDangThoiGian(row.createdAt),
    reactions: chuanHoaCamXuc(row.reactions),
    my_reaction: row.my_reaction || null,
    likeCount: Number(row.likeCount ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    comments: Array.isArray(row.comments)
      ? row.comments.map(mapApiComment).filter(Boolean)
      : null,
  };
}

function tachThongDiepServer(body) {
  if (!body || typeof body !== 'object') return null;
  const raw =
    body.error && typeof body.error === 'object'
      ? body.error.message
      : body.message ?? (typeof body.error === 'string' ? body.error : null);
  if (Array.isArray(raw)) {
    const first = raw.find((x) => typeof x === 'string' && x.trim());
    return first ? first.trim() : null;
  }
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function rutLoiDienDan(status, body, fallback) {
  if (status === 429) {
    const msg = tachThongDiepServer(body);
    // BE7 @ThrottleMessage trả thông báo tiếng Việt thân thiện theo từng route (đăng bài / bình luận);
    // chỉ rơi về câu mặc định nếu gặp chuỗi tiếng Anh mặc định của Throttler.
    if (msg && !/throttlerexception|too many requests/i.test(msg)) {
      return msg;
    }
    return friendlyApiError(429, body, fallback);
  }
  return friendlyApiError(status, body, fallback);
}

export function taoTrangThaiDienDan(overrides = {}) {
  return {
    posts: [],
    total: 0,
    page: 1,
    pageSize: 20,
    category: 'all',
    mine: false,
    sort: 'newest',
    search: '',
    postId: null,
    replyToId: null,
    composing: false,
    editingPostId: null,
    editingCommentId: null,
    confirmDeletePostId: null,
    confirmDeleteCommentId: null,
    wide: false,
    loading: false,
    loadingMore: false,
    detailLoading: false,
    commentsLoadingMore: false,
    submitting: false,
    commentsPage: 1,
    commentsTotal: 0,
    repliesTruncated: false,
    authRequired: false,
    error: null,
    actionError: null,
    loaded: false,
    catCounts: null,
    composeDraft: { category: 'discuss', title: '', content: '', code: '' },
    commentDraft: '',
    replyDraft: '',
    editPostDraft: { category: 'discuss', title: '', content: '', code: '' },
    editCommentDraft: '',
    ...overrides,
  };
}

export function tongCamXuc(reactions) {
  if (!reactions) return 0;
  return Object.values(reactions).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function tongBinhLuan(post) {
  if (!post) return 0;
  if (Array.isArray(post.comments)) {
    const loadedCount = post.comments.reduce(
      (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
      0,
    );
    return Math.max(loadedCount, Number(post.comment_count || 0));
  }
  return Number(post.comment_count || 0);
}

export function batTatCamXuc(target, type) {
  if (!target.reactions) {
    target.reactions = taoCamXucRong();
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

function coQuyenSuaXoa(authorId, currentUser) {
  if (!currentUser || currentUser.id == null) return false;
  if (currentUser.role === 'admin') return true;
  return authorId != null && Number(authorId) === Number(currentUser.id);
}

async function docJsonAnToan(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function taiDanhSachBai(st, api, opts = {}) {
  const append = Boolean(opts.append);
  const useWriteAuth = Boolean(opts.useWriteAuth);
  const fetcher = useWriteAuth ? api?.write : api?.read;
  if (!fetcher) {
    st.error = 'Chưa kết nối API diễn đàn.';
    return { ok: false, status: 0, message: st.error };
  }

  const targetPage = append ? (st.page || 1) + 1 : 1;
  const reqId = (st._listReqId = (st._listReqId || 0) + 1);
  if (append) st.loadingMore = true;
  else st.loading = true;
  st.error = null;

  const params = new URLSearchParams();
  params.set('page', String(targetPage));
  if (st.sort) params.set('sort', st.sort);
  if (st.category && st.category !== 'all') params.set('category', st.category);
  if (st.mine) params.set('mine', '1');

  let res;
  try {
    res = await fetcher(`/api/posts?${params.toString()}`);
  } catch {
    if (reqId !== st._listReqId) return { ok: false, stale: true };
    st.loading = false;
    st.loadingMore = false;
    st.error = rutLoiDienDan(0, null);
    return { ok: false, status: 0, message: st.error };
  }

  const body = await docJsonAnToan(res);
  if (reqId !== st._listReqId) return { ok: false, stale: true };

  st.loading = false;
  st.loadingMore = false;

  if (res.status === 401) {
    st.authRequired = true;
    st.error = null;
    if (!append) {
      st.posts = [];
      st.total = 0;
      st.loaded = false;
    }
    return { ok: false, status: 401, message: rutLoiDienDan(401, body) };
  }

  if (!res.ok) {
    st.error = rutLoiDienDan(res.status, body, 'Không tải được danh sách bài viết.');
    return { ok: false, status: res.status, message: st.error };
  }

  const prevById = new Map((st.posts || []).map((p) => [Number(p.id), p]));
  const rawPosts = Array.isArray(body?.posts) ? body.posts : [];
  const mapped = rawPosts
    .map(mapApiPost)
    .filter(Boolean)
    .map((p) => {
      const prev = prevById.get(p.id);
      if (prev && Array.isArray(prev.comments)) {
        p.comments = prev.comments;
      }
      return p;
    });

  if (append) {
    const seen = new Set((st.posts || []).map((p) => Number(p.id)));
    for (const p of mapped) {
      if (!seen.has(p.id)) {
        st.posts.push(p);
        seen.add(p.id);
      }
    }
  } else {
    st.posts = mapped;
  }

  st.total = Number.isFinite(Number(body?.total)) ? Number(body.total) : st.posts.length;
  st.page = Number.isFinite(Number(body?.page)) ? Number(body.page) : targetPage;
  st.pageSize = Number.isFinite(Number(body?.page_size)) ? Number(body.page_size) : 20;
  st.authRequired = false;
  st.error = null;
  st.loaded = true;

  if (st.category === 'all' && !st.mine && st.posts.length >= st.total) {
    const counts = { all: st.total };
    for (const c of CHUYEN_MUC_DIEN_DAN) {
      counts[c.id] = st.posts.filter((p) => p.category === c.id).length;
    }
    st.catCounts = counts;
  } else if (st.category !== 'all' && !st.mine) {
    st.catCounts = { ...(st.catCounts || {}), [st.category]: st.total };
  } else if (st.category === 'all' && !st.mine) {
    st.catCounts = { ...(st.catCounts || {}), all: st.total };
  }

  if (useWriteAuth && typeof api.refreshUser === 'function') {
    await api.refreshUser();
  }

  return { ok: true, posts: st.posts, total: st.total };
}

export async function taiChiTietBai(st, api, postId, opts = {}) {
  const id = Number(postId);
  const appendComments = Boolean(opts.appendComments);
  const commentsPage = appendComments ? (st.commentsPage || 1) + 1 : opts.commentsPage || 1;
  const fetcher = api?.read;
  if (!fetcher || !Number.isFinite(id)) {
    return { ok: false, status: 0, message: 'Không thể tải chi tiết bài viết.' };
  }

  const reqId = (st._detailReqId = (st._detailReqId || 0) + 1);
  if (appendComments) st.commentsLoadingMore = true;
  else st.detailLoading = true;
  st.actionError = null;

  let postRes = null;
  let cmtRes = null;
  try {
    if (appendComments) {
      cmtRes = await fetcher(`/api/posts/${id}/comments?page=${commentsPage}`);
    } else {
      [postRes, cmtRes] = await Promise.all([
        fetcher(`/api/posts/${id}`),
        fetcher(`/api/posts/${id}/comments?page=${commentsPage}`),
      ]);
    }
  } catch {
    if (reqId !== st._detailReqId) return { ok: false, stale: true };
    st.detailLoading = false;
    st.commentsLoadingMore = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const postBody = postRes ? await docJsonAnToan(postRes) : null;
  const cmtBody = cmtRes ? await docJsonAnToan(cmtRes) : null;
  if (reqId !== st._detailReqId) return { ok: false, stale: true };

  st.detailLoading = false;
  st.commentsLoadingMore = false;

  if ((postRes && postRes.status === 401) || (cmtRes && cmtRes.status === 401)) {
    st.authRequired = true;
    return { ok: false, status: 401, message: rutLoiDienDan(401, postBody || cmtBody) };
  }

  if (postRes && !postRes.ok) {
    const msg =
      postRes.status === 404
        ? 'Bài viết không tồn tại hoặc đã bị xoá.'
        : rutLoiDienDan(postRes.status, postBody, 'Không tải được chi tiết bài viết.');
    st.actionError = msg;
    return { ok: false, status: postRes.status, message: msg };
  }

  if (cmtRes && !cmtRes.ok) {
    const msg = rutLoiDienDan(cmtRes.status, cmtBody, 'Không tải được bình luận.');
    st.actionError = msg;
    return { ok: false, status: cmtRes.status, message: msg };
  }

  let target = (st.posts || []).find((p) => Number(p.id) === id);
  if (postBody?.post) {
    const mappedPost = mapApiPost(postBody.post);
    if (mappedPost) {
      if (target) {
        Object.assign(target, mappedPost, { comments: target.comments });
      } else {
        target = mappedPost;
        st.posts = [mappedPost, ...(st.posts || [])];
      }
    }
  }

  if (target && cmtBody) {
    const mappedCmts = Array.isArray(cmtBody.comments)
      ? cmtBody.comments.map(mapApiComment).filter(Boolean)
      : [];
    if (appendComments && Array.isArray(target.comments)) {
      const seen = new Set(target.comments.map((c) => c.id));
      for (const c of mappedCmts) {
        if (!seen.has(c.id)) target.comments.push(c);
      }
    } else {
      target.comments = mappedCmts;
    }
    st.commentsTotal = Number.isFinite(Number(cmtBody.total))
      ? Number(cmtBody.total)
      : target.comments.length;
    st.commentsPage = Number.isFinite(Number(cmtBody.page))
      ? Number(cmtBody.page)
      : commentsPage;
    st.repliesTruncated = Boolean(cmtBody.replies_truncated);

    const counted = target.comments.reduce(
      (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
      0,
    );
    if (!st.repliesTruncated && target.comments.length >= st.commentsTotal) {
      target.comment_count = counted;
    } else {
      target.comment_count = Math.max(Number(target.comment_count || 0), counted);
    }
  }

  st.authRequired = false;
  return { ok: true, post: target };
}

export async function guiTaoBai(st, api, payload) {
  if (!api?.write) {
    return { ok: false, status: 0, message: 'Chưa kết nối API đăng bài.' };
  }
  const title = String(payload?.title ?? '').trim();
  const bodyText = String(payload?.content ?? '').trim();
  const code = String(payload?.code ?? '').trim();
  const category = CHUYEN_MUC_DIEN_DAN.some((c) => c.id === payload?.category)
    ? payload.category
    : 'discuss';

  if (!bodyText && !code) {
    const msg = 'Nội dung bài viết không được để trống.';
    st.actionError = msg;
    return { ok: false, status: 400, message: msg };
  }

  const packedContent = gopNoiDungVaCode(bodyText, code);
  st.submitting = true;
  st.actionError = null;

  let res;
  try {
    res = await api.write('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        title: title || undefined,
        content: packedContent,
      }),
    });
  } catch {
    st.submitting = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  st.submitting = false;

  if (!res.ok) {
    const msg = rutLoiDienDan(res.status, body, 'Không đăng được chủ đề mới.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  if (typeof api.refreshUser === 'function') {
    await api.refreshUser();
  }

  const createdRaw = body?.post;
  const createdId = Number(createdRaw?.id);
  st.composeDraft = { category: 'discuss', title: '', content: '', code: '' };
  st.composing = false;
  st.authRequired = false;
  st.error = null;
  st.actionError = null;

  if (Number.isFinite(createdId) && createdId > 0) {
    st.postId = createdId;
    const detail = await taiChiTietBai(st, api, createdId);
    if (!detail.ok && createdRaw) {
      const fallbackPost = mapApiPost({ ...createdRaw, comments: [] });
      if (fallbackPost) {
        st.posts = [fallbackPost, ...(st.posts || []).filter((p) => p.id !== fallbackPost.id)];
      }
    }
    void taiDanhSachBai(st, api).catch(() => {});
  } else {
    await taiDanhSachBai(st, api);
  }

  return { ok: true, id: createdId };
}

export async function guiSuaBai(st, api, postId, payload) {
  if (!api?.write) {
    return { ok: false, status: 0, message: 'Chưa kết nối API chỉnh sửa bài.' };
  }
  const id = Number(postId);
  const title = String(payload?.title ?? '').trim();
  const bodyText = String(payload?.content ?? '').trim();
  const code = String(payload?.code ?? '').trim();
  const category = CHUYEN_MUC_DIEN_DAN.some((c) => c.id === payload?.category)
    ? payload.category
    : 'discuss';

  if (!bodyText && !code) {
    const msg = 'Nội dung bài viết không được để trống.';
    st.actionError = msg;
    return { ok: false, status: 400, message: msg };
  }

  st.submitting = true;
  st.actionError = null;
  let res;
  try {
    res = await api.write(`/api/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        title,
        content: gopNoiDungVaCode(bodyText, code),
      }),
    });
  } catch {
    st.submitting = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  st.submitting = false;
  if (!res.ok) {
    const msg = rutLoiDienDan(res.status, body, 'Không cập nhật được bài viết.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  st.editingPostId = null;
  st.actionError = null;
  await taiChiTietBai(st, api, id);
  return { ok: true };
}

export async function guiXoaBai(st, api, postId) {
  if (!api?.write) {
    return { ok: false, status: 0, message: 'Chưa kết nối API xoá bài.' };
  }
  const id = Number(postId);
  st.submitting = true;
  st.actionError = null;
  let res;
  try {
    res = await api.write(`/api/posts/${id}`, { method: 'DELETE' });
  } catch {
    st.submitting = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  st.submitting = false;
  if (!res.ok) {
    const msg = rutLoiDienDan(res.status, body, 'Không xoá được bài viết.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  const removedPost = (st.posts || []).find((p) => Number(p.id) === id);
  st.posts = (st.posts || []).filter((p) => Number(p.id) !== id);
  st.total = Math.max(0, Number(st.total || 0) - 1);
  if (st.catCounts && removedPost) {
    st.catCounts = {
      ...st.catCounts,
      all: st.total,
      [removedPost.category]: Math.max(0, Number(st.catCounts[removedPost.category] || 0) - 1),
    };
  }
  if (Number(st.postId) === id) {
    st.postId = null;
    st.replyToId = null;
  }
  st.confirmDeletePostId = null;
  st.editingPostId = null;
  return { ok: true };
}

function timMucTieuCamXuc(st, kind, id) {
  const numId = Number(id);
  if (kind === 'post') {
    return (st.posts || []).find((x) => Number(x.id) === numId) || null;
  }
  for (const p of st.posts || []) {
    for (const c of p.comments || []) {
      if (Number(c.id) === numId) return c;
      for (const rp of c.replies || []) {
        if (Number(rp.id) === numId) return rp;
      }
    }
  }
  return null;
}

export async function guiCamXuc(st, api, kind, targetId, type, onProgress) {
  const target = timMucTieuCamXuc(st, kind, targetId);
  if (!target) return { ok: false, status: 404, message: 'Không tìm thấy đối tượng.' };

  if (!api?.write) {
    batTatCamXuc(target, type);
    return { ok: true, local: true };
  }

  const prevSnapshot = {
    reactions: { ...chuanHoaCamXuc(target.reactions) },
    my_reaction: target.my_reaction || null,
    likeCount: target.likeCount,
  };

  batTatCamXuc(target, type);
  if (typeof onProgress === 'function') onProgress();

  const endpoint =
    kind === 'post'
      ? `/api/posts/${Number(targetId)}/react`
      : `/api/comments/${Number(targetId)}/react`;

  let res;
  try {
    res = await api.write(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: type }),
    });
  } catch {
    target.reactions = prevSnapshot.reactions;
    target.my_reaction = prevSnapshot.my_reaction;
    if (prevSnapshot.likeCount !== undefined) target.likeCount = prevSnapshot.likeCount;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  if (!res.ok) {
    target.reactions = prevSnapshot.reactions;
    target.my_reaction = prevSnapshot.my_reaction;
    if (prevSnapshot.likeCount !== undefined) target.likeCount = prevSnapshot.likeCount;
    const msg = rutLoiDienDan(res.status, body, 'Không thả được cảm xúc lúc này.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  if (body && typeof body === 'object') {
    if (body.reactions) target.reactions = chuanHoaCamXuc(body.reactions);
    if ('my_reaction' in body) target.my_reaction = body.my_reaction ?? null;
    if (kind === 'post' && body.like_count != null) {
      target.likeCount = Number(body.like_count);
    }
  }
  st.actionError = null;
  if (typeof api.refreshUser === 'function') {
    await api.refreshUser();
  }
  return { ok: true };
}

export async function guiBinhLuan(st, api, postId, content, parentCommentId = null) {
  if (!api?.write) {
    return { ok: false, status: 0, message: 'Chưa kết nối API bình luận.' };
  }
  const clean = String(content ?? '').trim();
  if (!clean) {
    const msg = 'Nội dung bình luận không được để trống.';
    st.actionError = msg;
    return { ok: false, status: 400, message: msg };
  }

  const pid = Number(postId);
  const payload = parentCommentId
    ? { content: clean, parent_comment_id: Number(parentCommentId) }
    : { content: clean };

  st.submitting = true;
  st.actionError = null;

  let res;
  try {
    res = await api.write(`/api/posts/${pid}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    st.submitting = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  st.submitting = false;

  if (!res.ok) {
    const msg = rutLoiDienDan(res.status, body, 'Không gửi được bình luận lúc này.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  if (parentCommentId) {
    st.replyDraft = '';
    st.replyToId = null;
  } else {
    st.commentDraft = '';
  }
  st.actionError = null;

  if (typeof api.refreshUser === 'function') {
    await api.refreshUser();
  }
  await taiChiTietBai(st, api, pid);
  return { ok: true };
}

export async function guiSuaBinhLuan(st, api, postId, commentId, content) {
  if (!api?.write) {
    return { ok: false, status: 0, message: 'Chưa kết nối API sửa bình luận.' };
  }
  const clean = String(content ?? '').trim();
  if (!clean) {
    const msg = 'Nội dung bình luận không được để trống.';
    st.actionError = msg;
    return { ok: false, status: 400, message: msg };
  }

  st.submitting = true;
  st.actionError = null;

  let res;
  try {
    res = await api.write(`/api/comments/${Number(commentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: clean }),
    });
  } catch {
    st.submitting = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  st.submitting = false;
  if (!res.ok) {
    const msg = rutLoiDienDan(res.status, body, 'Không cập nhật được bình luận.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  st.editingCommentId = null;
  st.editCommentDraft = '';
  st.actionError = null;
  await taiChiTietBai(st, api, Number(postId));
  return { ok: true };
}

export async function guiXoaBinhLuan(st, api, postId, commentId) {
  if (!api?.write) {
    return { ok: false, status: 0, message: 'Chưa kết nối API xoá bình luận.' };
  }

  st.submitting = true;
  st.actionError = null;

  let res;
  try {
    res = await api.write(`/api/comments/${Number(commentId)}`, { method: 'DELETE' });
  } catch {
    st.submitting = false;
    const msg = rutLoiDienDan(0, null);
    st.actionError = msg;
    return { ok: false, status: 0, message: msg };
  }

  const body = await docJsonAnToan(res);
  st.submitting = false;
  if (!res.ok) {
    const msg = rutLoiDienDan(res.status, body, 'Không xoá được bình luận.');
    st.actionError = msg;
    return { ok: false, status: res.status, message: msg };
  }

  st.confirmDeleteCommentId = null;
  st.editingCommentId = null;
  st.actionError = null;
  const post = (st.posts || []).find((p) => Number(p.id) === Number(postId));
  if (post) {
    post.comment_count = Math.max(0, Number(post.comment_count || 0) - 1);
  }
  await taiChiTietBai(st, api, Number(postId));
  return { ok: true };
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

function renderAlertBanner(message, variant = 'err') {
  if (!message) return '';
  return `<div class="lf-alert ${variant}" role="alert">
    <span>${escForumHtml(message)}</span>
    <button type="button" class="lf-alert-close" data-dismiss-alert="1" aria-label="Đóng thông báo">✕</button>
  </div>`;
}

function renderCommentActions(comment, postId, currentUser, st) {
  if (!coQuyenSuaXoa(comment.author?.id, currentUser)) return '';
  const isDeleting = Number(st.confirmDeleteCommentId) === Number(comment.id);
  if (isDeleting) {
    return `<span class="lf-inline-actions">
      <button type="button" class="lf-mini-btn danger" data-confirm-del-cmt="${comment.id}" data-post-id="${postId}" ${st.submitting ? 'disabled' : ''}>Chắc chắn xoá?</button>
      <button type="button" class="lf-mini-btn" data-cancel-del-cmt="1">Huỷ</button>
    </span>`;
  }
  return `<span class="lf-inline-actions">
    <button type="button" class="lf-mini-btn" data-edit-cmt="${comment.id}">Sửa</button>
    <button type="button" class="lf-mini-btn danger" data-ask-del-cmt="${comment.id}">Xoá</button>
  </span>`;
}

function renderPostActions(post, currentUser, st) {
  if (!coQuyenSuaXoa(post.author?.id, currentUser)) return '';
  const isDeleting = Number(st.confirmDeletePostId) === Number(post.id);
  if (isDeleting) {
    return `<span class="lf-inline-actions" data-stop-open="1">
      <button type="button" class="lf-mini-btn danger" data-confirm-del-post="${post.id}" ${st.submitting ? 'disabled' : ''}>Chắc chắn xoá?</button>
      <button type="button" class="lf-mini-btn" data-cancel-del-post="1">Huỷ</button>
    </span>`;
  }
  return `<span class="lf-inline-actions" data-stop-open="1">
    <button type="button" class="lf-mini-btn" data-edit-post="${post.id}">Sửa</button>
    <button type="button" class="lf-mini-btn danger" data-ask-del-post="${post.id}">Xoá</button>
  </span>`;
}

export function renderForumMarkup(st, userName, currentUser = null) {
  const posts = st.posts || [];
  const catFilter = st.category || 'all';
  const sortBy = st.sort || 'newest';
  const query = (st.search || '').trim().toLowerCase();
  const composeDraft = st.composeDraft || { category: catFilter === 'all' ? 'discuss' : catFilter, title: '', content: '', code: '' };

  const counts = { all: st.catCounts?.all ?? (catFilter === 'all' && !st.mine ? (st.total || posts.length) : null) };
  CHUYEN_MUC_DIEN_DAN.forEach((c) => {
    if (st.catCounts && st.catCounts[c.id] != null) {
      counts[c.id] = st.catCounts[c.id];
    } else if (!st.mine && catFilter === 'all') {
      counts[c.id] = posts.filter((p) => p.category === c.id).length;
    } else if (!st.mine && catFilter === c.id) {
      counts[c.id] = st.total || posts.length;
    } else {
      counts[c.id] = null;
    }
  });

  const filtered = posts
    .filter((p) => (catFilter === 'all' ? true : p.category === catFilter))
    .filter((p) => {
      if (!query) return true;
      return (
        String(p.title || '').toLowerCase().includes(query) ||
        String(p.content || '').toLowerCase().includes(query) ||
        String(p.code || '').toLowerCase().includes(query) ||
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
      <span>✨ Tất cả</span>${counts.all != null ? `<b>${counts.all}</b>` : ''}
    </button>`,
    ...CHUYEN_MUC_DIEN_DAN.map(
      (c) => `<button type="button" class="lf-cat-pill${catFilter === c.id ? ' active' : ''}" data-fcat="${c.id}">
        <img src="${c.badge}" alt="" width="20" height="20">
        <span>${escForumHtml(c.short)}</span>
        ${counts[c.id] != null ? `<b>${counts[c.id]}</b>` : ''}
      </button>`,
    ),
  ].join('');

  // Nếu đang xem CHI TIẾT BÀI VIẾT
  const activePost = st.postId ? posts.find((p) => Number(p.id) === Number(st.postId)) : null;
  if (activePost) {
    const cat =
      CHUYEN_MUC_DIEN_DAN.find((c) => c.id === activePost.category) || CHUYEN_MUC_DIEN_DAN[0];
    const isEditingPost = Number(st.editingPostId) === Number(activePost.id);
    const editPostDraft = st.editPostDraft || {
      category: activePost.category,
      title: activePost.title || '',
      content: activePost.content || '',
      code: activePost.code || '',
    };

    const loadedComments = Array.isArray(activePost.comments) ? activePost.comments : [];
    const commentsHtml = loadedComments
      .map((c) => {
        const isEditingThisComment = Number(st.editingCommentId) === Number(c.id);
        const repliesHtml = (c.replies || [])
          .map((rp) => {
            const isEditingReply = Number(st.editingCommentId) === Number(rp.id);
            return `<div class="lf-reply-item">
              <img class="lf-thread-line" src="/forum-lofi/svg/thread-connector.svg" alt="" aria-hidden="true">
              <div class="lf-cmt-card lf-cmt-nested">
                <div class="lf-cmt-head">
                  <span class="lf-ava sm">${escForumHtml(rp.author?.avatar || rp.author?.name?.[0] || 'U')}</span>
                  <b class="fpc-author">${escForumHtml(rp.author?.name || 'Học viên')}</b>
                  <small class="lf-time">${escForumHtml(rp.createdAt || 'Vừa xong')}</small>
                  ${renderCommentActions(rp, activePost.id, currentUser, st)}
                </div>
                ${
                  isEditingReply
                    ? `<form class="lf-edit-form" data-edit-cmt-form="${rp.id}" data-post-id="${activePost.id}">
                        <input type="text" class="lf-input" name="editCommentContent" value="${escForumHtml(st.editCommentDraft ?? rp.content)}" required maxlength="10000">
                        <div class="lf-composer-actions">
                          <button type="button" class="lf-btn-ghost sm" data-cancel-edit-cmt="1">Huỷ</button>
                          <button type="submit" class="lf-btn-amber" ${st.submitting ? 'disabled' : ''}>Lưu</button>
                        </div>
                      </form>`
                    : `<p class="lf-cmt-body">${escForumHtml(rp.content)}</p>`
                }
                ${renderReactionBar('comment', rp.id, rp)}
              </div>
            </div>`;
          })
          .join('');

        const isReplyingThis = Number(st.replyToId) === Number(c.id);
        return `<article class="lf-cmt-thread">
          <div class="lf-cmt-card">
            <div class="lf-cmt-head">
              <span class="lf-ava">${escForumHtml(c.author?.avatar || c.author?.name?.[0] || 'U')}</span>
              <div>
                <b class="fpc-author">${escForumHtml(c.author?.name || 'Học viên')}</b>
                ${c.author?.role ? `<span class="lf-role-tag">${escForumHtml(c.author.role)}</span>` : ''}
              </div>
              <small class="lf-time">${escForumHtml(c.createdAt || 'Vừa xong')}</small>
              ${renderCommentActions(c, activePost.id, currentUser, st)}
            </div>
            ${
              isEditingThisComment
                ? `<form class="lf-edit-form" data-edit-cmt-form="${c.id}" data-post-id="${activePost.id}">
                    <input type="text" class="lf-input" name="editCommentContent" value="${escForumHtml(st.editCommentDraft ?? c.content)}" required maxlength="10000">
                    <div class="lf-composer-actions">
                      <button type="button" class="lf-btn-ghost sm" data-cancel-edit-cmt="1">Huỷ</button>
                      <button type="submit" class="lf-btn-amber" ${st.submitting ? 'disabled' : ''}>Lưu</button>
                    </div>
                  </form>`
                : `<p class="lf-cmt-body">${escForumHtml(c.content)}</p>`
            }
            <div class="lf-cmt-foot">
              ${renderReactionBar('comment', c.id, c)}
              <button type="button" class="lf-reply-trig" data-reply-to="${c.id}" data-reply-name="${escForumHtml(c.author?.name || 'bạn học')}">
                ↩ Trả lời (${(c.replies || []).length})
              </button>
            </div>
            ${
              isReplyingThis
                ? `<form class="lf-reply-form" data-reply-form="${c.id}">
                    <input type="text" class="lf-input" name="replyContent" value="${escForumHtml(st.replyDraft || '')}" placeholder="Trả lời @${escForumHtml(c.author?.name || 'bạn học')}…" required maxlength="10000">
                    <button type="submit" class="lf-btn-amber" ${st.submitting ? 'disabled' : ''}>Gửi trả lời</button>
                    <button type="button" class="lf-btn-ghost" data-cancel-reply="1">Huỷ</button>
                  </form>`
                : ''
            }
          </div>
          ${repliesHtml ? `<div class="lf-replies-wrap">${repliesHtml}</div>` : ''}
        </article>`;
      })
      .join('');

    const hasMoreComments =
      Array.isArray(activePost.comments) && st.commentsTotal > activePost.comments.length;

    return `<div class="lf-forum-wrap">
      ${orientBarHtml}
      <div class="lf-detail-topbar">
        <button type="button" class="lf-btn-ghost" data-fback="1">← Danh sách 4 chuyên mục</button>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="lf-cat-chip"><img src="${cat.badge}" alt="" width="18" height="18">${escForumHtml(cat.name)}</span>
          ${renderPostActions(activePost, currentUser, st)}
        </div>
      </div>

      ${renderAlertBanner(st.actionError)}

      ${
        isEditingPost
          ? `<form class="lf-composer-card" id="lfEditPostForm" data-post-id="${activePost.id}">
              <div class="lf-composer-head">
                <img src="/forum-lofi/svg/compose-quill.svg" alt="" width="24" height="24">
                <div><b>Chỉnh sửa bài viết</b></div>
              </div>
              <select class="lf-select" name="category" aria-label="Chuyên mục">
                ${CHUYEN_MUC_DIEN_DAN.map(
                  (c) => `<option value="${c.id}" ${editPostDraft.category === c.id ? 'selected' : ''}>${escForumHtml(c.name)}</option>`,
                ).join('')}
              </select>
              <input type="text" class="lf-input" name="title" value="${escForumHtml(editPostDraft.title)}" placeholder="Tiêu đề bài viết…" maxlength="300">
              <textarea class="lf-textarea" name="content" rows="4" required maxlength="8500">${escForumHtml(editPostDraft.content)}</textarea>
              <textarea class="lf-input mono" name="code" rows="2" placeholder="Đoạn mã Python minh họa (tuỳ chọn)" maxlength="1400">${escForumHtml(editPostDraft.code)}</textarea>
              <div class="lf-composer-actions">
                <button type="button" class="lf-btn-ghost" data-cancel-edit-post="1">Huỷ</button>
                <button type="submit" class="lf-btn-amber" ${st.submitting ? 'disabled' : ''}>${st.submitting ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
              </div>
            </form>`
          : `<article class="lf-post-detail">
              <img class="lf-post-banner" src="${cat.banner}" alt="">
              <div class="lf-post-head">
                <span class="lf-ava lg">${escForumHtml(activePost.author?.avatar || activePost.author?.name?.[0] || 'U')}</span>
                <div class="lf-post-meta">
                  <div class="lf-author-row">
                    <b class="fpc-author">${escForumHtml(activePost.author?.name || 'Học viên')}</b>
                    ${activePost.author?.role ? `<span class="lf-role-tag">${escForumHtml(activePost.author.role)}</span>` : ''}
                    ${activePost.solved ? '<span class="lf-solved-tag">✓ Đã giải đáp</span>' : ''}
                  </div>
                  <small class="lf-time">${escForumHtml(activePost.createdAt || 'Vừa xong')} · Chuyên mục ${escForumHtml(cat.name)}</small>
                </div>
              </div>

              <h3 class="lf-detail-title">${escForumHtml(activePost.title || 'Chủ đề thảo luận')}</h3>
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
            </article>`
      }

      <section class="lf-comments-sec" aria-label="Bình luận lồng">
        <div class="lf-sec-head">
          <h4>💬 Bình luận lồng (${tongBinhLuan(activePost)})</h4>
          <small>Hỗ trợ trả lời theo nhánh & thả 6 loại cảm xúc</small>
        </div>

        <form class="lf-comment-form" id="lfRootCommentForm" data-post-id="${activePost.id}">
          <input type="text" class="lf-input" id="lfRootCommentIn" value="${escForumHtml(st.commentDraft || '')}" placeholder="Viết bình luận của ${escForumHtml(userName)}…" required maxlength="10000">
          <button type="submit" class="lf-btn-amber" ${st.submitting ? 'disabled' : ''}>${st.submitting ? 'Đang gửi…' : 'Gửi bình luận'}</button>
        </form>

        <div class="lf-cmt-list">
          ${
            st.detailLoading && !Array.isArray(activePost.comments)
              ? '<p class="lf-loading-note">Đang tải bình luận từ máy chủ…</p>'
              : commentsHtml || '<p class="lf-empty-note">Chưa có bình luận nào. Hãy mở lời đầu tiên!</p>'
          }
        </div>
        ${
          st.repliesTruncated
            ? '<p class="lf-empty-note" style="margin-top:8px">Một số phản hồi dài đã được thu gọn để tải nhanh.</p>'
            : ''
        }
        ${
          hasMoreComments
            ? `<div class="lf-load-more-row">
                <button type="button" class="lf-btn-ghost sm" data-load-more-comments="${activePost.id}" ${st.commentsLoadingMore ? 'disabled' : ''}>
                  ${st.commentsLoadingMore ? 'Đang tải…' : `Xem thêm bình luận (${activePost.comments.length}/${st.commentsTotal})`}
                </button>
              </div>`
            : ''
        }
      </section>
    </div>`;
  }

  // Khung tạo chủ đề thảo luận mới
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
                `<option value="${c.id}" ${(composeDraft.category || 'discuss') === c.id ? 'selected' : ''}>${escForumHtml(c.name)} — ${escForumHtml(c.desc)}</option>`,
            ).join('')}
          </select>
        </div>
        <input type="text" class="lf-input" name="title" value="${escForumHtml(composeDraft.title)}" placeholder="Tiêu đề câu hỏi hoặc chủ đề thảo luận…" required maxlength="300">
        <textarea class="lf-textarea" name="content" rows="3" placeholder="Nội dung chi tiết (hỗ trợ đính kèm đoạn mã Python bên dưới)…" required maxlength="8500">${escForumHtml(composeDraft.content)}</textarea>
        <input type="text" class="lf-input mono" name="code" value="${escForumHtml(composeDraft.code)}" placeholder="Đoạn mã Python minh họa (tuỳ chọn, ví dụ: print(7 // 2))" maxlength="1400">
        <div class="lf-composer-actions">
          <button type="button" class="lf-btn-ghost" data-toggle-compose="0">Huỷ</button>
          <button type="submit" class="lf-btn-amber" ${st.submitting ? 'disabled' : ''}>${st.submitting ? 'Đang đăng…' : 'Đăng chủ đề lên diễn đàn'}</button>
        </div>
      </form>`
    : '';

  let listHtml = '';
  if (st.loading && !posts.length) {
    listHtml = `<div class="lf-loading-card">
      <b>Đang tải bài viết từ cộng đồng…</b>
      <p>Đang kết nối dữ liệu diễn đàn theo phiên học của bạn.</p>
    </div>`;
  } else if (st.authRequired) {
    listHtml = `<div class="lf-empty-state">
      <img src="/forum-lofi/svg/empty-forum.svg" alt="" width="130" height="100">
      <b>Chưa có phiên học trên trình duyệt này</b>
      <p>Để tránh tạo tài khoản khách tự động khi xem trang công khai, bạn hãy đăng nhập hoặc mở phiên khách bằng nút bên dưới.</p>
      <div class="lf-auth-actions">
        <button type="button" class="lf-btn-amber" data-guest-load="1">Vào xem bằng phiên khách</button>
        <a class="lf-btn-ghost" href="/login">Đăng nhập</a>
        <button type="button" class="lf-btn-ghost" data-toggle-compose="1">＋ Tạo chủ đề</button>
      </div>
    </div>`;
  } else if (st.error && !posts.length) {
    listHtml = `<div class="lf-empty-state">
      <img src="/forum-lofi/svg/empty-forum.svg" alt="" width="130" height="100">
      <b>Không tải được danh sách bài viết</b>
      <p>${escForumHtml(st.error)}</p>
      <div class="lf-auth-actions">
        <button type="button" class="lf-btn-amber" data-retry-forum="1">Thử lại</button>
      </div>
    </div>`;
  } else if (filtered.length) {
    listHtml = filtered
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

          <h4 class="lf-card-title">${escForumHtml(p.title || 'Chủ đề thảo luận')}</h4>
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
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              ${renderPostActions(p, currentUser, st)}
              <button type="button" class="lf-cmt-pill" data-open-post="${p.id}">
                💬 ${nCmt} bình luận
              </button>
            </div>
          </div>
          <div class="lf-card-reacts" data-stop-open="1">
            ${renderReactionBar('post', p.id, p)}
          </div>
        </article>`;
      })
      .join('');
    if (!query && st.total > posts.length) {
      listHtml += `<div class="lf-load-more-row">
        <button type="button" class="lf-btn-ghost" data-load-more-posts="1" ${st.loadingMore ? 'disabled' : ''}>
          ${st.loadingMore ? 'Đang tải thêm…' : `Tải thêm bài viết (${posts.length}/${st.total})`}
        </button>
      </div>`;
    }
  } else {
    listHtml = `<div class="lf-empty-state">
      <img src="/forum-lofi/svg/empty-forum.svg" alt="" width="130" height="100">
      <b>Chưa có bài viết phù hợp</b>
      <p>Thử đổi chuyên mục hoặc bấm “＋ Tạo chủ đề” để mở cuộc trò chuyện mới.</p>
    </div>`;
  }

  return `<div class="lf-forum-wrap">
    ${orientBarHtml}
    <!-- Banner chuyên mục đang chọn -->
    <div class="lf-hero-banner">
      <img class="lf-hero-img" src="${activeCatMeta.banner}" alt="">
      <div class="lf-hero-txt">
        <span class="lf-hero-eyebrow">DIỄN ĐÀN GÓC HỌC · 4 CHUYÊN MỤC</span>
        <h3>${catFilter === 'all' ? 'Cộng đồng Python Lofi Đêm' : escForumHtml(activeCatMeta.name)}</h3>
        <p>${catFilter === 'all' ? 'Hỏi bài, chia sẻ sổ tay, gỡ lỗi code & trao đổi cùng mọi người' : escForumHtml(activeCatMeta.desc)}</p>
      </div>
      <div class="lf-hero-btns">
        <button type="button" class="lf-btn-amber" data-toggle-compose="${st.composing ? '0' : '1'}">
          ${st.composing ? '✕ Đóng khung đăng' : '＋ Tạo chủ đề'}
        </button>
        <button type="button" class="lf-btn-ghost" data-retry-forum="1" title="Làm mới danh sách từ máy chủ">↻ Tải lại</button>
      </div>
    </div>

    ${renderAlertBanner(st.actionError || (posts.length ? st.error : null))}
    ${composerHtml}

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
        ${
          currentUser?.id != null
            ? `<button type="button" class="lf-sort-btn${st.mine ? ' active' : ''}" data-fmine="1">Của tôi</button>`
            : ''
        }
      </div>
    </div>

    <div class="lf-post-list">
      ${listHtml}
    </div>
  </div>`;
}

export function wireForumInteractions(
  root,
  st,
  getUserName,
  onUpdate,
  onToast,
  onRotate,
  extra = {},
) {
  if (!root) return;
  const api = extra?.api || null;
  const onTotalChange = extra?.onTotalChange;
  const baoLoi = (msg) => {
    if (msg && onToast) onToast(msg);
  };

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

  // Đóng thông báo lỗi
  root.querySelectorAll('[data-dismiss-alert]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.actionError = null;
      if (st.posts?.length) st.error = null;
      onUpdate();
    });
  });

  // Chặn click trên thanh cảm xúc hoặc nút hành động làm mở nhầm thẻ bài viết
  root.querySelectorAll('[data-stop-open]').forEach((el) => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });

  // Thử lại tải danh sách
  root.querySelectorAll('[data-retry-forum]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!api) return;
      onUpdate();
      await taiDanhSachBai(st, api);
      if (typeof onTotalChange === 'function') onTotalChange(st.total);
      onUpdate();
    });
  });

  // Người dùng bấm rõ ràng để vào xem bằng phiên khách
  root.querySelectorAll('[data-guest-load]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!api) return;
      st.loading = true;
      st.authRequired = false;
      onUpdate();
      const res = await taiDanhSachBai(st, api, { useWriteAuth: true });
      if (!res.ok && res.message) baoLoi(res.message);
      if (typeof onTotalChange === 'function') onTotalChange(st.total);
      onUpdate();
    });
  });

  // Tải thêm bài viết phân trang
  root.querySelectorAll('[data-load-more-posts]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!api || st.loadingMore) return;
      onUpdate();
      const res = await taiDanhSachBai(st, api, { append: true });
      if (!res.ok && res.message) baoLoi(res.message);
      onUpdate();
    });
  });

  // Lọc 4 chuyên mục
  root.querySelectorAll('[data-fcat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      st.category = btn.dataset.fcat || 'all';
      st.postId = null;
      st.page = 1;
      onUpdate();
      if (api) {
        const res = await taiDanhSachBai(st, api);
        if (typeof onTotalChange === 'function') onTotalChange(st.total);
        if (!res.stale) onUpdate();
      }
    });
  });

  // Sắp xếp
  root.querySelectorAll('[data-fsort]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      st.sort = btn.dataset.fsort || 'newest';
      st.page = 1;
      onUpdate();
      if (api) {
        const res = await taiDanhSachBai(st, api);
        if (!res.stale) onUpdate();
      }
    });
  });

  // Lọc bài viết của tôi
  root.querySelectorAll('[data-fmine]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      st.mine = !st.mine;
      st.page = 1;
      onUpdate();
      if (api) {
        const res = await taiDanhSachBai(st, api);
        if (!res.stale) onUpdate();
      }
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
      if (st.composing && !st.composeDraft) {
        st.composeDraft = {
          category: st.category === 'all' ? 'discuss' : st.category,
          title: '',
          content: '',
          code: '',
        };
      }
      st.actionError = null;
      onUpdate();
    });
  });

  // Lưu bản nháp khung tạo bài để xoay điện thoại hay gặp 429 không bị mất chữ
  const createForm = root.querySelector('#lfCreatePostForm');
  if (createForm) {
    const syncComposeDraft = () => {
      const fd = new FormData(createForm);
      st.composeDraft = {
        category: String(fd.get('category') || 'discuss'),
        title: String(fd.get('title') || ''),
        content: String(fd.get('content') || ''),
        code: String(fd.get('code') || ''),
      };
    };
    createForm.addEventListener('input', syncComposeDraft);
    createForm.addEventListener('change', syncComposeDraft);

    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (st.submitting) return;
      syncComposeDraft();
      const draft = st.composeDraft;
      const title = draft.title.trim();
      const content = draft.content.trim();
      const code = draft.code.trim();
      if (!title || (!content && !code)) return;

      if (!api?.write) {
        const uName = getUserName();
        const newPost = {
          id: Date.now(),
          category: draft.category || 'discuss',
          title,
          content,
          code,
          author: { name: uName, avatar: (uName.trim()[0] || 'K').toUpperCase() },
          createdAt: 'Vừa xong',
          my_reaction: null,
          reactions: taoCamXucRong(),
          comments: [],
        };
        st.posts.unshift(newPost);
        st.composing = false;
        st.postId = newPost.id;
        if (onToast) onToast('Đã đăng chủ đề thảo luận mới!');
        onUpdate();
        return;
      }

      onUpdate();
      const res = await guiTaoBai(st, api, draft);
      if (res.ok) {
        if (typeof onTotalChange === 'function') onTotalChange(st.total);
        if (onToast) onToast('Đã đăng chủ đề thảo luận mới!');
        if (!st.wide && onRotate) {
          onRotate(true);
        } else {
          onUpdate();
        }
      } else {
        baoLoi(res.message);
        onUpdate();
      }
    });
  }

  // Sửa bài viết
  root.querySelectorAll('[data-edit-post]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = Number(btn.dataset.editPost);
      const p = (st.posts || []).find((x) => Number(x.id) === pid);
      if (!p) return;
      st.editingPostId = pid;
      st.postId = pid;
      st.confirmDeletePostId = null;
      st.actionError = null;
      st.editPostDraft = {
        category: p.category || 'discuss',
        title: p.title || '',
        content: p.content || '',
        code: p.code || '',
      };
      if (!st.wide && onRotate) onRotate(true);
      else onUpdate();
    });
  });

  root.querySelectorAll('[data-cancel-edit-post]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.editingPostId = null;
      st.actionError = null;
      onUpdate();
    });
  });

  const editPostForm = root.querySelector('#lfEditPostForm');
  if (editPostForm) {
    const syncEditDraft = () => {
      const fd = new FormData(editPostForm);
      st.editPostDraft = {
        category: String(fd.get('category') || 'discuss'),
        title: String(fd.get('title') || ''),
        content: String(fd.get('content') || ''),
        code: String(fd.get('code') || ''),
      };
    };
    editPostForm.addEventListener('input', syncEditDraft);
    editPostForm.addEventListener('change', syncEditDraft);
    editPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (st.submitting || !api) return;
      syncEditDraft();
      const pid = Number(editPostForm.dataset.postId);
      onUpdate();
      const res = await guiSuaBai(st, api, pid, st.editPostDraft);
      if (res.ok) {
        if (onToast) onToast('Đã cập nhật bài viết!');
      } else {
        baoLoi(res.message);
      }
      onUpdate();
    });
  }

  // Xoá bài viết (2 bước trong DOM, không dùng window.confirm)
  root.querySelectorAll('[data-ask-del-post]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      st.confirmDeletePostId = Number(btn.dataset.askDelPost);
      onUpdate();
    });
  });
  root.querySelectorAll('[data-cancel-del-post]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      st.confirmDeletePostId = null;
      onUpdate();
    });
  });
  root.querySelectorAll('[data-confirm-del-post]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (st.submitting || !api) return;
      const pid = Number(btn.dataset.confirmDelPost);
      onUpdate();
      const res = await guiXoaBai(st, api, pid);
      if (res.ok) {
        if (typeof onTotalChange === 'function') onTotalChange(st.total);
        if (onToast) onToast('Đã xoá bài viết.');
      } else {
        baoLoi(res.message);
      }
      onUpdate();
    });
  });

  // Mở chi tiết bài viết
  root.querySelectorAll('[data-open-post]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      if (
        e.target.closest('[data-stop-open]') ||
        e.target.closest('[data-react-type]')
      ) {
        return;
      }
      const pid = Number(el.dataset.openPost);
      st.postId = pid;
      st.replyToId = null;
      st.editingPostId = null;
      st.confirmDeletePostId = null;
      st.actionError = null;
      if (!st.wide && onRotate) {
        onRotate(true);
      } else {
        onUpdate({ scrollTopZero: true });
      }
      if (api) {
        const res = await taiChiTietBai(st, api, pid);
        if (!res.ok && res.message && !st.authRequired) baoLoi(res.message);
        if (!res.stale && Number(st.postId) === pid) onUpdate();
      }
    });
  });

  // Xem thêm bình luận
  root.querySelectorAll('[data-load-more-comments]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!api || st.commentsLoadingMore) return;
      const pid = Number(btn.dataset.loadMoreComments);
      onUpdate();
      const res = await taiChiTietBai(st, api, pid, { appendComments: true });
      if (!res.ok && res.message) baoLoi(res.message);
      if (!res.stale) onUpdate();
    });
  });

  // Quay lại danh sách
  root.querySelectorAll('[data-fback]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.postId = null;
      st.replyToId = null;
      st.editingPostId = null;
      st.editingCommentId = null;
      st.confirmDeletePostId = null;
      st.confirmDeleteCommentId = null;
      st.actionError = null;
      onUpdate({ scrollTopZero: true });
    });
  });

  // Thả 1 trong 6 loại cảm xúc (trên bài viết hoặc bình luận)
  root.querySelectorAll('[data-react-type]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const kind = btn.dataset.reactKind;
      const id = Number(btn.dataset.reactId);
      const type = btn.dataset.reactType;
      const res = await guiCamXuc(st, api, kind, id, type, () => onUpdate());
      if (!res.ok && res.message) baoLoi(res.message);
      onUpdate();
    });
  });

  // Mở ô trả lời bình luận cha (1 cấp lồng)
  root.querySelectorAll('[data-reply-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = Number(btn.dataset.replyTo);
      st.replyToId = st.replyToId === cid ? null : cid;
      st.replyDraft = '';
      onUpdate();
    });
  });

  root.querySelectorAll('[data-cancel-reply]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.replyToId = null;
      st.replyDraft = '';
      onUpdate();
    });
  });

  // Sửa & xoá bình luận / phản hồi
  root.querySelectorAll('[data-edit-cmt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = Number(btn.dataset.editCmt);
      const target = timMucTieuCamXuc(st, 'comment', cid);
      st.editingCommentId = cid;
      st.editCommentDraft = target ? target.content : '';
      st.confirmDeleteCommentId = null;
      onUpdate();
    });
  });

  root.querySelectorAll('[data-cancel-edit-cmt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.editingCommentId = null;
      st.editCommentDraft = '';
      onUpdate();
    });
  });

  root.querySelectorAll('[data-edit-cmt-form]').forEach((form) => {
    const inp = form.querySelector('input[name="editCommentContent"]');
    if (inp) {
      inp.addEventListener('input', () => {
        st.editCommentDraft = inp.value;
      });
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (st.submitting || !api) return;
      const cid = Number(form.dataset.editCmtForm);
      const pid = Number(form.dataset.postId);
      const txt = inp ? inp.value.trim() : '';
      if (!txt) return;
      onUpdate();
      const res = await guiSuaBinhLuan(st, api, pid, cid, txt);
      if (res.ok) {
        if (onToast) onToast('Đã cập nhật bình luận!');
      } else {
        baoLoi(res.message);
      }
      onUpdate();
    });
  });

  root.querySelectorAll('[data-ask-del-cmt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.confirmDeleteCommentId = Number(btn.dataset.askDelCmt);
      onUpdate();
    });
  });

  root.querySelectorAll('[data-cancel-del-cmt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      st.confirmDeleteCommentId = null;
      onUpdate();
    });
  });

  root.querySelectorAll('[data-confirm-del-cmt]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (st.submitting || !api) return;
      const cid = Number(btn.dataset.confirmDelCmt);
      const pid = Number(btn.dataset.postId);
      onUpdate();
      const res = await guiXoaBinhLuan(st, api, pid, cid);
      if (res.ok) {
        if (onToast) onToast('Đã xoá bình luận.');
      } else {
        baoLoi(res.message);
      }
      onUpdate();
    });
  });

  // Gửi bình luận gốc
  const rootCmtForm = root.querySelector('#lfRootCommentForm');
  if (rootCmtForm) {
    const inp = root.querySelector('#lfRootCommentIn');
    if (inp) {
      inp.addEventListener('input', () => {
        st.commentDraft = inp.value;
      });
    }
    rootCmtForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (st.submitting) return;
      const pid = Number(rootCmtForm.dataset.postId);
      const txt = inp ? inp.value.trim() : '';
      if (!txt) return;

      if (!api?.write) {
        const p = (st.posts || []).find((x) => Number(x.id) === pid);
        if (!p) return;
        const uName = getUserName();
        p.comments = p.comments || [];
        p.comments.push({
          id: Date.now(),
          author: { name: uName, avatar: (uName.trim()[0] || 'K').toUpperCase() },
          createdAt: 'Vừa xong',
          content: txt,
          my_reaction: null,
          reactions: taoCamXucRong(),
          replies: [],
        });
        st.commentDraft = '';
        if (onToast) onToast('Đã gửi bình luận!');
        onUpdate();
        return;
      }

      st.commentDraft = txt;
      onUpdate();
      const res = await guiBinhLuan(st, api, pid, txt, null);
      if (res.ok) {
        if (onToast) onToast('Đã gửi bình luận!');
      } else {
        baoLoi(res.message);
      }
      onUpdate();
    });
  }

  // Gửi trả lời lồng (nested reply)
  root.querySelectorAll('[data-reply-form]').forEach((form) => {
    const inp = form.querySelector('input[name="replyContent"]');
    if (inp) {
      inp.addEventListener('input', () => {
        st.replyDraft = inp.value;
      });
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (st.submitting) return;
      const parentId = Number(form.dataset.replyForm);
      const fd = new FormData(form);
      const txt = String(fd.get('replyContent') || '').trim();
      if (!txt) return;
      const pid = Number(st.postId);

      if (!api?.write) {
        const uName = getUserName();
        for (const p of st.posts || []) {
          const parent = (p.comments || []).find((c) => Number(c.id) === parentId);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push({
              id: Date.now(),
              parentCommentId: parent.id,
              author: { name: uName, avatar: (uName.trim()[0] || 'K').toUpperCase() },
              createdAt: 'Vừa xong',
              content: txt,
              my_reaction: null,
              reactions: taoCamXucRong(),
            });
            break;
          }
        }
        st.replyToId = null;
        st.replyDraft = '';
        if (onToast) onToast('Đã gửi phản hồi lồng!');
        onUpdate();
        return;
      }

      st.replyDraft = txt;
      onUpdate();
      const res = await guiBinhLuan(st, api, pid, txt, parentId);
      if (res.ok) {
        if (onToast) onToast('Đã gửi phản hồi lồng!');
      } else {
        baoLoi(res.message);
      }
      onUpdate();
    });
  });
}
