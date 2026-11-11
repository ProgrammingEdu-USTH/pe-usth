import type { Metadata } from 'next';
import DoorAuthView from '@/components/auth/DoorAuthView';

export const metadata: Metadata = {
  title: 'Tạo chìa khóa phòng mới — Programming EDU',
  description: 'Đăng ký tài khoản học tập Lofi để lưu tiến độ và bảng xếp hạng.',
};

export default function RegisterPage() {
  return <DoorAuthView initialTab="register" />;
}
