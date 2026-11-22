import type { Metadata } from 'next';
import OnboardingSurveyView from '@/components/onboarding/OnboardingSurveyView';
import LofiDarkPageShell from '@/components/ui/LofiDarkPageShell';

export const metadata: Metadata = {
  title: 'Khảo sát định vị trình độ — Programming EDU',
  description: 'Khảo sát nhanh để xác định chặng học Python phù hợp nhất với bạn.',
};

export default function OnboardingPage() {
  return (
    <LofiDarkPageShell>
      <OnboardingSurveyView />
    </LofiDarkPageShell>
  );
}
