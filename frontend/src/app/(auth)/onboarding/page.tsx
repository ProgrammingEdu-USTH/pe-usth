import type { Metadata } from 'next';
import OnboardingSurveyView from '@/components/onboarding/OnboardingSurveyView';

export const metadata: Metadata = {
  title: 'Khảo sát định vị trình độ — Programming EDU',
  description: 'Khảo sát nhanh 5 câu hỏi để xác định chặng học Python phù hợp nhất với bạn.',
};

export default function OnboardingPage() {
  return <OnboardingSurveyView />;
}
