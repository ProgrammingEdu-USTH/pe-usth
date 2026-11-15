'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LofiButton,
  LofiFeedbackBanner,
  LofiInput,
  LofiTabs,
} from '@/components/ui';
import styles from '@/components/ui/lofi-ui.module.css';

export interface DoorAuthViewProps {
  initialTab?: 'login' | 'register';
  onOpenRoom?: () => void;
}

export function DoorAuthView({
  initialTab = 'login',
  onOpenRoom,
}: DoorAuthViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Friendly feedback / notice
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'success' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') {
      if (!email.trim() || !password.trim()) {
        setFeedback({
          type: 'warning',
          title: 'Vui lòng điền đủ thông tin',
          message: 'Nhập email và mật khẩu để mở cửa.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        title: 'Chìa khoá hợp lệ!',
        message: `Chào mừng ${email} trở lại! (Đang ở chế độ xem trước UI).`,
      });
      if (onOpenRoom) {
        onOpenRoom();
      } else {
        router.push('/');
      }
    } else {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        setFeedback({
          type: 'warning',
          title: 'Vui lòng điền đủ thông tin',
          message: 'Họ tên, email và mật khẩu là các trường bắt buộc.',
        });
        return;
      }
      if (password !== confirmPassword) {
        setFeedback({
          type: 'warning',
          title: 'Mật khẩu chưa khớp',
          message: 'Mật khẩu và xác nhận mật khẩu cần giống nhau.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        title: 'Đã tạo chìa khoá phòng mới!',
        message: `Tài khoản cho "${fullName}" đã hợp lệ về mặt giao diện!`,
      });
      if (onOpenRoom) {
        onOpenRoom();
      } else {
        router.push('/');
      }
    }
  };

  const handleEnterAsGuest = () => {
    if (onOpenRoom) {
      onOpenRoom();
    } else {
      router.push('/');
    }
  };

  return (
    <div className={styles.doorGatewayWrapper}>
      {/* Thẻ Chìa khoá / Cánh cửa vào Bàn học Lofi */}
      <div className={styles.doorCard}>
        {/* Phần đầu thẻ: Biểu tượng Chìa khoá & Tiêu đề phòng */}
        <div className={styles.doorHeader}>
          <div className={styles.doorKeyBadge}>
            <span aria-hidden="true">🔑</span>
            <span>Chìa khoá mở cửa Bàn học</span>
          </div>

          <h1 className={styles.doorTitle}>
            {activeTab === 'login' ? 'Mở cửa vào Bàn học' : 'Tạo chìa khoá phòng mới'}
          </h1>
          <p className={styles.doorSubtitle}>
            {activeTab === 'login'
              ? 'Tra chìa khoá tài khoản để bước vào không gian học tập Lofi của bạn'
              : 'Đăng ký tài khoản để bắt đầu lưu tiến độ và xếp hạng'}
          </p>
        </div>

        {/* Thanh gạt chuyển đổi tab */}
        <LofiTabs
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setFeedback(null);
          }}
          tabs={[
            { id: 'login', label: 'Đăng nhập vào phòng' },
            { id: 'register', label: 'Tạo chìa khoá mới' },
          ]}
        />

        {/* Thông báo phản hồi nếu có */}
        {feedback && (
          <LofiFeedbackBanner
            variant={feedback.type}
            title={feedback.title}
            message={feedback.message}
            action={
              <button
                type="button"
                onClick={() => setFeedback(null)}
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

        {/* Form nhập liệu */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {activeTab === 'register' && (
            <LofiInput
              label="Họ và tên"
              placeholder="ví dụ: Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<span style={{ fontSize: '13px' }}>👤</span>}
            />
          )}

          <LofiInput
            label="Địa chỉ Email"
            type="email"
            placeholder="tenban@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<span style={{ fontSize: '13px' }}>✉️</span>}
          />

          <LofiInput
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<span style={{ fontSize: '13px' }}>🔒</span>}
            rightAction={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'inherit',
                  padding: '2px',
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            }
          />

          {activeTab === 'register' && (
            <LofiInput
              label="Xác nhận mật khẩu"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu phía trên"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<span style={{ fontSize: '13px' }}>🔑</span>}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'inherit',
                    padding: '2px',
                  }}
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? '👁️' : '🙈'}
                </button>
              }
            />
          )}

          {activeTab === 'login' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: '#5b6890',
                margin: '2px 0 4px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--amber, #f59e0b)', cursor: 'pointer' }}
                />
                <span>Ghi nhớ phiên học</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  setFeedback({
                    type: 'info',
                    title: 'Quên mật khẩu?',
                    message: 'Tính năng khôi phục mật khẩu qua email sẽ được kết nối sau.',
                  })
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4a5a80',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '12.5px',
                  textDecoration: 'underline',
                  fontFamily: 'inherit',
                }}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Nút hành động chính: Mở cửa vào phòng */}
          <div style={{ marginTop: '6px' }}>
            <LofiButton
              variant="primary"
              size="lg"
              style={{
                width: '100%',
                fontFamily: 'var(--f-display, sans-serif)',
                fontSize: '15px',
              }}
              rightIcon={<span>{activeTab === 'login' ? '🔑' : '✨'}</span>}
            >
              {activeTab === 'login' ? 'Mở cửa vào Bàn học' : 'Tạo tài khoản & Mở cửa'}
            </LofiButton>
          </div>
        </form>

        {/* Đường ngăn cách hoặc tiếp tục với */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '4px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span
            style={{
              fontSize: '11px',
              color: '#7a86a8',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            hoặc đăng nhập nhanh qua
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Nút đăng nhập Google & Facebook */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <LofiButton
            variant="glass"
            size="md"
            type="button"
            onClick={() =>
              setFeedback({
                type: 'info',
                title: 'Đăng nhập Google',
                message: 'Endpoint /auth/google đã sẵn sàng ở backend và sẽ kết nối sau.',
              })
            }
            style={{
              background: '#f8fafd',
              color: '#1c2540',
              border: '1px solid #d6e2f4',
            }}
            leftIcon={
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.1.2-1.9.4-2.7L1.6 6.4C.6 8.3 0 10.5 0 12c0 1.6.6 3.7 1.6 5.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                />
              </svg>
            }
          >
            Google
          </LofiButton>

          <LofiButton
            variant="glass"
            size="md"
            type="button"
            onClick={() =>
              setFeedback({
                type: 'info',
                title: 'Đăng nhập Facebook',
                message: 'Endpoint /auth/facebook đã sẵn sàng ở backend và sẽ kết nối sau.',
              })
            }
            style={{
              background: '#f8fafd',
              color: '#1c2540',
              border: '1px solid #d6e2f4',
            }}
            leftIcon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
          >
            Facebook
          </LofiButton>
        </div>

        {/* Tùy chọn vào phòng với tư cách Khách */}
        <div className={styles.doorGuestOption}>
          <button
            type="button"
            onClick={handleEnterAsGuest}
            className={styles.doorGuestLink}
          >
            <span>Chưa muốn đăng ký? Vào phòng với tư cách Khách</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DoorAuthView;
