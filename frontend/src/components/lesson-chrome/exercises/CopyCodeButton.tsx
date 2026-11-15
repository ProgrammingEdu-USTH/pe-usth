'use client';

// NÚT "SAO CHÉP" cho khối code ở màn đọc (rút từ teardown Codecademy 16/11/2026: "Copy to
// clipboard" cạnh mọi khối mã). Người học tự thử trên máy hoặc dán sang /ide — chép tay từng
// dòng là chỗ phát sinh lỗi gõ sai mà không liên quan gì tới bài.
//
// Hai đường chép, vì Clipboard API chỉ chạy ở ngữ cảnh an toàn và khi trang có focus:
// `navigator.clipboard.writeText` trước, rồi `execCommand('copy')` trên một textarea tạm. Cả hai
// bọc try/catch — chép hỏng thì im lặng (nút không đổi nhãn), KHÔNG ném: một nút phụ không được
// làm trắng màn đọc. Không ghi sự kiện học nào (đổi PHIEN_BAN_DONG_Y là chuyện khác hẳn).
import { useEffect, useRef, useState } from 'react';

import styles from './exercises.module.css';

async function chepVaoBang(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* rơi xuống đường dự phòng */
  }
  try {
    const o = document.createElement('textarea');
    o.value = text;
    o.setAttribute('readonly', '');
    o.style.position = 'fixed';
    o.style.opacity = '0';
    document.body.appendChild(o);
    o.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(o);
    return ok;
  } catch {
    return false;
  }
}

export default function CopyCodeButton({ code }: { code: string }) {
  const [xong, setXong] = useState(false);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn hẹn giờ khi rời màn: setState sau khi unmount là một cảnh báo thừa.
  useEffect(
    () => () => {
      if (hen.current) clearTimeout(hen.current);
    },
    [],
  );

  async function bam() {
    if (!(await chepVaoBang(code))) return;
    setXong(true);
    if (hen.current) clearTimeout(hen.current);
    hen.current = setTimeout(() => setXong(false), 1800);
  }

  return (
    <>
      <button
        type="button"
        className={xong ? `${styles.copyBtn} ${styles.copyBtnDone}` : styles.copyBtn}
        onClick={bam}
        aria-label="Sao chép mã"
      >
        {/* Nhãn NGẮN và độ rộng không đổi: ở 390px thanh tiêu đề chỉ còn ~294px, nhãn "Sao chép" làm
            "ví dụ trong bài" và chính nó gãy làm hai dòng (đo trong Chrome). "Chép" ↔ "✓". */}
        {xong ? '✓' : 'Chép'}
      </button>
      {/* Người dùng trình đọc màn hình không thấy nhãn đổi: nói lại bằng vùng trạng thái. */}
      <span role="status" className={styles.copySr}>
        {xong ? 'Đã sao chép mã vào bộ nhớ tạm' : ''}
      </span>
    </>
  );
}
