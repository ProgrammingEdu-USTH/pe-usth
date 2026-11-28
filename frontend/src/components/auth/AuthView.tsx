'use client';

// Trang đăng nhập / đăng ký — MỘT component cho cả hai route (`/login`, `/register`).
//
// Diện mạo lấy ý từ nhánh `test` (thẻ kem một cột, "chìa khoá mở cửa Bàn học") nhưng viết lại cho khớp hợp đồng của
// `main`: bản đó là xem trước UI (không gọi API), ô nhập 13px (iOS tự phóng trang khi focus < 16px), mật khẩu "tối thiểu 6"
// trong khi backend đòi 8, chỉ nhận email dù backend nhận cả số điện thoại, và có nút Google/Facebook/Quên mật khẩu chưa
// nối gì. Ở đây chỉ có thứ chạy được; thứ chưa có (Google/Facebook/quên mật khẩu) KHÔNG dựng nút giả.
//
// KHÔNG gọi API khi mở trang: đây là trang CÔNG KHAI, `apiFetch` gặp 401 sẽ tự tạo tài khoản khách (xem 404). Chỉ gọi
// khi người học bấm gửi, và bằng `fetch` trần cho login/register — không bằng `apiFetch`.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useSyncExternalStore, type FormEvent } from 'react';

import { accessDangLuu } from '@/lib/api';
import { dangKy, dangNhap, dangXuat, emailTuToken, MAT_KHAU_TOI_THIEU, nhanTaiKhoan } from '@/lib/auth-session';

import styles from './auth.module.css';

type Mode = 'login' | 'register';

// Đọc localStorage mà không qua effect: server luôn thấy `false`, client đọc lại sau hydrate (không lệch HTML).
const khongTheoDoi = () => () => {};
const docEmail = () => emailTuToken(accessDangLuu()) ?? '';
const mayChu = () => '';

export default function AuthView({ mode }: { mode: Mode }) {
  const router = useRouter();
  const id = useId();
  const dk = mode === 'register';
  const email = useSyncExternalStore(khongTheoDoi, docEmail, mayChu);
  const khach = email.endsWith('@guest.local');
  const that = email !== '' && !khach;
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [hien, setHien] = useState(false);

  async function guiDi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (dangGui) return;
    const d = new FormData(e.currentTarget);
    const g = (k: string) => String(d.get(k) ?? '');
    setLoi('');
    setDangGui(true);
    const kq = dk
      ? await dangKy({ ten: g('ten'), dinhDanh: g('dinhDanh'), matKhau: g('matKhau'), nhapLai: g('nhapLai') })
      : await dangNhap(g('dinhDanh'), g('matKhau'));
    if (kq.ok) {
      router.replace('/');
      return;
    }
    setLoi(kq.loi);
    setDangGui(false);
  }

  async function thoat() {
    setDangGui(true);
    await dangXuat();
    router.replace('/');
  }

  // Đã có tài khoản thật thì không hiện form: người này cần ĐĂNG XUẤT (đổi tài khoản), không cần đăng nhập thêm.
  if (that) {
    return (
      <main className={styles.wrap} data-tv-surface="">
        <Link className={styles.ve} href="/">
          ← Về Góc học
        </Link>
        <section className={styles.the} aria-labelledby={`${id}-tieude`}>
          <h1 className={styles.tieuDe} id={`${id}-tieude`}>
            Bạn đang đăng nhập
          </h1>
          <p className={styles.moTa}>
            Tài khoản: <strong>{nhanTaiKhoan(email)}</strong>
          </p>
          <button className={styles.nutChinh} type="button" onClick={thoat} disabled={dangGui}>
            {dangGui ? 'Đang thoát…' : 'Đăng xuất'}
          </button>
        </section>
      </main>
    );
  }

  const kieuMk = hien ? 'text' : 'password';

  return (
    <main className={styles.wrap} data-tv-surface="">
      <Link className={styles.ve} href="/">
        ← Về Góc học
      </Link>
      <section className={styles.the} aria-labelledby={`${id}-tieude`}>
        <h1 className={styles.tieuDe} id={`${id}-tieude`}>
          {dk ? 'Tạo tài khoản' : 'Đăng nhập'}
        </h1>
        <p className={styles.moTa}>
          {dk ? 'Lưu tiến độ học và XP của bạn trên mọi thiết bị.' : 'Vào lại bàn học với tài khoản của bạn.'}
        </p>

        {khach && (
          <p className={styles.ghiChu} role="note">
            {dk
              ? 'Bạn đang học với tài khoản khách. Tạo tài khoản ở đây sẽ GIỮ nguyên tiến độ và XP hiện tại.'
              : 'Bạn đang học với tài khoản khách. Đăng nhập một tài khoản có sẵn sẽ chuyển sang tiến độ của tài khoản đó — tiến độ khách này không được gộp vào. Muốn giữ tiến độ hiện tại thì tạo tài khoản mới.'}
          </p>
        )}

        <form className={styles.form} onSubmit={guiDi} noValidate aria-busy={dangGui}>
          {dk && (
            <div className={styles.truong}>
              <label htmlFor={`${id}-ten`}>Tên của bạn</label>
              <input id={`${id}-ten`} className={styles.oNhap} name="ten" type="text" autoComplete="name" maxLength={100} required />
            </div>
          )}
          <div className={styles.truong}>
            <label htmlFor={`${id}-dd`}>Email hoặc số điện thoại</label>
            <input
              id={`${id}-dd`}
              className={styles.oNhap}
              name="dinhDanh"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>
          <div className={styles.truong}>
            <label htmlFor={`${id}-mk`}>Mật khẩu</label>
            <div className={styles.hangMk}>
              <input
                id={`${id}-mk`}
                className={styles.oNhap}
                name="matKhau"
                type={kieuMk}
                autoComplete={dk ? 'new-password' : 'current-password'}
                minLength={dk ? MAT_KHAU_TOI_THIEU : undefined}
                required
              />
              <button
                type="button"
                className={styles.nutHien}
                aria-pressed={hien}
                onClick={() => setHien((h) => !h)}
              >
                {hien ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {dk && <small className={styles.goiY}>Ít nhất {MAT_KHAU_TOI_THIEU} ký tự.</small>}
          </div>
          {dk && (
            <div className={styles.truong}>
              <label htmlFor={`${id}-nl`}>Nhập lại mật khẩu</label>
              <input id={`${id}-nl`} className={styles.oNhap} name="nhapLai" type={kieuMk} autoComplete="new-password" required />
            </div>
          )}

          <div role="alert" aria-live="assertive">
            {loi && <p className={styles.loi}>{loi}</p>}
          </div>

          <button className={styles.nutChinh} type="submit" disabled={dangGui}>
            {dangGui ? 'Đang gửi…' : dk ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <p className={styles.chuyen}>
          {dk ? (
            <>
              Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
            </>
          ) : (
            <>
              Chưa có tài khoản? <Link href="/register">Tạo tài khoản</Link>
            </>
          )}
        </p>
        <p className={styles.chuyen}>
          <Link href="/">Học thử ngay, không cần tài khoản</Link>
        </p>
      </section>
    </main>
  );
}
