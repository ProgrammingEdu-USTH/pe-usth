'use client';

import React, { useState } from 'react';
import { LofiPhoneMockup } from '@/components/ui/LofiPhoneMockup';
import { LofiTabs } from '@/components/ui/LofiTabs';
import { LofiProgressBar } from '@/components/ui/LofiProgressBar';
import { LofiFeedbackBanner } from '@/components/ui/LofiFeedbackBanner';
import styles from './phone-profile.module.css';

export interface LofiPhoneProfileProps {
  initialDoneLessons?: number;
  initialXp?: number;
  totalLessons?: number;
  courseTitle?: string;
  onResetProgress?: () => void;
}

export function LofiPhoneProfile({
  initialDoneLessons = 12,
  initialXp = 1250,
  totalLessons = 48,
  courseTitle = 'Python nâng cao',
  onResetProgress,
}: LofiPhoneProfileProps) {
  const [activeTab, setActiveTab] = useState<'me' | 'rank'>('me');
  const [doneLessons, setDoneLessons] = useState(initialDoneLessons);
  const [xp] = useState(initialXp);
  const [currentLessonNo, setCurrentLessonNo] = useState(initialDoneLessons > 0 ? initialDoneLessons + 1 : 1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const handleConfirmReset = () => {
    setDoneLessons(0);
    setCurrentLessonNo(1);
    setShowResetModal(false);
    setBannerMessage('Đã đặt lại tiến độ về Bài 1. Điểm XP vẫn được giữ nguyên.');
    if (onResetProgress) {
      onResetProgress();
    }
  };

  const progressPercent = Math.round((doneLessons / totalLessons) * 100);

  // Dữ liệu bảng xếp hạng xem trước
  const previewLeaderboard = [
    { rank: 1, name: 'Hoàng Nam', xp: 3420, isMe: false },
    { rank: 2, name: 'Thu Hà', xp: 2150, isMe: false },
    { rank: 3, name: 'Học viên Lofi', xp, isMe: true },
    { rank: 4, name: 'Minh Trí', xp: 980, isMe: false },
    { rank: 5, name: 'Anh Quân', xp: 740, isMe: false },
  ];

  return (
    <LofiPhoneMockup
      header={
        <div className={styles.profileWrapper}>
          {/* Thanh trạng thái điện thoại */}
          <div className={styles.statusBar}>
            <span>09:41</span>
            <div className={styles.statusIcons}>
              <span aria-hidden="true">📶</span>
              <span aria-hidden="true">🔋 100%</span>
            </div>
          </div>

          {/* Thanh chuyển tab phân đoạn */}
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
      {/* Thông báo phản hồi nếu có */}
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
          {/* Thẻ người dùng */}
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>H</div>
            <div className={styles.userInfo}>
              <h3 className={styles.userName}>Học viên Lofi</h3>
              <p className={styles.userStatus}>
                <span className={styles.statusDot} />
                Giao diện xem trước
              </p>
            </div>
          </div>

          {/* Lưới 4 chỉ số thống kê */}
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{xp.toLocaleString('vi-VN')}</span>
              <span className={styles.statLabel}>tổng XP</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {doneLessons}/{totalLessons}
              </span>
              <span className={styles.statLabel}>bài đã xong</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>5</span>
              <span className={styles.statLabel}>huy hiệu</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>#3</span>
              <span className={styles.statLabel}>hạng theo XP</span>
            </div>
          </div>

          {/* Thẻ tiến độ khoá học */}
          <div className={styles.courseCard}>
            <div className={styles.courseHeader}>
              <span className={styles.courseSectionTitle}>KHOÁ ĐANG HỌC</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                {progressPercent}%
              </span>
            </div>
            <h4 className={styles.courseName}>{courseTitle}</h4>
            <p className={styles.courseLessonTitle}>
              {doneLessons === 0 ? 'Bài 1: Khởi đầu' : `Bài ${currentLessonNo}: Ôn tập tiến độ`}
            </p>
            <div className={styles.courseProgressWrap}>
              <LofiProgressBar value={progressPercent} variant="gradient" />
              <div className={styles.courseProgressInfo}>
                <span>
                  {doneLessons} / {totalLessons} bài đã xong
                </span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Tuỳ chọn khoá học & Nút Học lại khoá này */}
          <div className={styles.optionsCard}>
            <div className={styles.optionsTitle}>⚙️ Tuỳ chọn khoá học</div>
            <p className={styles.optionsDesc}>
              Bắt đầu ôn luyện lại từ bài đầu tiên mà không làm mất điểm tích luỹ.
            </p>
            <button
              type="button"
              className={styles.resetCourseBtn}
              onClick={() => setShowResetModal(true)}
            >
              <span aria-hidden="true">🔄</span> Học lại khoá này
            </button>
          </div>

          {/* Modal xác nhận Học lại khoá */}
          {showResetModal && (
            <div className={styles.modalOverlay} role="dialog" aria-modal="true">
              <div className={styles.modalCard}>
                <div className={styles.modalIcon} aria-hidden="true">
                  🔄
                </div>
                <h4 className={styles.modalTitle}>Học lại khoá học này?</h4>
                <p className={styles.modalText}>
                  Tiến độ bài học sẽ trở về 0 để bạn bắt đầu lại từ Bài 1.
                </p>
                <div className={styles.modalHighlight}>
                  💡 Toàn bộ <strong>{xp.toLocaleString('vi-VN')} XP</strong> bạn đã tích lũy vẫn được bảo lưu trọn vẹn.
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => setShowResetModal(false)}
                  >
                    Giữ nguyên
                  </button>
                  <button
                    type="button"
                    className={styles.modalConfirmBtn}
                    onClick={handleConfirmReset}
                  >
                    Xác nhận lại
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Tab Xếp hạng */
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
