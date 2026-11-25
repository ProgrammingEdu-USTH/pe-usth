'use client';

import React, { useEffect, useState } from 'react';
import { LofiPhoneMockup } from '@/components/ui/LofiPhoneMockup';
import { LofiTabs } from '@/components/ui/LofiTabs';
import { LofiProgressBar } from '@/components/ui/LofiProgressBar';
import { LofiFeedbackBanner } from '@/components/ui/LofiFeedbackBanner';
import CURRICULA_JSON from '@/lib/curricula.json';
import { apiFetchSessionOnly, asList, findEnrollment } from '@/lib/api';
import {
  completedLessonSet,
  hasStoredSession,
  LS_ACCESS,
  LS_LEGACY_REFRESH,
} from '@/lib/course-progress';
import {
  submitCourseReset,
  submitDisplayName,
  USE_COURSE_RESET_MOCK,
} from '@/lib/course-reset-profile';
import styles from './phone-profile.module.css';

const DEFAULT_COURSE_ID = 'python_advanced';
const LS_DISPLAY_NAME = 'pe_goc_hoc_ten';
const LS_CHILL_DONE = 'pe_chill_done_lessons';

function lessonTotalFor(courseId: string): number {
  const mods = (
    CURRICULA_JSON as {
      CURRICULA?: Record<string, { modules?: { lessons?: string[] }[] }>;
    }
  ).CURRICULA?.[courseId]?.modules;
  if (!mods?.length) return 179;
  return mods.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0) || 179;
}

function lsGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export interface LofiPhoneProfileProps {
  courseId?: string;
  initialDoneLessons?: number;
  initialXp?: number;
  totalLessons?: number;
  courseTitle?: string;
  onResetProgress?: () => void;
}

