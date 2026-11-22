'use client';

// Trang lỗi runtime của riêng dự án — giao diện Lofi tím tối dịu mắt.
import Link from 'next/link';
import { useEffect, useState } from 'react';

import PageStyles from '@/components/PageStyles';
import { hauToNhap, soBaiTuTruyVan, TIEN_TO_NHAP } from '@/lib/nhap-bai';

import styles from './error.module.css';

const DUONG_VE = ['/bookshelf/python', '/'] as const;

function nhapCuaBaiNay(): string[] {
  try {
    const duong = globalThis.location?.pathname ?? '';
    const m = /\/lesson\/([^/?#]+)/.exec(duong);
    if (!m) return [];
    const q = new URLSearchParams(globalThis.location?.search ?? '');
    const hau = hauToNhap(m[1], soBaiTuTruyVan(q.get('lesson') ?? undefined));
    const ra: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${TIEN_TO_NHAP}:`) && k.endsWith(hau)) ra.push(k);
    }
    return ra;
  } catch {
    return [];
  }
}

export default function TrangLoi({ reset }: { error: Error; reset: () => void }) {
  const [nhap, setNhap] = useState<string[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setNhap(nhapCuaBaiNay()), 0);
    return () => clearTimeout(id);
  }, []);

  const xoaNhapRoiTaiLai = () => {
    try {
      for (const k of nhap) localStorage.removeItem(k);
    } catch {
      // Mất nháp không được phép làm hỏng đường thoát: vẫn tải lại.
    }
    globalThis.location?.reload();
  };

  return (
    <>
      <PageStyles hrefs={['/static/css/bookshelf-tokens.css']} />
      <main className={styles.wrap}>
        <section className={styles.card}>
          <h1 className={styles.tieuDe}>Trang này vừa gặp lỗi</h1>
          <p className={styles.than}>
            Một phần giao diện không dựng được. Tiến độ đã hoàn thành của bạn nằm
            trên máy chủ nên vẫn còn nguyên — thử lại, hoặc chọn một đường dưới
            đây.
          </p>
          <nav className={styles.hangNut}>
            <button className={styles.nutChinh} type="button" onClick={reset}>
              Thử lại
            </button>
            <Link className={styles.nutPhu} href={DUONG_VE[0]}>
              Về khoá đang học
            </Link>
            <Link className={styles.nutPhu} href={DUONG_VE[1]}>
              Về trang chủ
            </Link>
          </nav>

          {nhap.length > 0 && (
            <div className={styles.nhap}>
              <p className={styles.thanNho}>
                Nếu bấm Thử lại mà vẫn lỗi: bản nháp đã lưu của bài này có thể là
                nguyên nhân. Xoá nó thường mở lại được bài, nhưng{' '}
                <strong>code bạn đang viết trong bài này sẽ mất</strong>.
              </p>
              <button
                className={styles.nutPhu}
                type="button"
                onClick={xoaNhapRoiTaiLai}
              >
                Xoá nháp của bài này rồi tải lại
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
