/**
 * Đăng nhập / đăng ký / nâng khách thành tài khoản — phần KHÔNG React, để node test được.
 *
 * VÌ SAO ĐĂNG KÝ CÓ HAI ĐƯỜNG (`/auth/register` và `/api/auth/upgrade`): frontend này cho mọi trình duyệt tự nhận một
 * tài khoản KHÁCH (`apiFetch` → POST /auth/guest) và học ngay, tiến độ lưu theo `user_id` của khách. Nếu trang đăng
 * ký luôn gọi `/auth/register` thì nó tạo MỘT user MỚI: tiến độ và XP ở lại tài khoản khách, người học "đăng ký xong
 * thấy mình về 0". `POST /api/auth/upgrade` (BE12; nằm DƯỚI `/api` vì gateway chỉ để ở gốc các path auth kế thừa từ Django, xem PREFIX_EXCLUDED) UPDATE chính hàng của khách nên `user_id` giữ nguyên và tiến độ đi theo.
 * Khách được nhận ra bằng email `@guest.local` trong payload của access token (mọi khách đều có, xem AuthService.guest).
 *
 * Đăng NHẬP một tài khoản có sẵn thì KHÔNG gộp tiến độ khách vào — backend cố ý không gộp (trùng dữ liệu thì không
 * biết giữ bên nào). Trang phải nói điều đó ra (AuthView), không im lặng.
 */
import { accessDangLuu, apiFetch, apiOrigin, luuPhienMoi, xoaPhien } from './api.ts';

/** Chép NGUYÊN từ `src/auth/dto/register.dto.ts` (backend). Test đọc cả hai tệp và đòi bằng nhau. */
export const PHONE_REGEX = /^(0\d{9}|\+\d{1,3}\d{9})$/;
export const MAT_KHAU_TOI_THIEU = 8;
export const MAT_KHAU_TOI_DA = 128;
export const TEN_TOI_DA = 100;

export type FormDangKy = { ten: string; dinhDanh: string; matKhau: string; nhapLai: string };
export type KetQua = { ok: true; nangCap: boolean } | { ok: false; loi: string };

const MANG =
  'Không kết nối được máy chủ. Nếu máy chủ vừa được đánh thức thì đợi khoảng 30 giây rồi thử lại.';
const KHONG_PHIEN = 'Máy chủ không trả phiên đăng nhập. Thử lại sau ít phút.';

/** Email trong payload của access token — chỉ ĐỌC, không kiểm chữ ký (quyền do server quyết) — hoặc null nếu không đọc được. */
export function emailTuToken(access: string | null | undefined): string | null {
  if (!access) return null;
  try {
    const payload = access.split('.')[1];
    if (!payload) return null;
    const email = (JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: unknown }).email;
    return typeof email === 'string' ? email : null;
  } catch {
    return null;
  }
}

export type LoaiTaiKhoan = 'khong' | 'khach' | 'that';

/** Không có phiên / tài khoản khách (email `@guest.local`) / tài khoản thật. */
export function loaiTaiKhoan(access: string | null | undefined): LoaiTaiKhoan {
  const email = emailTuToken(access);
  return email === null ? 'khong' : email.endsWith('@guest.local') ? 'khach' : 'that';
}

/** Access token này là của tài khoản KHÁCH? */
export function laKhach(access: string | null | undefined): boolean {
  return loaiTaiKhoan(access) === 'khach';
}

/** Nhãn hiện cho người học: người đăng ký bằng số điện thoại có email giả `<sđt>@phone.local` — chỉ hiện số. */
export function nhanTaiKhoan(email: string): string {
  return email.replace(/@phone\.local$/, '');
}

/** Câu báo lỗi cho người học: ưu tiên câu của backend (`error.message`, chuỗi hoặc mảng), rồi mới tới câu theo mã. */
export function loiTuPhanHoi(status: number, body: unknown): string {
  const m = (body as { error?: { message?: unknown } } | null)?.error?.message;
  const text = Array.isArray(m)
    ? m.filter((x): x is string => typeof x === 'string').join(' · ')
    : typeof m === 'string'
      ? m
      : '';
  if (text) return text;
  if (status === 401) return 'Email/số điện thoại hoặc mật khẩu không đúng';
  if (status === 429) return 'Thử quá nhiều lần. Đợi vài phút rồi thử lại.';
  if (status >= 500) return 'Máy chủ đang bận. Thử lại sau ít phút.';
  return 'Chưa thực hiện được. Thử lại sau.';
}