export function LofiPhoneProfile({
  courseId = DEFAULT_COURSE_ID,
  initialDoneLessons = 0,
  initialXp = 0,
  totalLessons,
  courseTitle = 'Python cho Data Analyst',
  onResetProgress,
}: LofiPhoneProfileProps) {
  const resolvedTotal = totalLessons ?? lessonTotalFor(courseId);

  const [activeTab, setActiveTab] = useState<'me' | 'rank'>('me');
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState('Học viên Lofi');
  const [doneLessons, setDoneLessons] = useState(initialDoneLessons);
  const [xp, setXp] = useState(initialXp);
  const [badgesCount, setBadgesCount] = useState<number | null>(null);
  const [rankValue, setRankValue] = useState<number | null>(null);
  const [currentLessonNo, setCurrentLessonNo] = useState(
    initialDoneLessons > 0 ? Math.min(resolvedTotal, initialDoneLessons + 1) : 1,
  );

  // Form đổi tên hiển thị
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  // Modal xác nhận Học lại khoá
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const localName = lsGet(LS_DISPLAY_NAME);
      if (localName?.trim() && !cancelled) {
        setDisplayName(localName.trim());
      }

      const session = {
        access: lsGet(LS_ACCESS),
        legacyRefresh: lsGet(LS_LEGACY_REFRESH),
        cookie: typeof document === 'undefined' ? null : document.cookie,
      };
      if (!hasStoredSession(session)) return;

      const [userRes, enrolledRes, statsRes] = await Promise.all([
        apiFetchSessionOnly('/api/user').catch(() => null),
        apiFetchSessionOnly('/api/enrolled').catch(() => null),
        apiFetchSessionOnly('/api/stats').catch(() => null),
      ]);
      if (cancelled) return;

      if (userRes?.ok) {
        const u = (await userRes.json().catch(() => null)) as { name?: unknown } | null;
        if (!cancelled) {
          setSignedIn(true);
          if (typeof u?.name === 'string' && u.name.trim()) {
            setDisplayName(u.name.trim());
          }
        }
      }

      if (enrolledRes?.ok) {
        const data = (await enrolledRes.json().catch(() => null)) as unknown;
        const row = findEnrollment(asList(data, 'enrolled'), courseId);
        const raw = row?.completedLessonNumbers;
        if (!cancelled && Array.isArray(raw)) {
          const done = completedLessonSet(raw, resolvedTotal);
          setDoneLessons(done.size);
          setCurrentLessonNo(done.size >= resolvedTotal ? resolvedTotal : done.size + 1);
        }
      }

      if (statsRes?.ok) {
        const s = (await statsRes.json().catch(() => null)) as {
          xp?: unknown;
          badgesCount?: unknown;
          rank?: unknown;
        } | null;
        if (!cancelled) {
          if (typeof s?.xp === 'number' && Number.isFinite(s.xp)) {
            setXp(s.xp);
          }
          if (typeof s?.badgesCount === 'number' && Number.isFinite(s.badgesCount)) {
            setBadgesCount(s.badgesCount);
          }
          if (typeof s?.rank === 'number' && Number.isFinite(s.rank)) {
            setRankValue(s.rank);
          }
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [courseId, resolvedTotal]);

  const handleOpenRename = () => {
    setNameDraft(displayName);
    setNameError(null);
    setEditingName(true);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingName) return;
    setSavingName(true);
    setNameError(null);
    const result = await submitDisplayName(nameDraft, {
      signedIn,
      fetcher: apiFetchSessionOnly,
    });
    setSavingName(false);
    if (!result.ok) {
      setNameError(result.message);
      return;
    }
    setDisplayName(result.name);
    setEditingName(false);
    try {
      localStorage.setItem(LS_DISPLAY_NAME, result.name);
    } catch {
      /* private mode */
    }
    setBannerMessage(
      result.source === 'api'
        ? `Đã cập nhật tên hiển thị thành "${result.name}".`
        : `Đã lưu tên hiển thị cục bộ "${result.name}" (đăng nhập để đồng bộ máy chủ).`,
    );
  };

  const handleConfirmReset = async () => {
    if (resetBusy) return;
    setResetBusy(true);
    setResetError(null);
    const result = await submitCourseReset(courseId, {
      useMock: USE_COURSE_RESET_MOCK,
      fetcher: apiFetchSessionOnly,
    });
    setResetBusy(false);
    if (!result.ok) {
      setResetError(result.message);
      return;
    }

    setDoneLessons(result.data.completedLessons);
    setCurrentLessonNo(1);
    setShowResetModal(false);
    try {
      localStorage.removeItem(LS_CHILL_DONE);
    } catch {
      /* private mode */
    }
    setBannerMessage(
      result.source === 'mock'
        ? 'Đã đặt lại tiến độ về Bài 1 (dữ liệu mẫu). Điểm XP vẫn được giữ nguyên.'
        : 'Đã đặt lại tiến độ về Bài 1 và lưu lịch sử học tập. Điểm XP vẫn được giữ nguyên.',
    );
    if (onResetProgress) {
      onResetProgress();
    }
  };

  const progressPercent =
    resolvedTotal > 0 ? Math.min(100, Math.round((doneLessons / resolvedTotal) * 100)) : 0;

  const previewLeaderboard = [
    { rank: 1, name: 'Hoàng Nam', xp: 3420, isMe: false },
    { rank: 2, name: 'Thu Hà', xp: 2150, isMe: false },
    { rank: 3, name: displayName, xp, isMe: true },
    { rank: 4, name: 'Minh Trí', xp: 980, isMe: false },
    { rank: 5, name: 'Anh Quân', xp: 740, isMe: false },
  ];

  return (
    <LofiPhoneMockup
      header={
        <div className={styles.profileWrapper}>
          <div className={styles.statusBar}>
            <span>09:41</span>
            <div className={styles.statusIcons}>
              <span aria-hidden="true">📶</span>
              <span aria-hidden="true">🔋 100%</span>
            </div>
          </div>

          <LofiTabs
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as 'me' | 'rank');
              setBannerMessage(null);
            }}
            tabs={[
              { id: 'me', label: 'Hồ sơ' },
              { id: 'rank', label: 'Xếp hạng' },
            ]}
          />
        </div>
      }
    >
      {bannerMessage && (
        <LofiFeedbackBanner
          variant="success"
          message={bannerMessage}
          action={
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                opacity: 0.7,
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 4px',
              }}
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          }
        />
      )}

      {activeTab === 'me' ? (
        <>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {displayName.trim()[0]?.toUpperCase() || 'H'}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userRowTop}>
                <h2 className={styles.userName}>{displayName}</h2>
                {!editingName && (
                  <button
                    type="button"
                    className={styles.renameTriggerBtn}
                    onClick={handleOpenRename}
                  >
                    Đổi tên
                  </button>
                )}
              </div>
              <p className={styles.userStatus}>
                <span className={styles.statusDot} />
                {signedIn ? 'Đã đồng bộ tài khoản' : 'Giao diện xem trước'}
              </p>

              {editingName && (
                <form className={styles.renameForm} onSubmit={(e) => void handleSaveRename(e)}>
                  <div className={styles.renameInputRow}>
                    <input
                      type="text"
                      className={styles.renameInput}
                      aria-label="Tên hiển thị"
                      placeholder="Nhập tên hiển thị..."
                      maxLength={40}
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      disabled={savingName}
                    />
                    <button
                      type="submit"
                      className={styles.renameSaveBtn}
                      disabled={savingName}
                    >
                      {savingName ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      className={styles.renameCancelBtn}
                      onClick={() => {
                        setEditingName(false);
                        setNameError(null);
                      }}
                      disabled={savingName}
                    >
                      Huỷ
                    </button>
                  </div>
                  {nameError && (
                    <p className={styles.inlineError} role="alert">
                      {nameError}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{xp.toLocaleString('vi-VN')}</span>
              <span className={styles.statLabel}>tổng XP</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {doneLessons}/{resolvedTotal}
              </span>
              <span className={styles.statLabel}>bài đã xong</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {signedIn && badgesCount !== null ? badgesCount : '—'}
              </span>
              <span className={styles.statLabel}>huy hiệu</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {signedIn && rankValue !== null ? `#${rankValue}` : '—'}
              </span>
              <span className={styles.statLabel}>hạng theo XP</span>
            </div>
          </div>

          <div className={styles.courseCard}>
            <div className={styles.courseHeader}>
              <span className={styles.courseSectionTitle}>KHOÁ ĐANG HỌC</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                {progressPercent}%
              </span>
            </div>
            <h3 className={styles.courseName}>{courseTitle}</h3>
            <p className={styles.courseLessonTitle}>
              {doneLessons === 0 ? 'Bài 1: Khởi đầu' : `Bài ${currentLessonNo}: Tiếp tục lộ trình`}
            </p>
            <div className={styles.courseProgressWrap}>
              <LofiProgressBar value={progressPercent} variant="gradient" />
              <div className={styles.courseProgressInfo}>
                <span>
                  {doneLessons} / {resolvedTotal} bài đã xong
                </span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          </div>

          <div className={styles.optionsCard}>
            <div className={styles.optionsTitle}>Tuỳ chọn khoá học</div>
            <p className={styles.optionsDesc}>
              Bắt đầu ôn luyện lại từ bài đầu tiên mà không làm mất điểm tích luỹ.
            </p>
            <button
              type="button"
              className={styles.resetCourseBtn}
              disabled={!USE_COURSE_RESET_MOCK && !signedIn}
              onClick={() => {
                if (!USE_COURSE_RESET_MOCK && !signedIn) return;
                setResetError(null);
                setShowResetModal(true);
              }}
            >
              <span aria-hidden="true">🔄</span> Học lại khoá này
            </button>
            {!USE_COURSE_RESET_MOCK && !signedIn && (
              <p className={styles.mockHint}>
                Cần đăng nhập hoặc có phiên học để đặt lại tiến độ trên máy chủ.
              </p>
            )}
            {USE_COURSE_RESET_MOCK && (
              <p className={styles.mockHint}>
                Đang bật cờ dữ liệu giả (NEXT_PUBLIC_COURSE_RESET_MOCK=true).
              </p>
            )}
          </div>

          {showResetModal && (
            <div className={styles.modalOverlay} role="dialog" aria-modal="true">
              <div className={styles.modalCard}>
                <div className={styles.modalIcon} aria-hidden="true">
                  🔄
                </div>
                <h3 className={styles.modalTitle}>Học lại khoá học này?</h3>
                <p className={styles.modalText}>
                  Tiến độ bài học sẽ trở về 0 để bạn bắt đầu lại từ Bài 1.
                </p>
                <div className={styles.modalHighlight}>
                  Toàn bộ <strong>{xp.toLocaleString('vi-VN')} XP</strong> bạn đã tích lũy vẫn được bảo lưu trọn vẹn.
                </div>
                {resetError && (
                  <div className={styles.modalError} role="alert">
                    {resetError}
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => setShowResetModal(false)}
                    disabled={resetBusy}
                  >
                    Giữ nguyên
                  </button>
                  <button
                    type="button"
                    className={styles.modalConfirmBtn}
                    onClick={() => void handleConfirmReset()}
                    disabled={resetBusy}
                  >
                    {resetBusy ? 'Đang đặt lại...' : 'Xác nhận lại'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <ul className={styles.leaderboardList}>
            {previewLeaderboard.map((item) => (
              <li
                key={item.rank}
                className={`${styles.leaderboardItem} ${
                  item.isMe ? styles.leaderboardItemMine : ''
                }`}
              >
                <span className={styles.rankNumber}>{item.rank}</span>
                <span className={styles.rankAvatar}>
                  {item.name.trim()[0]?.toUpperCase() || '?'}
                </span>
                <span className={styles.rankName}>
                  {item.name}
                  {item.isMe && <span className={styles.mineBadge}>bạn</span>}
                </span>
                <span className={styles.rankXp}>{item.xp.toLocaleString('vi-VN')} XP</span>
              </li>
            ))}
          </ul>
          <p
            style={{
              fontSize: 11,
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: 12,
              lineHeight: 1.4,
            }}
          >
            Bảng xếp hạng hiển thị ở chế độ xem trước giao diện.
          </p>
        </div>
      )}
    </LofiPhoneMockup>
  );
}

export default LofiPhoneProfile;
