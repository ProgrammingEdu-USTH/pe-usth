'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

import { STEPS } from '@/lib/quan-may/progress';

import styles from './quan-may.module.css';

export const STEP_NAMES = ['Đoán', 'Xem mẫu', 'Tự làm', 'Vì sao', 'Quyết định', 'Đúc kết'];

export type Metric = { label: string; value: string; tone?: 'ok' | 'bad' };

export type FrameProps = {
  episode: string;
  step: number;
  stepNames?: string[];
  /** Một câu: màn này cần làm gì. Luôn hiện. */
  task: string;
  title: string;
  metrics: Metric[];
  /** Cảnh sống và thao tác. */
  stage: React.ReactNode;
  /** Tối đa vài câu dẫn. */
  children: React.ReactNode;
  /** "Vừa thay đổi": điều lần chạm gần nhất làm ra. */
  changes: string[];
  /** Phản hồi của lượt chạy, đọc một lần cho trình đọc màn hình. */
  feedback?: { tone: 'ok' | 'bad' | 'info'; text: string } | null;
  onBack?: () => void;
  hint?: { label: string; onClick: () => void } | null;
  primary: { label: string; disabled?: boolean; onClick?: () => void; href?: string };
};

export default function Frame(props: FrameProps) {
  const { step, primary } = props;
  const names = props.stepNames ?? STEP_NAMES;
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const status = useRef<HTMLDivElement>(null);
  const feedbackText = props.feedback?.text;

  // Phản hồi mới phải nằm trong khung nhìn, không bị thanh đáy che.
  useEffect(() => {
    if (feedbackText) status.current?.scrollIntoView({ block: 'nearest' });
  }, [feedbackText]);

  // Đổi bước: lên đầu trang và đưa tiêu điểm vào tiêu đề. Lần dựng đầu thì không.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/quan-may?ds=1" className={styles.exit}>
          Thoát
        </Link>
        <p className={styles.episode}>{props.episode}</p>
        <p className={styles.count}>
          Bước {step}/{STEPS}
          <span className={styles.dots} aria-hidden="true">
            {names.map((n, i) => (
              <i key={n} data-on={i + 1 === step ? '' : undefined} data-past={i + 1 < step ? '' : undefined} />
            ))}
          </span>
        </p>
      </header>

      <p className={styles.task}>
        <b>Việc cần làm:</b> {props.task}
      </p>

      <main className={styles.grid}>
        <section className={styles.text}>
          <p className={styles.tag}>{names[step - 1]}</p>
          <h1 ref={heading} tabIndex={-1}>
            {props.title}
          </h1>
          {props.children}
        </section>

        <section className={styles.scene} aria-label="Quầy Quán Mây">
          <dl className={styles.metrics}>
            {props.metrics.map((m) => (
              <div key={m.label} data-tone={m.tone}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
          {props.stage}
          <div role="status" ref={status} className={styles.status}>
            {props.feedback && (
              <p className={styles.feedback} data-tone={props.feedback.tone}>
                {props.feedback.text}
              </p>
            )}
          </div>
        </section>

        {/* Đứng sau cảnh trên điện thoại: thao tác trước, chữ giải thích sau. */}
        {props.changes.length > 0 && (
          <div className={styles.changes}>
            <p className={styles.tag}>Vừa thay đổi</p>
            <ul>
              {props.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className={styles.bottom}>
        <button type="button" className={styles.quiet} onClick={props.onBack} disabled={!props.onBack}>
          Quay lại
        </button>
        {props.hint && (
          <button type="button" className={styles.quiet} onClick={props.hint.onClick}>
            {props.hint.label}
          </button>
        )}
        {primary.href ? (
          <Link className={styles.primary} href={primary.href}>
            {primary.label} →
          </Link>
        ) : (
          <button type="button" className={styles.primary} onClick={primary.onClick} disabled={primary.disabled}>
            {primary.label} →
          </button>
        )}
      </footer>
    </div>
  );
}

export function Choices({
  legend,
  options,
  value,
  onPick,
  locked,
}: {
  legend: string;
  options: { value: string; label: string; note?: string; correct?: boolean }[];
  value: string;
  onPick: (value: string) => void;
  /** Đã trả lời: không đổi được nữa, và hiện lời giải thích của mọi phương án. */
  locked?: boolean;
}) {
  return (
    <fieldset className={styles.choices}>
      <legend>{legend}</legend>
      {options.map((o) => {
        const picked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={picked}
            aria-disabled={locked || undefined}
            data-mark={locked ? (o.correct ? 'ok' : picked ? 'bad' : undefined) : undefined}
            onClick={() => !locked && onPick(o.value)}
          >
            <span>{o.label}</span>
            {locked && o.note && (
              <small>
                {o.correct ? 'Đúng. ' : picked ? 'Bạn đã chọn, chưa đúng. ' : 'Chưa đúng. '}
                {o.note}
              </small>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
