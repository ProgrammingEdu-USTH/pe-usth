import type { Metadata } from 'next';
import DoorAuthView from '@/components/auth/DoorAuthView';
import LofiDarkPageShell from '@/components/ui/LofiDarkPageShell';

export const metadata: Metadata = {
  title: 'Mở cửa vào Bàn học — Programming EDU',
  description: 'Đăng nhập vào bàn học Lofi để tiếp tục hành trình lập trình Python.',
};

export default function LoginPage() {
  return (
    <LofiDarkPageShell>
      <DoorAuthView initialTab="login" />
    </LofiDarkPageShell>
  );
}
