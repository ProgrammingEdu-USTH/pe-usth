'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LofiButton, LofiProgressBar } from '@/components/ui';
import CURRICULA_JSON from '@/lib/curricula.json';
import { apiFetch, apiFetchSessionOnly } from '@/lib/api';
import { hasStoredSession, LS_ACCESS, LS_LEGACY_REFRESH } from '@/lib/course-progress';
import {
  buildSurveyDtoPayload,
  classifyOnboardingViewer,
  friendlyApiError,
  isVersionConflictError,
  loadMyPlacement,
  loadQuestionnaire,
  resolvePlacementModuleTitle,
  submitQuestionnaireAndSurvey,
  USE_QUESTIONNAIRE_MOCK,
  type ModuleCurriculumRow,
  type OnboardingViewerKind,
  type PlacementResult,
  type QuestionnaireItem,
  type QuestionnairePayload,
} from '@/lib/onboarding-questionnaire';
import styles from './onboarding-survey.module.css';

const COURSE_ID = 'python_advanced';
const CURRICULA_MODULES =
  ((CURRICULA_JSON as { CURRICULA?: Record<string, { modules?: ModuleCurriculumRow[] }> })
    .CURRICULA?.[COURSE_ID]?.modules ?? []) as ModuleCurriculumRow[];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const JOB_OPTIONS = ['Sinh viên', 'Đi làm ngành CNTT', 'Đi làm ngành khác', 'Tự học chuyển ngành'];
const PURPOSE_OPTIONS = ['Phân tích dữ liệu', 'Học trên trường', 'Tự động hoá công việc', 'Chuẩn bị học ML'];
const EXPERIENCE_OPTIONS = ['Chưa biết lập trình', 'Biết cơ bản', 'Đã làm dự án nhỏ', 'Có kinh nghiệm > 1 năm'];
const LANGUAGE_OPTIONS = ['Python', 'SQL', 'C/C++', 'JavaScript', 'Java'];

