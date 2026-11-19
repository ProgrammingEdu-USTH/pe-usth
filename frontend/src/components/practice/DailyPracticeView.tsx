'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useCodeRunner } from '@/components/python-studio/useCodeRunner';
import {
  createDailyRun,
  fetchDailyPracticeSession,
  isDailyQuizResolved,
  pickDailyQuizOption,
  recordDailyCodeRun,
  summarizeDailyRun,
  visibleCorrectIndex,
  visibleExplanation,
  type DailyCodeCell,
  type DailyPracticeSession,
  type DailyQuizCell,
  type DailyRunCell,
} from '@/lib/daily-practice';
import ws from '../goc-hoc/lofi-workspace.module.css';
import dp from './daily-practice.module.css';

export interface DailyPracticeViewProps {
  shellRef?: React.RefObject<HTMLDivElement | null>;
  onBackToLesson: () => void;
  onEarnXp?: (delta: number) => void;
}

const STICKY_BG_CLASSES = [dp.stickyBg0, dp.stickyBg1, dp.stickyBg2, dp.stickyBg3];

export function DailyPracticeView({
  shellRef,
  onBackToLesson,
  onEarnXp,
}: DailyPracticeViewProps) {
  const runner = useCodeRunner({ enabled: true });

  const [session, setSession] = useState<DailyPracticeSession | null>(null);
  const [sourceKind, setSourceKind] = useState<'mock' | 'api'>('mock');
  const [cells, setCells] = useState<DailyRunCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemIdx, setItemIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hintsOpen, setHintsOpen] = useState<Record<string, boolean>>({});
  const [solutionOpen, setSolutionOpen] = useState<Record<string, boolean>>({});
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchDailyPracticeSession({ fetcher: apiFetch });
        if (cancelled) return;
        setSession(res.session);
        setSourceKind(res.source);
        setCells(createDailyRun(res.session));
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Không thể nạp dữ liệu ôn tập hằng ngày.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const handleRestartSession = useCallback(() => {
    if (runner.running) {
      runner.cancel();
    }
    setLoading(true);
    setError(null);
    setFinished(false);
    setItemIdx(0);
    setHintsOpen({});
    setSolutionOpen({});
    setReloadNonce((n) => n + 1);
  }, [runner]);

  const handleSelectQuiz = useCallback(
    (cell: DailyQuizCell, optIdx: number) => {
      const { cell: nextCell, xpDelta } = pickDailyQuizOption(cell, optIdx);
      if (nextCell === cell) return;
      setCells((prev) => prev.map((c) => (c.id === cell.id ? nextCell : c)));
      if (xpDelta > 0) {
        onEarnXp?.(xpDelta);
      }
    },
    [onEarnXp],
  );

  const handleUpdateCode = useCallback((cellId: string, nextCode: string) => {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId && c.type === 'code' ? { ...c, code: nextCode } : c)),
    );
  }, []);

  const handleResetStarter = useCallback((cellId: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId && c.type === 'code' ? { ...c, code: c.item.starterCode } : c,
      ),
    );
  }, []);

  const handleRunCodeCell = useCallback(
    async (cell: DailyCodeCell, withTests: boolean) => {
      if (runner.running) return;
      const t0 = performance.now();
      const userCode = cell.code;

      const pyRes = await runner.run({
        code: userCode,
        tests: withTests
          ? cell.item.tests.map((t) => ({ name: t.name, call: t.call, expect: t.expected }))
          : [],
        forbid: [],
        files: [],
        packages: [],
      });

      if (pyRes === null) {
        const stoppedOut = '$ python3 solution.py\n■ Đã dừng lượt chạy theo yêu cầu.';
        setCells((prev) =>
          prev.map((c) =>
            c.id === cell.id && c.type === 'code'
              ? recordDailyCodeRun(c, { code: c.code, output: stoppedOut, graded: false }).cell
              : c,
          ),
        );
        return;
      }

      const outLines = ['$ python3 solution.py'];
      if (pyRes.output && pyRes.output.trim()) {
        outLines.push(pyRes.output.trimEnd());
      }
      if (pyRes.error && pyRes.error.trim()) {
        outLines.push(`⚠️ ${pyRes.error.trimEnd()}`);
      }
      if (!pyRes.output?.trim() && !pyRes.error?.trim()) {
        outLines.push('(Chương trình đã chạy xong, không có đầu ra in lên màn hình)');
      }
      const durSec = ((pyRes.duration || performance.now() - t0) / 1000).toFixed(2);
      outLines.push(`\n${pyRes.error ? '✗ Dừng do lỗi' : '✓ Đã chạy xong'} (${durSec}s).`);

      const results = pyRes.tests ?? [];
      const allPassed = withTests && results.length > 0 && results.every((t) => t.passed);
      const xpDelta = !cell.passed && allPassed ? 25 : 0;

      setCells((prev) =>
        prev.map((c) => {
          if (c.id !== cell.id || c.type !== 'code') return c;
          return recordDailyCodeRun(c, {
            code: c.code,
            output: outLines.join('\n'),
            testResults: results,
            graded: withTests,
          }).cell;
        }),
      );

      if (xpDelta > 0) {
        onEarnXp?.(xpDelta);
      }
    },
    [runner, onEarnXp],
  );

  const summary = summarizeDailyRun(cells);
  const currentCell = cells[itemIdx];

  const renderQuizCell = (cell: DailyQuizCell, idx: number) => {
    const resolved = isDailyQuizResolved(cell);
    const rethinking = cell.state === 'rethinking';
    const picked = cell.rethinkPick ?? cell.firstPick;
    const visCorrectIdx = visibleCorrectIndex(cell);
    const visExplain = visibleExplanation(cell);
    const stickyBg = STICKY_BG_CLASSES[idx % STICKY_BG_CLASSES.length];

    return (
      <div className={ws.openBookCover}>
        <div
          key={`daily-quiz-${cell.id}`}
          className={`${ws.openBookSpread} ${ws.flipNextAnim}`}
        >
          {/* Trang trái: Đề bài trắc nghiệm và phương án */}
          <section className={`${ws.bookPage} ${ws.bookPageLeft}`}>
            <div className={ws.pageHeaderLine}>
              <span>SỔ TAY GIẤY NHỚ · ÔN TẬP HẰNG NGÀY</span>
              <span>
                CÂU {idx + 1} / {cells.length} · TRẮC NGHIỆM
              </span>
            </div>

            <div className={ws.pageBodyFlow}>
              <div className={`${ws.stickyQuestionNote} ${stickyBg}`}>
                <div className={ws.washiTape} />
                <div className={ws.stickyNoteMeta}>
                  <span>📝 CÂU HỎI TRẮC NGHIỆM</span>
                  <span>{cell.item.lesson_title}</span>
                </div>

                <div className={ws.stickyQuestionText}>{cell.item.question}</div>

                <div className={ws.stickyOptList}>
                  {cell.item.options.map((opt, oIdx) => {
                    const isThisPicked = picked === oIdx;
                    const isCorrectAns = visCorrectIdx !== null && oIdx === visCorrectIdx;
                    const isLockedWrong = rethinking && cell.firstPick === oIdx;

                    let optStateClass = '';
                    if (resolved) {
                      if (isCorrectAns) optStateClass = ws.stickyOptCorrect;
                      else if (isThisPicked) optStateClass = ws.stickyOptWrong;
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={resolved || isLockedWrong}
                        className={`${ws.stickyOptBtn} ${optStateClass} ${
                          isLockedWrong ? dp.optBtnLocked : ''
                        }`}
                        onClick={() => handleSelectQuiz(cell, oIdx)}
                      >
                        <span>{opt}</span>
                        {resolved && isCorrectAns && <span>✓ Đúng</span>}
                        {resolved && isThisPicked && !isCorrectAns && <span>✗ Chưa đúng</span>}
                        {isLockedWrong && <span className={dp.optLockTag}>(Đã thử · sai)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {rethinking ? (
                <div className={`${dp.noticeBox} ${dp.noticeRethink}`}>
                  💡 <strong>Chưa chính xác ở lần đầu:</strong> Đáp án đang được giữ kín. Bạn được
                  nghĩ lại và chọn một phương án khác một lần nữa!
                </div>
              ) : resolved ? (
                <div
                  className={`${dp.noticeBox} ${
                    cell.state === 'bad' ? dp.noticeBad : dp.noticeOk
                  }`}
                >
                  ✓ Đã chốt câu trả lời. Xem chi tiết giải thích ở trang bên phải.
                </div>
              ) : (
                <p className={dp.idleHint}>Chọn một phương án bạn cho là chính xác nhất.</p>
              )}
            </div>

            <div className={ws.pageFooterRow}>
              <span>1</span>
              <span>Trắc nghiệm hằng ngày</span>
            </div>
          </section>

          {/* Trang phải: Ghi chú lời giải */}
          <section className={`${ws.bookPage} ${ws.bookPageRight}`}>
            <div className={ws.pageHeaderLine}>
              <span>GHI CHÚ LỜI GIẢI &amp; PHÂN TÍCH</span>
              <span>
                {resolved ? 'ĐÃ CHỐT' : rethinking ? 'LƯỢT NGHĨ LẠI' : 'CHỜ TRẢ LỜI'}
              </span>
            </div>

            <div className={ws.pageBodyFlow}>
              <div
                className={`${ws.stickyExplainNote} ${
                  resolved ? ws.stickyExplainNoteSolved : ''
                }`}
              >
                <div className={ws.paperclipBadge}>📎 Ghim lời giải</div>

                {!resolved ? (
                  <div className={dp.waitExplainWrap}>
                    <div className={dp.waitExplainTitle}>
                      ✍️ Tờ lời giải đang chờ bạn chọn đáp án
                    </div>
                    <p className={dp.waitExplainBody}>
                      Chọn một phương án ở tờ giấy nhớ trang bên trái. Nếu chọn nhầm lần đầu, đáp án
                      vẫn được giữ kín để bạn thử lại trước khi xem giải thích.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div
                      className={`${dp.explainVerdict} ${
                        cell.state === 'bad' ? dp.explainVerdictBad : dp.explainVerdictOk
                      }`}
                    >
                      {cell.state === 'ok'
                        ? '🎉 Chính xác ngay lần đầu! (+15 XP)'
                        : cell.state === 'again'
                          ? '✓ Chính xác sau lần nghĩ lại! (+10 XP)'
                          : '💡 Chưa chính xác — Cùng xem lại giải thích chi tiết:'}
                    </div>
                    <p className={dp.explainText}>{visExplain}</p>
                  </div>
                )}
              </div>

              <div className={dp.nextBar}>
                <span className={dp.progressLabel}>
                  Tiến độ: {summary.answeredCount} / {summary.totalItems} câu
                </span>
                {idx < cells.length - 1 ? (
                  <button
                    type="button"
                    className={ws.freshDeckBtn}
                    onClick={() => setItemIdx((i) => i + 1)}
                  >
                    Tiếp tục sang câu tiếp theo ➔
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${ws.freshDeckBtn} ${dp.primaryStepBtn}`}
                    onClick={() => setFinished(true)}
                  >
                    Xem tổng kết lượt ôn 🏆
                  </button>
                )}
              </div>
            </div>

            <div className={ws.pageFooterRow}>
              <span>Sổ tay ghi chép</span>
              <span>2</span>
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderCodeCell = (cell: DailyCodeCell, idx: number) => {
    const hintsVisible = Boolean(hintsOpen[cell.id]);
    const solutionVisible = Boolean(solutionOpen[cell.id]);

    return (
      <div className={ws.openBookCover}>
        <div
          key={`daily-code-${cell.id}`}
          className={`${ws.openBookSpread} ${ws.flipNextAnim}`}
        >
          {/* Trang trái: Đề bài code, ví dụ, gợi ý & đáp án tham khảo sau lần nộp */}
          <section className={`${ws.bookPage} ${ws.bookPageLeft}`}>
            <div className={ws.pageHeaderLine}>
              <span>SỔ TAY THỰC HÀNH · BÀI CODE HẰNG NGÀY</span>
              <span>
                CÂU {idx + 1} / {cells.length} · BÀI TẬP CODE
              </span>
            </div>

            <div className={ws.pageBodyFlow}>
              <div className={dp.codePromptCard}>
                <div className={dp.codeEyebrow}>{cell.item.lesson_title}</div>
                <h3 className={dp.codeTitle}>{cell.item.title}</h3>
                <p className={dp.codeDesc}>{cell.item.description}</p>
              </div>

              {cell.item.tests.length > 0 && (
                <div className={dp.sampleTestsBox}>
                  <div className={dp.sampleTestsHeading}>CÁC CA KIỂM THỬ MẪU:</div>
                  {cell.item.tests.slice(0, 3).map((t, tIdx) => (
                    <div key={tIdx} className={dp.sampleTestRow}>
                      <strong>{t.name}:</strong>{' '}
                      <code className={dp.sampleTestCode}>{t.call}</code> ➔{' '}
                      <code className={dp.sampleTestCode}>{t.expected}</code>
                    </div>
                  ))}
                </div>
              )}

              {cell.item.hints && cell.item.hints.length > 0 && (
                <div className={dp.hintsBox}>
                  <button
                    type="button"
                    className={dp.hintToggleBtn}
                    onClick={() =>
                      setHintsOpen((prev) => ({ ...prev, [cell.id]: !hintsVisible }))
                    }
                  >
                    <span aria-hidden="true">💡</span>
                    <span>{hintsVisible ? 'Đóng gợi ý' : 'Mở gợi ý giải bài'}</span>
                  </button>
                  {hintsVisible && (
                    <div className={dp.hintsList}>
                      {cell.item.hints.map((h, hIdx) => (
                        <div key={hIdx}>
                          {h.title ? <strong>{h.title}: </strong> : null}
                          <span>{h.body}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {cell.item.solution && cell.attempts >= 1 && (
                <div className={dp.sampleTestsBox}>
                  <button
                    type="button"
                    className={dp.hintToggleBtn}
                    onClick={() =>
                      setSolutionOpen((prev) => ({ ...prev, [cell.id]: !solutionVisible }))
                    }
                  >
                    <span aria-hidden="true">🔑</span>
                    <span>{solutionVisible ? 'Ẩn lời giải mẫu' : 'Xem lời giải mẫu'}</span>
                  </button>
                  {solutionVisible && (
                    <pre className={dp.solutionPre}>{cell.item.solution}</pre>
                  )}
                </div>
              )}

              {cell.passed ? (
                <div className={`${dp.noticeBox} ${dp.noticeOk}`}>
                  ✓ Đã vượt qua toàn bộ ca kiểm thử (+25 XP)!
                </div>
              ) : (
                <p className={dp.idleHint} style={{ marginTop: 12 }}>
                  Viết mã ở trang bên phải rồi bấm &quot;Nộp để kiểm&quot;.
                </p>
              )}
            </div>

            <div className={ws.pageFooterRow}>
              <span>1</span>
              <span>Viết mã hằng ngày</span>
            </div>
          </section>

          {/* Trang phải: Trình soạn thảo mã & kết quả Pyodide (giới hạn 5 giây) */}
          <section className={`${ws.bookPage} ${ws.bookPageRight}`}>
            <div className={ws.pageHeaderLine}>
              <span>BÀN GÕ MÃ VÀ KẾT QUẢ CHẠY (PYODIDE)</span>
              <span>{cell.passed ? '✓ ĐÃ ĐẠT (+25 XP)' : 'CHƯA ĐẠT'}</span>
            </div>

            <div className={ws.pageBodyFlow}>
              <div className={dp.ideColWrap}>
                <div className={dp.ideFrame}>
                  <div className={dp.ideToolbar}>
                    <div className={dp.ideFileWrap}>
                      <span className={dp.ideFileName}>solution.py</span>
                      {runner.runtimeStatus && (
                        <span className={dp.ideStatusTag}>{runner.runtimeStatus}</span>
                      )}
                    </div>
                    <div className={dp.ideBtnGroup}>
                      <button
                        type="button"
                        className={dp.ideToolBtn}
                        disabled={runner.running}
                        onClick={() => handleResetStarter(cell.id)}
                        title="Khôi phục đoạn mã ban đầu"
                      >
                        ↺ Mã gốc
                      </button>
                      <button
                        type="button"
                        className={dp.ideToolBtn}
                        disabled={runner.running}
                        onClick={() => void handleRunCodeCell(cell, false)}
                      >
                        <span aria-hidden="true">▶</span> Chạy thử
                      </button>
                      {runner.running ? (
                        <button
                          type="button"
                          className={dp.ideStopBtn}
                          onClick={() => runner.cancel()}
                        >
                          <span aria-hidden="true">■</span> Dừng
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={dp.ideSubmitBtn}
                          onClick={() => void handleRunCodeCell(cell, true)}
                        >
                          <span aria-hidden="true">✓</span> Nộp để kiểm
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={cell.code}
                    onChange={(e) => handleUpdateCode(cell.id, e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        void handleRunCodeCell(cell, true);
                      }
                    }}
                    spellCheck={false}
                    aria-label="Soạn thảo mã Python"
                    className={`${ws.ideTextarea} ${dp.codeEditorArea}`}
                  />

                  <div className={dp.termWrap}>
                    <div className={dp.termHeader}>TERMINAL · OUTPUT (GIỚI HẠN 5 GIÂY)</div>
                    <div className={`${ws.terminalBox} ${dp.termScrollBox}`}>
                      <pre className={ws.terminalPre}>{cell.output}</pre>
                    </div>
                  </div>
                </div>

                {cell.testResults.length > 0 && (
                  <div className={dp.testResultCard}>
                    <div className={dp.testResultTitle}>KẾT QUẢ CÁC CA KIỂM THỬ:</div>
                    <div className={dp.testResultList}>
                      {cell.testResults.map((t, tIdx) => (
                        <div
                          key={tIdx}
                          className={`${dp.testCaseRow} ${
                            t.passed ? dp.testCasePass : dp.testCaseFail
                          }`}
                        >
                          <div className={dp.testCaseHead}>
                            <span>
                              <span aria-hidden="true">{t.passed ? '✓' : '✗'}</span> {t.name}
                            </span>
                            <strong>{t.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</strong>
                          </div>
                          {t.detail && <div className={dp.testCaseDetail}>{t.detail}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={dp.nextBar}>
                  <span className={dp.progressLabel}>
                    Tiến độ: {summary.answeredCount} / {summary.totalItems} câu
                  </span>
                  {idx < cells.length - 1 ? (
                    <button
                      type="button"
                      className={ws.freshDeckBtn}
                      onClick={() => setItemIdx((i) => i + 1)}
                    >
                      Tiếp tục sang câu tiếp theo ➔
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${ws.freshDeckBtn} ${dp.primaryStepBtn}`}
                      onClick={() => setFinished(true)}
                    >
                      Xem tổng kết lượt ôn 🏆
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={ws.pageFooterRow}>
              <span>Sổ tay thực hành</span>
              <span>2</span>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <div ref={shellRef} className={ws.bookStageWrap}>
      {/* Thanh Stepper tiến trình từng câu (Trắc nghiệm & Viết mã xen kẽ) */}
      <div className={dp.stepperOuter}>
        <div className={dp.stepperBar}>
          {cells.map((cell, idx) => {
            const isCurrent = !finished && itemIdx === idx;
            let badgeText = `[${idx + 1}]`;
            let badgeClass = dp.stepBadge;

            if (cell.type === 'quiz') {
              if (cell.state === 'ok') {
                badgeText = '✓';
                badgeClass = `${dp.stepBadge} ${dp.stepBadgeOk}`;
              } else if (cell.state === 'again') {
                badgeText = '✓ (lần 2)';
                badgeClass = `${dp.stepBadge} ${dp.stepBadgeOk}`;
              } else if (cell.state === 'bad') {
                badgeText = '✗';
                badgeClass = `${dp.stepBadge} ${dp.stepBadgeBad}`;
              } else if (cell.state === 'rethinking') {
                badgeText = '↺';
                badgeClass = `${dp.stepBadge} ${dp.stepBadgeRethink}`;
              }
            } else if (cell.passed) {
              badgeText = '✓';
              badgeClass = `${dp.stepBadge} ${dp.stepBadgeOk}`;
            }

            if (isCurrent) {
              badgeClass = `${dp.stepBadge} ${dp.stepBadgeActive}`;
            }

            return (
              <button
                key={cell.id}
                type="button"
                className={`${dp.stepBtn} ${isCurrent ? dp.stepBtnActive : ''}`}
                onClick={() => {
                  setFinished(false);
                  setItemIdx(idx);
                }}
              >
                <span aria-hidden="true">{cell.type === 'quiz' ? '📝' : '💻'}</span>
                <span>
                  Câu {idx + 1}: {cell.type === 'quiz' ? 'Trắc nghiệm' : 'Viết mã'}
                </span>
                <span className={badgeClass}>{badgeText}</span>
              </button>
            );
          })}

          <button
            type="button"
            className={`${dp.stepBtn} ${finished ? dp.stepBtnActive : ''}`}
            onClick={() => setFinished(true)}
          >
            <span aria-hidden="true">🏆</span>
            <span>Tổng kết lượt ôn</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className={dp.centerStateBox}>
          <p className={dp.loadingText}>⏳ Đang nạp phiên ôn tập hằng ngày...</p>
        </div>
      ) : error ? (
        <div className={dp.centerStateBox}>
          <h3 className={dp.errorHeading}>Thông báo ôn tập hằng ngày</h3>
          <p className={dp.errorBody}>{error}</p>
          <button type="button" className={ws.freshDeckBtn} onClick={handleRestartSession}>
            ↻ Thử nạp lại
          </button>
        </div>
      ) : finished ? (
        <div className={ws.openBookCover}>
          <div className={`${ws.openBookSpread} ${ws.flipNextAnim}`}>
            <section className={`${ws.bookPage} ${ws.bookPageLeft}`}>
              <div className={ws.pageHeaderLine}>
                <span>{session?.title?.toUpperCase() ?? 'ÔN TẬP HẰNG NGÀY'} · TỔNG KẾT</span>
                <span>{sourceKind === 'mock' ? 'DỮ LIỆU MẪU' : 'DỮ LIỆU TỪ MÁY CHỦ'}</span>
              </div>

              <div className={ws.pageBodyFlow}>
                <p className={ws.pageSectionLabel}>HOÀN THÀNH LƯỢT ÔN</p>
                <h2 className={ws.pageMainTitle}>Tổng kết phiên học</h2>
                <p className={ws.pageLeadParagraph}>
                  Bạn đã hoàn thành {summary.answeredCount} / {summary.totalItems} mục trong phiên
                  ôn tập hằng ngày kết hợp trắc nghiệm và viết mã Pyodide:
                </p>

                <div className={ws.studyLogSheet}>
                  <div className={ws.studyLogTitle}>
                    <span>📊 KẾT QUẢ ĐẠT ĐƯỢC</span>
                    <span>+{summary.xpEarned} XP</span>
                  </div>
                  <ul className={ws.studyLogList}>
                    <li className={ws.studyLogItem}>
                      <span>Trắc nghiệm đúng ngay lần đầu</span>
                      <strong>
                        {summary.quizFirstTry} / {summary.quizTotal} câu (+
                        {summary.quizFirstTry * 15} XP)
                      </strong>
                    </li>
                    <li className={ws.studyLogItem}>
                      <span>Trắc nghiệm đúng sau lần nghĩ lại</span>
                      <strong>
                        {summary.quizSecondTry} / {summary.quizTotal} câu (+
                        {summary.quizSecondTry * 10} XP)
                      </strong>
                    </li>
                    <li className={ws.studyLogItem}>
                      <span>Bài tập viết mã vượt qua toàn bộ ca kiểm thử</span>
                      <strong>
                        {summary.codePassed} / {summary.codeTotal} bài (+
                        {summary.codePassed * 25} XP)
                      </strong>
                    </li>
                  </ul>
                </div>
              </div>

              <div className={ws.pageFooterRow}>
                <span>1</span>
                <span>Ôn tập hằng ngày</span>
              </div>
            </section>

            <section className={`${ws.bookPage} ${ws.bookPageRight}`}>
              <div className={ws.pageHeaderLine}>
                <span>DANH SÁCH BÀI LÀM</span>
                <span>
                  {summary.answeredCount} / {summary.totalItems} CÂU ĐÃ XONG
                </span>
              </div>

              <div className={ws.pageBodyFlow}>
                <div className={dp.summaryList}>
                  {cells.map((cell, idx) => {
                    let isPass = false;
                    let textSummary = '';
                    if (cell.type === 'quiz') {
                      if (cell.state === 'ok') {
                        isPass = true;
                        textSummary = 'Đúng ngay lần đầu';
                      } else if (cell.state === 'again') {
                        isPass = true;
                        textSummary = 'Đúng sau lần nghĩ lại';
                      } else if (cell.state === 'bad') {
                        textSummary = 'Chưa chính xác';
                      } else if (cell.state === 'rethinking') {
                        textSummary = 'Đang nghĩ lại';
                      } else {
                        textSummary = 'Chưa trả lời';
                      }
                    } else {
                      isPass = cell.passed;
                      textSummary = cell.passed
                        ? 'Đã đạt toàn bộ ca kiểm thử'
                        : 'Chưa đạt toàn bộ ca kiểm thử';
                    }

                    return (
                      <div key={cell.id} className={dp.summaryRow}>
                        <div className={dp.summaryRowLeft}>
                          <span aria-hidden="true">{cell.type === 'quiz' ? '📝' : '💻'}</span>
                          <span>
                            Câu {idx + 1}:{' '}
                            {cell.type === 'code' ? cell.item.title : cell.item.lesson_title}
                          </span>
                        </div>
                        <span className={isPass ? dp.summaryStatusPass : dp.summaryStatusPending}>
                          {isPass ? '✓' : '•'} {textSummary}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className={dp.summaryActions}>
                  <button
                    type="button"
                    className={`${ws.freshDeckBtn} ${dp.fullWidthBtn}`}
                    onClick={handleRestartSession}
                  >
                    ↻ Làm lại lượt ôn từ đầu
                  </button>
                  <button
                    type="button"
                    className={`${ws.freshDeckBtn} ${dp.fullWidthBtn} ${dp.secondaryBtn}`}
                    onClick={() => {
                      setFinished(false);
                      setItemIdx(0);
                    }}
                  >
                    👁️ Xem lại các câu vừa làm
                  </button>
                  <button
                    type="button"
                    className={`${ws.freshDeckBtn} ${dp.fullWidthBtn} ${dp.backRoomBtn}`}
                    onClick={onBackToLesson}
                  >
                    🛋️ Về Bàn học
                  </button>
                </div>
              </div>

              <div className={ws.pageFooterRow}>
                <span>Sổ tay ghi chép</span>
                <span>2</span>
              </div>
            </section>
          </div>
        </div>
      ) : currentCell?.type === 'quiz' ? (
        renderQuizCell(currentCell, itemIdx)
      ) : currentCell?.type === 'code' ? (
        renderCodeCell(currentCell, itemIdx)
      ) : null}

      {!finished && cells.length > 0 && (
        <div className={ws.bookBottomNav}>
          <button
            type="button"
            className={ws.bookNavPrevBtn}
            disabled={itemIdx === 0}
            onClick={() => setItemIdx((i) => Math.max(0, i - 1))}
          >
            &lt; Câu trước
          </button>

          <div className={ws.bookNavDotsWrap}>
            {cells.map((cell, idx) => (
              <button
                key={cell.id}
                type="button"
                aria-label={`Câu ${idx + 1}`}
                onClick={() => setItemIdx(idx)}
                className={`${ws.bookNavDot} ${itemIdx === idx ? ws.bookNavDotActive : ''}`}
              />
            ))}
            <span>
              Câu {itemIdx + 1} / {cells.length}
            </span>
          </div>

          <button
            type="button"
            className={ws.bookNavNextBtn}
            onClick={() => {
              if (itemIdx < cells.length - 1) {
                setItemIdx((i) => i + 1);
              } else {
                setFinished(true);
              }
            }}
          >
            {itemIdx < cells.length - 1 ? 'Câu tiếp theo >' : 'Tổng kết >'}
          </button>
        </div>
      )}
    </div>
  );
}

export default DailyPracticeView;
