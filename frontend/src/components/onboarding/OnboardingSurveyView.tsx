'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LofiButton, LofiProgressBar } from '@/components/ui';
import styles from './onboarding-survey.module.css';

interface MockQuestion {
  id: number;
  topic: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
}

const MOCK_QUESTIONS: MockQuestion[] = [
  {
    id: 1,
    topic: 'Cú pháp & Danh sách',
    question: 'Kết quả của biểu thức list comprehension sau là gì?',
    code: '[x * 2 for x in range(3)]',
    options: ['[0, 2, 4]', '[2, 4, 6]', '[0, 1, 2]', '[1, 2, 3]'],
    correctIndex: 0,
  },
  {
    id: 2,
    topic: 'Quản lý tài nguyên',
    question: 'Cú pháp chuẩn nào giúp tự động đóng tệp sau khi đọc xong trong Python?',
    code: 'with open("data.txt", "r") as f:\n    content = f.read()',
    options: [
      'with open(...) as f:',
      'try...finally: f.close()',
      'file.auto_close(...)',
      'using open(...) as f:',
    ],
    correctIndex: 0,
  },
  {
    id: 3,
    topic: 'Tiến trình & Hệ thống',
    question: 'Lệnh nào trong module subprocess an toàn nhất để thực thi lệnh hệ thống dạng danh sách đối số?',
    code: 'subprocess.run(["ls", "-l"], check=True)',
    options: [
      'subprocess.run(["ls", "-l"])',
      'os.system("ls -l")',
      'subprocess.Popen(shell=True)',
      'exec("ls -l")',
    ],
    correctIndex: 0,
  },
  {
    id: 4,
    topic: 'Xử lý đồng thời',
    question: 'Cơ chế nào trong CPython giới hạn chỉ một luồng Python thực thi bytecode tại một thời điểm?',
    options: [
      'GIL (Global Interpreter Lock)',
      'Process Semaphore',
      'Thread Barrier',
      'Atomic Transaction',
    ],
    correctIndex: 0,
  },
  {
    id: 5,
    topic: 'Khoa học dữ liệu',
    question: 'Cấu trúc dữ liệu dạng bảng 2 chiều có gắn nhãn hàng và cột tiêu chuẩn trong thư viện pandas là gì?',
    options: ['DataFrame', 'Series', 'ndarray', 'Tensor'],
    correctIndex: 0,
  },
];

