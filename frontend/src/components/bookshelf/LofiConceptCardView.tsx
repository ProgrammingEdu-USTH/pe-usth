'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { LofiFeedbackBanner } from '@/components/ui';
import { stripSqlHtml, type SqlConceptCard } from '@/lib/lofi-sql-adapter';
import { loadSqlConceptCards } from '@/lib/lofi-sql-loader';

import styles from './LofiConceptCardView.module.css';

function renderInlineTokens(raw?: string): React.ReactNode {
  const clean = stripSqlHtml(raw);
  if (!clean) return null;
  const parts = clean.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className={styles.inlineCode}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function labelCourse(courseId?: string): string {
  if (courseId === 'db_design_tc') return 'SQL · Trung cấp';
  if (courseId === 'db_design_nc') return 'SQL · Nâng cao';
  return 'SQL · Cơ bản';
}

export default function LofiConceptCardView({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<SqlConceptCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      setLoading(true);
      setError(null);
      setPickedIdx(null);

      try {
        const cards = await loadSqlConceptCards();
        if (!alive) return;
        const found = cards.find((item) => item.id === cardId) ?? null;
        setCard(found);
      } catch (err: unknown) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Không tải được hồ sơ khái niệm.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cardId]);

  const backHref = card?.back_href || '/bookshelf/sql';
  const pickedOpt =
    pickedIdx !== null && card?.quiz?.options ? card.quiz.options[pickedIdx] ?? null : null;

  return (
    <main className={styles.page} data-course="sql">
      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <Link href={backHref} className={styles.backLink}>
            ← Về tủ sách SQL
          </Link>
          {card && <span className={styles.coursePill}>{labelCourse(card.courseId)}</span>}
        </div>

        <article className={styles.sheet}>
          {loading && <div className={styles.stateBox}>Đang mở hồ sơ khái niệm…</div>}

          {!loading && error && (
            <div className={styles.stateBox}>
              <LofiFeedbackBanner variant="error" title="Không tải được dữ liệu" message={error} />
              <Link href="/bookshelf/sql" className={styles.backLink}>
                Quay lại tủ sách SQL
              </Link>
            </div>
          )}

          {!loading && !error && !card && (
            <div className={styles.stateBox}>
              <p>Không tìm thấy hồ sơ khái niệm mã {cardId}.</p>
              <Link href="/bookshelf/sql" className={styles.backLink}>
                Quay lại tủ sách SQL
              </Link>
            </div>
          )}

          {!loading && !error && card && (
            <>
              <header className={styles.header}>
                {card.eyebrow && <div className={styles.eyebrow}>{stripSqlHtml(card.eyebrow)}</div>}
                <h1 className={styles.title}>{stripSqlHtml(card.title)}</h1>
                {card.intro && <p className={styles.intro}>{renderInlineTokens(card.intro)}</p>}
              </header>

              {card.sections && card.sections.length > 0 && (
                <section className={styles.sections} aria-label="Nội dung khái niệm">
                  {card.sections.map((sec, idx) => (
                    <div
                      key={`${sec.heading}-${idx}`}
                      className={`${styles.sectionCard} ${
                        sec.variant === 'quote' ? styles.sectionQuote : ''
                      }`}
                    >
                      <h2 className={styles.sectionHeading}>{stripSqlHtml(sec.heading)}</h2>
                      <p className={styles.sectionBody}>{renderInlineTokens(sec.body)}</p>
                      {sec.source && (
                        <div className={styles.sectionSource}>{stripSqlHtml(sec.source)}</div>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {card.quiz && card.quiz.options && card.quiz.options.length > 0 && (
                <section className={styles.quizBox} aria-label="Câu hỏi củng cố">
                  <div className={styles.quizLabel}>Kiểm tra nhanh</div>
                  <p className={styles.quizQuestion}>{renderInlineTokens(card.quiz.question)}</p>
                  <div className={styles.quizOptions}>
                    {card.quiz.options.map((opt, idx) => {
                      const label = opt.label ?? opt.text ?? `Lựa chọn ${idx + 1}`;
                      const isPicked = pickedIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`${styles.quizOptionBtn} ${
                            isPicked ? styles.quizOptionPicked : ''
                          }`}
                          onClick={() => setPickedIdx(idx)}
                          aria-pressed={isPicked}
                        >
                          {renderInlineTokens(label)}
                        </button>
                      );
                    })}
                  </div>
                  {pickedOpt && (
                    <LofiFeedbackBanner
                      variant={pickedOpt.correct ? 'success' : 'error'}
                      message={renderInlineTokens(
                        pickedOpt.feedback ??
                          pickedOpt.explanation ??
                          (pickedOpt.correct ? 'Chính xác.' : 'Chưa chính xác, thử chọn lại nhé.'),
                      )}
                    />
                  )}
                </section>
              )}

              <footer className={styles.footer}>
                {card.source && (
                  <p className={styles.source}>Nguồn: {stripSqlHtml(card.source)}</p>
                )}
                <div className={styles.actions}>
                  {card.cta && (
                    <Link href={card.cta.href} className={styles.ctaBtn}>
                      {stripSqlHtml(card.cta.label)} →
                    </Link>
                  )}
                  <Link href={backHref} className={styles.backLink}>
                    Về tủ sách SQL
                  </Link>
                </div>
              </footer>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
