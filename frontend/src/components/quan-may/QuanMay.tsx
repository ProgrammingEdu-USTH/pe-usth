'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { averageWait, schedule, type EpisodeId } from '@/lib/quan-may/episodes';
import { currentRun, freshProgress, type EpisodeProgress } from '@/lib/quan-may/progress';

import OrderEpisode from './OrderEpisode';
import TillEpisode from './TillEpisode';
import { useDispatch, useSave } from './useSave';
import styles from './quan-may.module.css';

const LIST: { id: EpisodeId; title: string; problem: string }[] = [
  { id: 'xep-don', title: 'Xếp đơn giờ đông', problem: 'Một người pha, năm đơn: xếp sao cho khách chờ ít nhất?' },
  { id: 'ket-hut-tien', title: 'Két bị hụt tiền', problem: 'Máy ghi đủ đơn mà két thiếu tiền. Hỏi dữ liệu để tìm ra.' },
];

function status(p: EpisodeProgress | undefined): string {
  if (!p) return 'Chưa làm';
  if (p.best === 'done') return 'Đã xong';
  if (p.best === 'seen') return 'Đã xem lời giải';
  return 'Đang làm';
}

/** Lần chờ đạt gần nhất của tập xếp đơn; chưa chạy thì không dựng số. */
function reachedWait(p: EpisodeProgress | undefined): string | null {
  if (!p || !currentRun(p)?.ok) return null;
  return averageWait(schedule(p.work)).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

export function Episode({ id }: { id: EpisodeId }) {
  const save = useSave();
  const send = useDispatch(id);
  if (!save) return <p className={styles.loading}>Đang mở Quán Mây…</p>;
  const p = save.episodes[id] ?? freshProgress();
  return id === 'xep-don' ? (
    <OrderEpisode p={p} send={send} />
  ) : (
    <TillEpisode p={p} send={send} lastWait={reachedWait(save.episodes['xep-don'])} />
  );
}

/**
 * Người mới đi thẳng vào bài. Phải đổi ĐỊA CHỈ chứ không vẽ bài tại chỗ: vẽ tại
 * chỗ thì lần chạm đầu tiên ghi tiến độ và trang này quay về danh sách.
 */
function StartFirst() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/quan-may/xep-don');
  }, [router]);
  return <p className={styles.loading}>Đang mở Quán Mây…</p>;
}

const noSubscribe = () => () => {};

/** Người mới vào thẳng bước 1 của tập đầu; người đã có tiến độ thấy danh sách. */
export function Home() {
  const save = useSave();
  const wantsList = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).has('ds'),
    () => false,
  );
  if (!save) return <p className={styles.loading}>Đang mở Quán Mây…</p>;
  if (!wantsList && Object.keys(save.episodes).length === 0) return <StartFirst />;
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.exit}>
          Góc học
        </Link>
        <p className={styles.episode}>Quán Mây · bản thử nghiệm</p>
      </header>
      <main className={styles.list}>
        <h1>Chọn một chuyện ở quán</h1>
        <ul>
          {LIST.map((e, i) => (
            <li key={e.id}>
              <Link href={`/quan-may/${e.id}`}>
                <span className={styles.tag}>Tập {i + 1} · {status(save.episodes[e.id])}</span>
                <b>{e.title}</b>
                <span>{e.problem}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