/** Kiểm trước khi gọi mạng — cùng luật với backend để người học khỏi chờ một vòng chỉ để nghe "mật khẩu ngắn". */
export function kiemTraDangKy(f: FormDangKy): string | null {
  const ten = f.ten.trim();
  const d = f.dinhDanh.trim();
  if (!ten) return 'Nhập tên của bạn.';
  if (ten.length > TEN_TOI_DA) return `Tên tối đa ${TEN_TOI_DA} ký tự.`;
  if (!d) return 'Nhập email hoặc số điện thoại.';
  if (!d.includes('@') && !PHONE_REGEX.test(d)) {
    return 'Số điện thoại phải có 10 số (VD: 0912345678) hoặc +mã quốc gia và 9 số.';
  }
  if (f.matKhau.length < MAT_KHAU_TOI_THIEU) return `Mật khẩu phải có ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.`;
  if (f.matKhau.length > MAT_KHAU_TOI_DA) return `Mật khẩu tối đa ${MAT_KHAU_TOI_DA} ký tự.`;
  if (f.matKhau !== f.nhapLai) return 'Hai mật khẩu chưa giống nhau.';
  return null;
}

/** Body gửi lên: có `@` là email, không thì số điện thoại (backend đòi ít nhất một trong hai). */
export function soanDangKy(f: FormDangKy): Record<string, string> {
  const d = f.dinhDanh.trim();
  return { name: f.ten.trim(), password: f.matKhau, ...(d.includes('@') ? { email: d } : { phone: d }) };
}

const JSON_POST = {
  method: 'POST',
  credentials: 'include' as const, // refresh token là cookie httpOnly do backend đặt: không có dòng này thì cookie bị bỏ
  headers: { 'Content-Type': 'application/json' },
};

async function xuLy(res: Response, nangCap: boolean): Promise<KetQua> {
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, loi: loiTuPhanHoi(res.status, body) };
  return luuPhienMoi(body) ? { ok: true, nangCap } : { ok: false, loi: KHONG_PHIEN };
}

export async function dangNhap(dinhDanh: string, matKhau: string): Promise<KetQua> {
  const d = dinhDanh.trim();
  if (!d || !matKhau) return { ok: false, loi: 'Nhập email hoặc số điện thoại và mật khẩu.' };
  try {
    // Backend nhận MỘT định danh ở field `email` rồi tự phân biệt email/số điện thoại (AuthService.login).
    const res = await fetch(`${apiOrigin()}/auth/login`, {
      ...JSON_POST,
      body: JSON.stringify({ email: d, password: matKhau }),
    });
    return await xuLy(res, false);
  } catch {
    return { ok: false, loi: MANG };
  }
}

export async function dangKy(f: FormDangKy, access: string | null = accessDangLuu()): Promise<KetQua> {
  const sai = kiemTraDangKy(f);
  if (sai) return { ok: false, loi: sai };
  const nangCap = laKhach(access);
  try {
    const opts = { ...JSON_POST, body: JSON.stringify(soanDangKy(f)) };
    // `apiFetch` (không phải fetch trần) cho upgrade: nó đính Bearer của khách và tự refresh nếu access đã hết hạn.
    const res = nangCap ? await apiFetch('/api/auth/upgrade', opts) : await fetch(`${apiOrigin()}/auth/register`, opts);
    return await xuLy(res, nangCap);
  } catch {
    return { ok: false, loi: MANG };
  }
}

/**
 * Đăng xuất: thu hồi chuỗi phiên ở server (cookie refresh httpOnly đi kèm nhờ `credentials: 'include'`), rồi xoá phiên ở máy.
 * Mất mạng thì VẪN xoá phiên ở máy — người học bấm "Đăng xuất" thì không được còn bị coi là đã đăng nhập. Sau đó lời gọi API
 * kế tiếp tự nhận một tài khoản khách MỚI (apiFetch), tức tiến độ của tài khoản vừa thoát không dính sang phiên này.
 */
export async function dangXuat(): Promise<void> {
  try {
    await fetch(`${apiOrigin()}/auth/logout`, { ...JSON_POST, body: '{}' });
  } catch {
    /* ngoại tuyến: vẫn xoá phiên ở máy */
  }
  xoaPhien();
}
