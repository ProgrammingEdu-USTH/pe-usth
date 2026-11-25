'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './computer.module.css';

/** Khung bọc laptop tĩnh ở public/goc-hoc/may-tinh; "tắt máy" đưa về phòng học. */
export default function ComputerFrame() {
  const router = useRouter();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: unknown } | null)?.type === 'pe-mac:off') router.push('/');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Góc học
      </Link>
      <iframe className={styles.frame} src="/goc-hoc/may-tinh/index.html" title="Máy tính Góc học" />
      <p className={styles.note}>Máy tính vẽ cho màn rộng. Trên điện thoại, hãy xoay ngang.</p>
    </main>
  );
}