function lsRead(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

type StepSlide =
  | { kind: 'profile' }
  | { kind: 'self'; index: number }
  | { kind: 'item'; index: number };

export function OnboardingSurveyView() {
  const router = useRouter();

  const [viewerKind, setViewerKind] = useState<OnboardingViewerKind>('anonymous');

  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnairePayload | null>(null);
  const [quizSource, setQuizSource] = useState<'mock' | 'api'>('mock');

  const [slideIdx, setSlideIdx] = useState(0);
  const [job, setJob] = useState('');
  const [purposes, setPurposes] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  const [selfAnswers, setSelfAnswers] = useState<Record<string, number | null>>({});
  const [itemAnswers, setItemAnswers] = useState<Record<string, number | null>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);

  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const [placementSource, setPlacementSource] = useState<'mock' | 'api' | null>(null);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [surveySaved, setSurveySaved] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const fetchQuiz = useCallback(async () => {
    setLoadingQuiz(true);
    setLoadError(null);
    setVersionConflict(false);
    try {
      const { questionnaire: loaded, source } = await loadQuestionnaire(COURSE_ID, {
        useMock: USE_QUESTIONNAIRE_MOCK,
        fetcher: apiFetchSessionOnly,
      });
      setQuestionnaire(loaded);
      setQuizSource(source);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được bộ câu hỏi đầu vào.');
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const session = {
        access: lsRead(LS_ACCESS),
        legacyRefresh: lsRead(LS_LEGACY_REFRESH),
        cookie: typeof document === 'undefined' ? null : document.cookie,
      };
      const hasSession = hasStoredSession(session);

      const detectViewer = async (): Promise<OnboardingViewerKind> => {
        if (!hasSession) return 'anonymous';
        try {
          const res = await apiFetchSessionOnly('/api/user');
          if (!res.ok) return 'anonymous';
          const profile = (await res.json().catch(() => null)) as unknown;
          return classifyOnboardingViewer(profile);
        } catch {
          return 'anonymous';
        }
      };

      const fetchSavedPlacement = async (): Promise<PlacementResult | null> => {
        if (!hasSession || USE_QUESTIONNAIRE_MOCK) return null;
        return loadMyPlacement({ courseId: COURSE_ID, fetcher: apiFetchSessionOnly });
      };

      const [kind, savedPlacement] = await Promise.all([
        detectViewer(),
        fetchSavedPlacement(),
        fetchQuiz(),
      ]);
      if (!cancelled) {
        setViewerKind(kind);
        if (savedPlacement) {
          setPlacement(savedPlacement);
          setPlacementSource('api');
          setSurveySaved(true);
          setExistingLoaded(true);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [fetchQuiz]);

  const slides = useMemo<StepSlide[]>(() => {
    if (!questionnaire) return [];
    const list: StepSlide[] = [{ kind: 'profile' }];
    (questionnaire.self_assess ?? []).forEach((_, idx) => {
      list.push({ kind: 'self', index: idx });
    });
    questionnaire.items.forEach((_, idx) => {
      list.push({ kind: 'item', index: idx });
    });
    return list;
  }, [questionnaire]);

  const itemById = useMemo(() => {
    const map = new Map<string, QuestionnaireItem>();
    for (const it of questionnaire?.items ?? []) {
      map.set(it.id, it);
    }
    return map;
  }, [questionnaire]);

  const canSaveToServer = viewerKind === 'authenticated' || viewerKind === 'guest';
  const currentSlide = slides[slideIdx];
  const totalSlides = slides.length;
  const progressPercent = totalSlides > 0 ? Math.round(((slideIdx + 1) / totalSlides) * 100) : 0;

  const toggleMulti = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const buildSurveyInput = (): Record<string, unknown> => {
    const derivedLevel =
      experience === 'Có kinh nghiệm > 1 năm'
        ? 'Nâng cao'
        : experience === 'Đã làm dự án nhỏ'
          ? 'Trung cấp'
          : experience === 'Biết cơ bản' || experience === 'Chưa biết lập trình'
            ? 'Cơ bản'
            : '';

    return {
      job,
      purpose: purposes,
      experience,
      language: languages,
      level: derivedLevel,
    };
  };

  const handleSubmitAll = async (overrideItemAnswers?: Record<string, number | null>) => {
    if (!questionnaire || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setVersionConflict(false);
    setSurveyError(null);
    setShowReview(false);
    const submitFetcher = USE_QUESTIONNAIRE_MOCK ? apiFetchSessionOnly : apiFetch;
    try {
      const res = await submitQuestionnaireAndSurvey({
        courseId: COURSE_ID,
        questionnaire,
        answers: overrideItemAnswers ?? itemAnswers,
        selfAnswers,
        surveyInput: buildSurveyInput(),
        modules: CURRICULA_MODULES,
        saveSurvey: USE_QUESTIONNAIRE_MOCK ? canSaveToServer : true,
        useMock: USE_QUESTIONNAIRE_MOCK,
        fetcher: submitFetcher,
      });
      setPlacement(res.placement);
      setPlacementSource(res.placementSource);
      setExistingLoaded(false);
      setSurveySaved(res.surveySaved);
      setSurveyError(res.surveyError);
      if (!USE_QUESTIONNAIRE_MOCK && res.placementSource === 'api' && viewerKind === 'anonymous') {
        setViewerKind('guest');
      }
    } catch (err) {
      setVersionConflict(isVersionConflictError(err));
      setSubmitError(err instanceof Error ? err.message : friendlyApiError(0, null));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetrySaveSurvey = async () => {
    if ((USE_QUESTIONNAIRE_MOCK && !canSaveToServer) || submitting) return;
    setSubmitting(true);
    setSurveyError(null);
    const fetcher = USE_QUESTIONNAIRE_MOCK ? apiFetchSessionOnly : apiFetch;
    try {
      const payload = buildSurveyDtoPayload(buildSurveyInput());
      const res = await fetcher('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setSurveySaved(true);
      } else {
        setSurveyError(friendlyApiError(res.status, body, 'Chưa lưu được khảo sát.'));
      }
    } catch {
      setSurveyError(friendlyApiError(0, null));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextOrSubmit = () => {
    if (slideIdx < totalSlides - 1) {
      setSlideIdx((prev) => prev + 1);
      return;
    }
    void handleSubmitAll();
  };

  const handleSkipCurrent = () => {
    if (!currentSlide || submitting) return;
    if (currentSlide.kind === 'self' && questionnaire?.self_assess) {
      const sa = questionnaire.self_assess[currentSlide.index];
      setSelfAnswers((prev) => ({ ...prev, [sa.id]: null }));
    } else if (currentSlide.kind === 'item' && questionnaire) {
      const it = questionnaire.items[currentSlide.index];
      const nextAnswers = { ...itemAnswers, [it.id]: null };
      setItemAnswers(nextAnswers);
      if (slideIdx === totalSlides - 1) {
        void handleSubmitAll(nextAnswers);
        return;
      }
    }
    if (slideIdx < totalSlides - 1) {
      setSlideIdx((prev) => prev + 1);
    }
  };

  const handleSkipWholeSurvey = async () => {
    if (skipBusy) return;
    if (canSaveToServer) {
      setSkipBusy(true);
      try {
        await apiFetchSessionOnly('/api/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'Cơ bản', purpose: 'Bỏ qua khảo sát để học thẳng' }),
        });
      } catch {
        /* Người dùng chủ động bỏ qua để vào học ngay */
      } finally {
        setSkipBusy(false);
      }
    }
    router.push(`/lesson/${COURSE_ID}`);
  };

  const handleReloadQuestionnaire = () => {
    setSlideIdx(0);
    setSelfAnswers({});
    setItemAnswers({});
    setSubmitError(null);
    setVersionConflict(false);
    void fetchQuiz();
  };

  const handleRetake = () => {
    setSlideIdx(0);
    setSelfAnswers({});
    setItemAnswers({});
    setPlacement(null);
    setPlacementSource(null);
    setExistingLoaded(false);
    setSubmitError(null);
    setVersionConflict(false);
    setSurveyError(null);
    setSurveySaved(false);
    setShowReview(false);
  };

  const currentSelectionDone = (() => {
    if (!currentSlide || !questionnaire) return false;
    if (currentSlide.kind === 'profile') return true;
    if (currentSlide.kind === 'self') {
      const sa = questionnaire.self_assess?.[currentSlide.index];
      return sa ? typeof selfAnswers[sa.id] === 'number' : false;
    }
    const it = questionnaire.items[currentSlide.index];
    return it ? typeof itemAnswers[it.id] === 'number' : false;
  })();

  const startModuleTitle = placement
    ? resolvePlacementModuleTitle(questionnaire?.modules, CURRICULA_MODULES, placement.start_module)
    : '';
  const masteryThreshold = questionnaire?.params.mastery_threshold ?? 0.66;
  const durationLabel =
    questionnaire &&
    typeof questionnaire.params.max_duration_min === 'number' &&
    questionnaire.params.max_duration_min > 0
      ? `~${questionnaire.params.max_duration_min} phút · `
      : '';

  return (
    <div className={styles.onboardingPageWrap}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backHomeLink}>
          <LofiButton
            variant="glass"
            size="sm"
            leftIcon={<span aria-hidden="true">←</span>}
          >
            Về Bàn học
          </LofiButton>
        </Link>

        {!placement && (
          <button
            type="button"
            className={styles.skipBtn}
            onClick={() => void handleSkipWholeSurvey()}
            disabled={skipBusy}
          >
            <span>{skipBusy ? 'Đang chuyển...' : 'Bỏ qua khảo sát'}</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      <div className={styles.surveyCard}>
        {loadingQuiz ? (
          <div className={styles.gateBox}>
            <div className={styles.badgeTag}>Khảo sát định vị</div>
            <h2 className={styles.gateTitle}>Đang tải bộ câu hỏi...</h2>
            <p className={styles.gateDesc}>Vui lòng đợi trong giây lát.</p>
          </div>
        ) : loadError ? (
          <div className={styles.gateBox}>
            <div className={styles.errorAlert} role="alert">
              {loadError}
            </div>
            <div className={styles.gateActions}>
              <LofiButton variant="primary" size="sm" onClick={() => void fetchQuiz()}>
                Thử tải lại
              </LofiButton>
              <Link href={`/lesson/${COURSE_ID}`} className={styles.backHomeLink}>
                <LofiButton variant="glass" size="sm">
                  Vào học thẳng
                </LofiButton>
              </Link>
            </div>
          </div>
        ) : placement ? (
          <div className={styles.resultCard}>
            <div className={styles.badgeTag}>Kết quả định vị</div>
            <h2 className={styles.resultTitle}>{placement.level_title}</h2>
            <p className={styles.resultSubtitle}>
              {placement.skipped_all
                ? 'Bạn đã bỏ qua toàn bộ câu hỏi nên lộ trình bắt đầu từ nền tảng M1.'
                : typeof placement.score === 'number' && typeof placement.total === 'number'
                  ? `Điểm kiểm tra: ${placement.score}/${placement.total} câu đúng — hệ thống đã chọn điểm bắt đầu phù hợp nhất.`
                  : 'Hệ thống đã chấm điểm theo từng module để chọn điểm bắt đầu phù hợp nhất.'}
            </p>

            {surveySaved ? (
              <div className={styles.successAlert} role="status">
                {existingLoaded
                  ? 'Đây là kết quả định vị đã lưu của bạn cho bộ câu hỏi hiện tại.'
                  : placement.updated
                    ? 'Đã cập nhật kết quả định vị mới & khảo sát vào hồ sơ học tập của bạn.'
                    : 'Đã lưu kết quả định vị & khảo sát vào hồ sơ học tập của bạn.'}
              </div>
            ) : surveyError ? (
              <div className={styles.errorAlert} role="alert">
                {surveyError}{' '}
                <button
                  type="button"
                  className={styles.skipQuestionBtn}
                  onClick={() => void handleRetrySaveSurvey()}
                  disabled={submitting}
                >
                  Thử lưu lại
                </button>
              </div>
            ) : placementSource === 'api' ? (
              <div className={styles.successAlert} role="status">
                Đã chấm và lưu kết quả định vị trên máy chủ.
              </div>
            ) : (
              <div className={styles.modeNote}>
                Bạn đang làm bài ở chế độ khách — kết quả gợi ý vẫn sẵn sàng dùng ngay, hoặc{' '}
                <Link href="/login?next=/onboarding">đăng nhập</Link> nếu muốn lưu lại vào tài khoản.
              </div>
            )}

            <div className={styles.resultRecBox}>
              <div className={styles.recLabel}>MODULE BẮT ĐẦU ĐỀ XUẤT</div>
              <h3 className={styles.recCourseTitle}>{startModuleTitle}</h3>
              <p className={styles.recDesc}>
                Bắt đầu từ <strong>Bài {placement.start_lesson_no}</strong>. Mọi bài học khác trong khoá vẫn mở tự do nếu bạn muốn xem lại hoặc học nhảy chặng.
              </p>
              {placement.review_modules.length > 0 && (
                <p className={styles.reviewLine}>
                  Gợi ý ôn thêm các chặng sau điểm bắt đầu: {placement.review_modules.join(', ')}
                </p>
              )}
            </div>

            {Object.keys(placement.module_scores).length > 0 && (
              <div className={styles.scoreGrid}>
                {Object.entries(placement.module_scores).map(([modCode, score]) => {
                  const passed = score >= masteryThreshold;
                  const isStart =
                    modCode.trim().toUpperCase() === placement.start_module.trim().toUpperCase();
                  const statusText = passed ? 'Đạt' : isStart ? 'Bắt đầu' : 'Cần học';
                  return (
                    <div
                      key={modCode}
                      className={`${styles.scoreChip} ${
                        passed ? styles.scoreChipPassed : styles.scoreChipNeedsWork
                      }`}
                    >
                      <div className={styles.scoreChipTop}>
                        <strong>{modCode}</strong>
                        <span className={styles.scoreChipStatus}>{statusText}</span>
                      </div>
                      <div className={styles.scoreChipValue}>{Math.round(score * 100)}%</div>
                    </div>
                  );
                })}
              </div>
            )}

            {placement.review && placement.review.length > 0 && (
              <div className={styles.reviewSection}>
                <button
                  type="button"
                  className={styles.reviewToggleBtn}
                  aria-expanded={showReview}
                  onClick={() => setShowReview((prev) => !prev)}
                >
                  <span>
                    Xem lại đáp án & giải thích (
                    {typeof placement.score === 'number' && typeof placement.total === 'number'
                      ? `${placement.score}/${placement.total} câu đúng`
                      : `${placement.review.filter((r) => r.is_correct).length}/${placement.review.length} câu đúng`}
                    )
                  </span>
                  <span aria-hidden="true">{showReview ? '▲' : '▼'}</span>
                </button>

                {showReview && (
                  <div className={styles.reviewList}>
                    {placement.review.map((r, idx) => {
                      const item = itemById.get(r.item_id);
                      const skipped = r.picked === null;
                      const badgeClass = skipped
                        ? styles.reviewBadgeSkipped
                        : r.is_correct
                          ? styles.reviewBadgeCorrect
                          : styles.reviewBadgeWrong;
                      const badgeLabel = skipped ? 'Bỏ qua' : r.is_correct ? 'Đúng' : 'Sai';
                      const pickedText =
                        r.picked !== null
                          ? (item?.options[r.picked]?.text ??
                            `Lựa chọn ${LETTERS[r.picked] ?? r.picked + 1}`)
                          : null;
                      const correctText =
                        item?.options[r.correct]?.text ??
                        `Lựa chọn ${LETTERS[r.correct] ?? r.correct + 1}`;
                      const explanationText =
                        r.explanation ?? placement.explanations?.[r.item_id];

                      return (
                        <div key={r.item_id} className={styles.reviewItem}>
                          <div className={styles.reviewItemHeader}>
                            <span className={styles.reviewItemMeta}>
                              Câu {idx + 1}
                              {r.module_code
                                ? ` · ${r.module_code}`
                                : item?.module_code
                                  ? ` · ${item.module_code}`
                                  : ''}
                            </span>
                            <span className={badgeClass}>{badgeLabel}</span>
                          </div>
                          <div className={styles.reviewQuestion}>
                            {item?.question ?? `Câu ${r.item_id}`}
                          </div>
                          <div className={styles.reviewAnswerLine}>
                            {skipped ? 'Bạn đã bỏ qua câu này.' : `Bạn chọn: ${pickedText}`}
                          </div>
                          {!r.is_correct && (
                            <div className={styles.reviewAnswerLine}>
                              <strong>Đáp án đúng:</strong> {correctText}
                            </div>
                          )}
                          {explanationText && (
                            <div className={styles.reviewExplanation}>{explanationText}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className={styles.resultActionRow}>
              <button
                type="button"
                className={styles.retakeBtn}
                onClick={handleRetake}
              >
                Làm lại khảo sát <span aria-hidden="true">↻</span>
              </button>

              <Link
                href={`/lesson/${COURSE_ID}?lesson=${Math.max(0, placement.start_lesson_no - 1)}`}
                className={styles.backHomeLink}
              >
                <LofiButton
                  variant="primary"
                  size="md"
                  rightIcon={<span aria-hidden="true">→</span>}
                >
                  Bắt đầu học từ Bài {placement.start_lesson_no}
                </LofiButton>
              </Link>
            </div>
          </div>
        ) : questionnaire && currentSlide ? (
          <>
            <div className={styles.headerMeta}>
              <div className={styles.badgeTag}>
                <span>{quizSource === 'mock' ? 'Khảo sát định vị (Mẫu)' : 'Khảo sát định vị'}</span>
              </div>
              <span className={styles.stepIndicator}>
                {durationLabel}Bước {slideIdx + 1} / {totalSlides}
              </span>
            </div>

            <div className={styles.progressBarWrap}>
              <LofiProgressBar value={progressPercent} variant="gradient" />
            </div>

            {submitError && (
              <div className={styles.errorAlert} role="alert">
                <span>{submitError}</span>
                {versionConflict && (
                  <>
                    {' '}
                    <button
                      type="button"
                      className={styles.skipQuestionBtn}
                      onClick={handleReloadQuestionnaire}
                      disabled={loadingQuiz}
                    >
                      Tải bản mới
                    </button>
                  </>
                )}
              </div>
            )}

            {currentSlide.kind === 'profile' ? (
              <>
                <div className={styles.topicLabel}>HỒ SƠ HỌC TẬP (TUỲ CHỌN)</div>
                <h2 className={styles.questionText}>
                  Chia sẻ nhanh nền tảng hiện tại để hệ thống tạo lộ trình phù hợp
                </h2>

                <div className={styles.surveyFields}>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Bạn đang là</span>
                    <div className={styles.pillGroup}>
                      {JOB_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`${styles.pillBtn} ${job === opt ? styles.pillBtnActive : ''}`}
                          onClick={() => setJob(job === opt ? '' : opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Mục đích học (chọn nhiều)</span>
                    <div className={styles.pillGroup}>
                      {PURPOSE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`${styles.pillBtn} ${purposes.includes(opt) ? styles.pillBtnActive : ''}`}
                          onClick={() => toggleMulti(purposes, setPurposes, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Kinh nghiệm lập trình</span>
                    <div className={styles.pillGroup}>
                      {EXPERIENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`${styles.pillBtn} ${experience === opt ? styles.pillBtnActive : ''}`}
                          onClick={() => setExperience(experience === opt ? '' : opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Ngôn ngữ đã biết (chọn nhiều)</span>
                    <div className={styles.pillGroup}>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`${styles.pillBtn} ${languages.includes(opt) ? styles.pillBtnActive : ''}`}
                          onClick={() => toggleMulti(languages, setLanguages, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : currentSlide.kind === 'self' && questionnaire.self_assess ? (
              (() => {
                const sa = questionnaire.self_assess[currentSlide.index];
                const picked = selfAnswers[sa.id];
                return (
                  <>
                    <div className={styles.topicLabel}>TỰ ĐÁNH GIÁ · {sa.module_code}</div>
                    <h2 className={styles.questionText}>{sa.question}</h2>
                    <div className={styles.optionsList}>
                      {sa.options.map((opt, optIdx) => {
                        const isSelected = picked === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={`${styles.optionBtn} ${isSelected ? styles.optionBtnSelected : ''}`}
                            onClick={() =>
                              setSelfAnswers((prev) => ({ ...prev, [sa.id]: optIdx }))
                            }
                          >
                            <span
                              className={`${styles.optionLetter} ${
                                isSelected ? styles.optionLetterSelected : ''
                              }`}
                            >
                              {LETTERS[optIdx] ?? optIdx + 1}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()
            ) : (
              (() => {
                const it = questionnaire.items[currentSlide.index];
                const picked = itemAnswers[it.id];
                return (
                  <>
                    <div className={styles.topicLabel}>
                      KIỂM TRA NHANH · {it.module_code}
                      {it.level ? ` · ${it.level}` : ''}
                    </div>
                    <h2 className={styles.questionText}>{it.question}</h2>
                    {it.code && (
                      <div className={styles.codeBox}>
                        <pre className={styles.codePre}>{it.code}</pre>
                      </div>
                    )}
                    <div className={styles.optionsList}>
                      {it.options.map((opt, optIdx) => {
                        const isSelected = picked === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={`${styles.optionBtn} ${isSelected ? styles.optionBtnSelected : ''}`}
                            onClick={() =>
                              setItemAnswers((prev) => ({ ...prev, [it.id]: optIdx }))
                            }
                          >
                            <span
                              className={`${styles.optionLetter} ${
                                isSelected ? styles.optionLetterSelected : ''
                              }`}
                            >
                              {LETTERS[optIdx] ?? optIdx + 1}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()
            )}

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.prevBtn}
                onClick={() => setSlideIdx((prev) => Math.max(0, prev - 1))}
                disabled={slideIdx === 0 || submitting}
              >
                <span aria-hidden="true">←</span> Câu trước
              </button>

              <div className={styles.rightActions}>
                <button
                  type="button"
                  className={styles.skipQuestionBtn}
                  onClick={handleSkipCurrent}
                  disabled={submitting}
                >
                  {slideIdx === totalSlides - 1 ? 'Bỏ qua & nộp' : 'Bỏ qua'}
                </button>

                <LofiButton
                  variant="primary"
                  size="sm"
                  onClick={handleNextOrSubmit}
                  disabled={!currentSelectionDone || submitting}
                  rightIcon={<span aria-hidden="true">→</span>}
                >
                  {submitting
                    ? 'Đang nộp...'
                    : slideIdx === totalSlides - 1
                      ? 'Nộp bài'
                      : 'Tiếp theo'}
                </LofiButton>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default OnboardingSurveyView;