export function OnboardingSurveyView() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  const totalQuestions = MOCK_QUESTIONS.length;
  const currentQ = MOCK_QUESTIONS[currentIdx];
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100);

  const handleSelectOption = (optIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIdx,
    }));
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setIsFinished(false);
  };

  // Tính số câu trả lời khớp với đáp án mẫu
  const correctCount = Object.entries(selectedAnswers).filter(
    ([qIdx, ansIdx]) => MOCK_QUESTIONS[Number(qIdx)]?.correctIndex === ansIdx,
  ).length;

  // Đề xuất chặng học tương ứng
  let levelTitle = 'Khởi đầu vững chắc';
  let recommendedModule = 'Chặng 1: Tiến trình và subprocess';
  let recommendationNote =
    'Chặng học này sẽ giúp bạn củng cố kiến thức nền tảng về tương tác hệ thống và lệnh subprocess trước khi đi xa hơn.';

  if (correctCount >= 3 && correctCount <= 4) {
    levelTitle = 'Nền tảng vững vàng';
    recommendedModule = 'Chặng 2: Đa luồng và đồng thời';
    recommendationNote =
      'Bạn đã nắm chắc nền tảng cơ bản, chặng Đa luồng và Xử lý bất đồng bộ sẽ là bước đệm lý tưởng tiếp theo.';
  } else if (correctCount === 5) {
    levelTitle = 'Sẵn sàng bứt phá';
    recommendedModule = 'Chặng 5: Thư viện NumPy và Phân tích dữ liệu';
    recommendationNote =
      'Kiến thức của bạn rất vững! Bạn có thể tiến thẳng tới các chặng chuyên sâu về Khoa học dữ liệu.';
  }

  const LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <div className={styles.onboardingPageWrap}>
      {/* Thanh điều hướng trên cùng */}
      <div className={styles.topBar}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <LofiButton
            variant="glass"
            size="sm"
            leftIcon={<span aria-hidden="true">←</span>}
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#1c2540',
              borderColor: 'rgba(214, 226, 244, 0.8)',
              boxShadow: '0 4px 14px rgba(30, 50, 90, 0.08)',
            }}
          >
            Về Bàn học
          </LofiButton>
        </Link>

        {!isFinished && (
          <Link href="/" className={styles.skipBtn}>
            <span>Bỏ qua khảo sát</span>
            <span aria-hidden="true">✕</span>
          </Link>
        )}
      </div>

      {/* Thẻ khảo sát định vị trình độ */}
      <div className={styles.surveyCard}>
        {!isFinished ? (
          <>
            {/* Header thẻ khảo sát */}
            <div className={styles.headerMeta}>
              <div className={styles.badgeTag}>
                <span aria-hidden="true">🧭</span>
                <span>Khảo sát định vị</span>
              </div>
              <span className={styles.stepIndicator}>
                Câu {currentIdx + 1} / {totalQuestions}
              </span>
            </div>

            {/* Thanh tiến độ khảo sát */}
            <div className={styles.progressBarWrap}>
              <LofiProgressBar value={progressPercent} variant="gradient" />
            </div>

            {/* Nhãn chủ đề */}
            <div className={styles.topicLabel}>{currentQ.topic}</div>

            {/* Câu hỏi */}
            <h2 className={styles.questionText}>{currentQ.question}</h2>

            {/* Đoạn mã minh hoạ (nếu có) */}
            {currentQ.code && (
              <div className={styles.codeBox}>
                <pre className={styles.codePre}>{currentQ.code}</pre>
              </div>
            )}

            {/* Danh sách 4 phương án lựa chọn */}
            <div className={styles.optionsList}>
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentIdx] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    className={`${styles.optionBtn} ${
                      isSelected ? styles.optionBtnSelected : ''
                    }`}
                    onClick={() => handleSelectOption(optIdx)}
                  >
                    <span
                      className={`${styles.optionLetter} ${
                        isSelected ? styles.optionLetterSelected : ''
                      }`}
                    >
                      {LETTERS[optIdx]}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Thanh điều hướng câu hỏi */}
            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.prevBtn}
                onClick={handlePrev}
                disabled={currentIdx === 0}
              >
                <span aria-hidden="true">←</span> Câu trước
              </button>

              <LofiButton
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={selectedAnswers[currentIdx] === undefined}
                rightIcon={<span aria-hidden="true">→</span>}
              >
                {currentIdx === totalQuestions - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
              </LofiButton>
            </div>
          </>
        ) : (
          /* Màn hình kết quả phân loại */
          <div className={styles.resultCard}>
            <div className={styles.resultIcon} aria-hidden="true">
              🎯
            </div>
            <h2 className={styles.resultTitle}>{levelTitle}</h2>
            <p className={styles.resultSubtitle}>
              Bạn đã trả lời đúng {correctCount} / {totalQuestions} câu hỏi khảo sát nhanh.
            </p>

            <div className={styles.resultRecBox}>
              <div className={styles.recLabel}>LỘ TRÌNH ĐỀ XUẤT CHO BẠN</div>
              <h3 className={styles.recCourseTitle}>{recommendedModule}</h3>
              <p className={styles.recDesc}>{recommendationNote}</p>
            </div>

            <div className={styles.resultActionRow}>
              <button
                type="button"
                className={styles.retakeBtn}
                onClick={handleRetake}
              >
                Làm lại bài test <span aria-hidden="true">↻</span>
              </button>

              <Link href="/" style={{ textDecoration: 'none' }}>
                <LofiButton
                  variant="primary"
                  size="md"
                  rightIcon={<span aria-hidden="true">→</span>}
                >
                  Bắt đầu học ngay
                </LofiButton>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingSurveyView;
