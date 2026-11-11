'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  LofiButton,
  LofiFeedbackBanner,
  LofiInput,
  LofiPhoneMockup,
  LofiTabs,
} from '@/components/ui';

export interface PhoneAuthViewProps {
  initialTab?: 'login' | 'register';
  showBackToHome?: boolean;
}

export function PhoneAuthView({
  initialTab = 'login',
  showBackToHome = true,
}: PhoneAuthViewProps) {
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

  // Friendly feedback
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
          message: 'Nhập email và mật khẩu để trải nghiệm thử.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        title: 'Thử nghiệm Đăng nhập thành công!',
        message: `Chào mừng ${email}! (Giao diện tĩnh đã sẵn sàng kết nối API).`,
      });
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
          message: 'Mật khẩu và xác nhận mật khẩu phải giống nhau.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        title: 'Thử nghiệm Đăng ký thành công!',
        message: `Tài khoản cho "${fullName}" đã hợp lệ về mặt giao diện!`,
      });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: '20px 16px',
        boxSizing: 'border-box',
        backgroundImage: 'linear-gradient(rgba(248, 240, 252, 0.35), rgba(225, 215, 240, 0.5)), url(/goc-hoc/room-blur.webp)',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--f-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      {/* Nút quay lại trang chủ góc học */}
      {showBackToHome && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <LofiButton
              variant="glass"
              size="sm"
              leftIcon={<span>←</span>}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                color: '#1c2540',
                borderColor: 'rgba(214, 226, 244, 0.8)',
                boxShadow: '0 4px 14px rgba(30, 50, 90, 0.1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              Quay lại Bàn học
            </LofiButton>
          </Link>
        </div>
      )}

      {/* Chiếc điện thoại Góc học */}
      <LofiPhoneMockup
        showGlow
        showDecorations
        header={
          <LofiTabs
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setFeedback(null);
            }}
            tabs={[
              { id: 'login', label: 'Đăng nhập' },
              { id: 'register', label: 'Đăng ký' },
            ]}
          />
        }
      >
        {/* Khối hồ sơ / lời chào (đồng bộ phong cách .prof .who trong scene.css) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 2px 2px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(150deg, #ffcf9a, #ff9db8)',
              color: '#3a1d2a',
              fontFamily: 'var(--f-display, sans-serif)',
              fontWeight: 700,
              fontSize: '20px',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(255, 157, 184, 0.25)',
            }}
          >
            {activeTab === 'login' ? 'K' : '✨'}
          </div>
          <div>
            <b
              style={{
                display: 'block',
                fontFamily: 'var(--f-display, sans-serif)',
                fontSize: '18px',
                lineHeight: 1.15,
                color: '#1c2540',
              }}
            >
              {activeTab === 'login' ? 'Khách' : 'Tạo tài khoản'}
            </b>
            <small
              style={{
                color: '#5b6890',
                fontSize: '12px',
                display: 'block',
                marginTop: '2px',
              }}
            >
              {activeTab === 'login'
                ? 'đang có phiên học trên máy này'
                : 'lưu tiến độ bài học & bảng xếp hạng'}
            </small>
          </div>
        </div>

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

        {/* Khối thẻ trắng chứa Form nhập liệu */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 14px',
            boxShadow: '0 1px 4px rgba(30, 50, 90, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {activeTab === 'register' && (
              <LofiInput
                label="Họ và tên"
                placeholder="ví dụ: Sơn USTH"
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
                placeholder="Nhập lại mật khẩu"
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
                  fontSize: '12px',
                  color: '#5b6890',
                  margin: '1px 0',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--amber, #f59e0b)', cursor: 'pointer' }}
                  />
                  <span>Ghi nhớ</span>
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
                    fontSize: '12px',
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {/* Nút chính vàng hổ phách */}
            <div style={{ marginTop: '4px' }}>
              <LofiButton
                variant="primary"
                size="md"
                style={{
                  width: '100%',
                  fontFamily: 'var(--f-display, sans-serif)',
                  fontSize: '14px',
                }}
                rightIcon={<span>{activeTab === 'login' ? '➜' : '✨'}</span>}
              >
                {activeTab === 'login' ? 'Vào bàn học' : 'Tạo tài khoản'}
              </LofiButton>
            </div>
          </form>
        </div>

        {/* Khối thẻ trắng chứa Đăng nhập nhanh Google / Facebook */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '10px 14px',
            boxShadow: '0 1px 4px rgba(30, 50, 90, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#7a86a8',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            hoặc đăng nhập nhanh với
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <LofiButton
              variant="glass"
              size="sm"
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
                <svg width="14" height="14" viewBox="0 0 24 24">
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
              size="sm"
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              }
            >
              Facebook
            </LofiButton>
          </div>
        </div>

        {/* Dòng chú thích nhẹ tương tự .sample trong scene.css */}
        <div
          style={{
            fontSize: '11px',
            color: '#7a86a8',
            textAlign: 'center',
            padding: '2px 0 6px',
            userSelect: 'none',
          }}
        >
          Chưa kết nối backend · Giao diện xem trước
        </div>
      </LofiPhoneMockup>
    </div>
  );
}

export default PhoneAuthView;
