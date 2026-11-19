/**
 * bookshelf-catalog.ts — Nguồn dữ liệu và cấu hình chủ đề cho Tủ sách 3 khoá học
 * (Python, SQL, Machine Learning).
 *
 * · Python (`python_advanced`): đọc THẬT 11 học phần / 179 bài từ curricula.json
 *   và thời lượng `~41 giờ` từ catalog.ts.
 * · SQL (`db_design`): đọc THẬT 3 học phần / 20 bài từ curricula.json và thời
 *   lượng `~6 giờ` khớp prisma/seed-courses.js.
 * · Machine Learning (`machine-learning`): dữ liệu mock theo thiết kế Figma
 *   (4 chặng / 28 bài / ~19 giờ), gắn `isMock: true` và `lessonBaseHref: null`
 *   để không tạo liên kết chết 404 tới route chưa tồn tại.
 */

import { COURSES } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import { splitLessonTitle, type ModuleRow } from '@/lib/goc-hoc';

export type BookshelfSlug = 'python' | 'sql' | 'machine-learning';

export type BookshelfLessonItem = {
  /** Chỉ số 0-based trong toàn khoá (trùng query `?lesson=`). */
  index: number;
  /** Số thứ tự bài 1-based trong toàn khoá. */
  no: number;
  code: string;
  title: string;
  minutes: number;
};

export type BookshelfStage = {
  stageNumber: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  estimatedHoursLabel: string;
  summaryLine: string;
  lessons: BookshelfLessonItem[];
};

export type BookshelfCourse = {
  slug: BookshelfSlug;
  courseId: string;
  title: string;
  shortSpineLabel: string;
  badgeText?: string;
  shelfTier: 'active' | 'new';
  tagline: string;
  colorNote: string;
  propsSummary: string;
  outcomes: string[];
  durationLabel: string;
  lessonCount: number;
  stageCount: number;
  lessonBaseHref: string | null;
  isMock: boolean;
  statusNote?: string;
  stages: BookshelfStage[];
};

export type ComingSoonBook = {
  title: string;
  spineLabel: string;
};

type RawCurriculaShape = {
  CURRICULA: Record<string, { modules?: ModuleRow[] }>;
};

const RAW_CURRICULA = (CURRICULA_JSON as unknown as RawCurriculaShape).CURRICULA;

function splitStageHeading(rawTitle: string, stageNumber: number): { shortTitle: string; subtitle: string } {
  const dotIdx = rawTitle.indexOf(' · ');
  if (dotIdx >= 0) {
    return {
      shortTitle: `Chặng ${stageNumber}`,
      subtitle: rawTitle.slice(dotIdx + 3).trim(),
    };
  }
  const colonIdx = rawTitle.indexOf(': ');
  if (colonIdx >= 0) {
    return {
      shortTitle: `Chặng ${stageNumber}`,
      subtitle: rawTitle.slice(colonIdx + 2).trim(),
    };
  }
  return {
    shortTitle: `Chặng ${stageNumber}`,
    subtitle: rawTitle.trim(),
  };
}

function parseSqlLessonName(raw: string, no: number): { code: string; title: string } {
  const cleaned = raw.replace(/\s*\(Bài\s*\d+\)\s*$/i, '').trim();
  const code = `SQL${String(no).padStart(2, '0')}`;
  return { code, title: cleaned };
}

function buildStagesFromModules(
  modules: ModuleRow[],
  totalHours: number,
  mode: 'python' | 'sql',
): { stages: BookshelfStage[]; totalLessons: number } {
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  let cursor = 0;

  const stages: BookshelfStage[] = modules.map((mod, mIdx) => {
    const stageNumber = mIdx + 1;
    const { shortTitle, subtitle } = splitStageHeading(mod.title, stageNumber);

    const lessons: BookshelfLessonItem[] = mod.lessons.map((raw) => {
      const index = cursor;
      const no = cursor + 1;
      cursor += 1;

      if (mode === 'python') {
        const parsed = splitLessonTitle(raw);
        return {
          index,
          no,
          code: parsed.code || `B${String(no).padStart(2, '0')}`,
          title: parsed.title,
          minutes: 12,
        };
      }

      const parsedSql = parseSqlLessonName(raw, no);
      return {
        index,
        no,
        code: parsedSql.code,
        title: parsedSql.title,
        minutes: 18,
      };
    });

    const estHours = Math.max(
      1,
      Math.round((lessons.length / Math.max(1, totalLessons)) * totalHours),
    );
    const previewTitles = lessons.slice(0, 3).map((l) => l.title);
    const extraCount = Math.max(0, lessons.length - previewTitles.length);
    const summaryLine =
      extraCount > 0
        ? `${previewTitles.join(' · ')} · +${extraCount} bài`
        : previewTitles.join(' · ');

    return {
      stageNumber,
      title: `${shortTitle} · ${subtitle}`,
      shortTitle,
      subtitle,
      estimatedHoursLabel: `~${estHours} giờ`,
      summaryLine,
      lessons,
    };
  });

  return { stages, totalLessons };
}

function buildMachineLearningStages(): BookshelfStage[] {
  const rawStages: { subtitle: string; hours: number; titles: string[] }[] = [
    {
      subtitle: 'Dữ liệu & chuẩn bị',
      hours: 4,
      titles: [
        'Tổng quan học máy & bài toán dự đoán',
        'Đọc dữ liệu CSV và kiểm tra phân phối',
        'Làm sạch dữ liệu thiếu & giá trị ngoại lai',
        'Mã hoá biến phân loại (One-Hot & Ordinal)',
        'Chuẩn hoá thang đo dữ liệu (Scaling)',
        'Chia tập train / validation / test đúng chuẩn',
        'Xây dựng Pipeline tiền xử lý tái sử dụng',
      ],
    },
    {
      subtitle: 'Hồi quy',
      hours: 4,
      titles: [
        'Hồi quy tuyến tính đơn biến',
        'Hàm mất mát MSE & trực giác tối ưu',
        'Thuật toán Gradient Descent từng bước',
        'Hồi quy đa biến và tương quan đặc trưng',
        'Đánh giá mô hình bằng RMSE & R²',
        'Hiện tượng quá khớp (Overfitting) & Regularization',
        'Thực hành dự đoán giá nhà thực tế',
      ],
    },
    {
      subtitle: 'Phân loại',
      hours: 5,
      titles: [
        'Bài toán phân loại nhị phân & hàm Sigmoid',
        'Hồi quy Logistic & ranh giới quyết định',
        'Ma trận nhầm lẫn (Confusion Matrix)',
        'Độ chính xác, Precision, Recall & F1-Score',
        'Cây quyết định (Decision Tree) & độ tinh khiết Gini',
        'Rừng ngẫu nhiên (Random Forest) kết hợp nhiều cây',
        'Thực hành phân loại giao dịch bất thường',
      ],
    },
    {
      subtitle: 'Mạng nơ-ron',
      hours: 6,
      titles: [
        'Mô hình Perceptron & trọng số học tập',
        'Hàm kích hoạt ReLU, Tanh và Softmax',
        'Kiến trúc mạng nơ-ron nhiều lớp (MLP)',
        'Lan truyền xuôi (Forward Propagation)',
        'Lan truyền ngược (Backpropagation) & chuỗi đạo hàm',
        'Kiểm soát Overfitting bằng Dropout & Early Stopping',
        'Xây dựng bộ nhận diện chữ số viết tay đầu tiên',
      ],
    },
  ];

  let cursor = 0;
  return rawStages.map((s, idx) => {
    const stageNumber = idx + 1;
    const lessons: BookshelfLessonItem[] = s.titles.map((title) => {
      const index = cursor;
      const no = cursor + 1;
      cursor += 1;
      return {
        index,
        no,
        code: `ML${String(no).padStart(2, '0')}`,
        title,
        minutes: 15,
      };
    });

    const preview = lessons.slice(0, 3).map((l) => l.title).join(' · ');
    return {
      stageNumber,
      title: `Chặng ${stageNumber} · ${s.subtitle}`,
      shortTitle: `Chặng ${stageNumber}`,
      subtitle: s.subtitle,
      estimatedHoursLabel: `~${s.hours} giờ`,
      summaryLine: `${preview} · +${lessons.length - 3} bài`,
      lessons,
    };
  });
}

function createCatalog(): BookshelfCourse[] {
  const pythonCatalog = COURSES.find((c) => c.id === 'python_advanced');
  const pythonModules = RAW_CURRICULA.python_advanced?.modules ?? [];
  const pythonBuilt = buildStagesFromModules(pythonModules, 41, 'python');

  const sqlModules = RAW_CURRICULA.db_design?.modules ?? [];
  const sqlBuilt = buildStagesFromModules(sqlModules, 6, 'sql');

  const mlStages = buildMachineLearningStages();
  const mlTotal = mlStages.reduce((s, st) => s + st.lessons.length, 0);

  return [
    {
      slug: 'python',
      courseId: 'python_advanced',
      title: 'Python',
      shortSpineLabel: 'PYTHON',
      shelfTier: 'active',
      tagline:
        'Từ phép tính đầu tiên đến xử lý dữ liệu và trực quan hoá — học bằng cách chạy code thật.',
      colorNote: 'Xanh bụi & vàng nắng',
      propsSummary: 'Terminal · Thư viện · Vịt cao su · Rắn bông',
      outcomes: [
        'Viết chương trình Python từ những phép tính đầu tiên',
        'Xử lý file và dữ liệu với pandas',
        'Trực quan hoá số liệu bằng Matplotlib, seaborn, Plotly',
        'Thực hành OOP, tiến trình, Tkinter và bộ dữ liệu thật',
      ],
      durationLabel: pythonCatalog?.duration ?? '~41 giờ',
      lessonCount: pythonBuilt.totalLessons,
      stageCount: pythonBuilt.stages.length,
      lessonBaseHref: '/lesson/python_advanced',
      isMock: false,
      stages: pythonBuilt.stages,
    },
    {
      slug: 'sql',
      courseId: 'db_design',
      title: 'SQL',
      shortSpineLabel: 'SQL',
      badgeText: 'MỚI',
      shelfTier: 'new',
      tagline:
        'Thiết kế cơ sở dữ liệu và truy vấn bằng câu lệnh — từ sơ đồ E-R đến JOIN và chuẩn hoá bảng.',
      colorNote: 'Xanh ngọc & hổ phách',
      propsSummary: 'Bảng users · Truy vấn · Tháp CSDL · Chìa khoá',
      outcomes: [
        'Thiết kế sơ đồ thực thể E-R và ánh xạ sang bảng',
        'Thành thạo khoá chính, khoá ngoại và JOIN nhiều bảng',
        'Chuẩn hoá cơ sở dữ liệu từ 1NF đến 4NF và BCNF',
        'Ứng dụng JSON, dữ liệu không gian và phòng chống SQL Injection',
      ],
      durationLabel: '~6 giờ',
      lessonCount: sqlBuilt.totalLessons,
      stageCount: sqlBuilt.stages.length,
      lessonBaseHref: '/lesson/db_design',
      isMock: false,
      stages: sqlBuilt.stages,
    },
    {
      slug: 'machine-learning',
      courseId: 'machine_learning',
      title: 'Machine Learning',
      shortSpineLabel: 'MACHINE LEARNING',
      badgeText: 'MỚI',
      shelfTier: 'new',
      tagline: 'Dạy máy học từ dữ liệu — hồi quy, phân loại và mạng nơ-ron.',
      colorNote: 'Tím oải hương & hồng phấn',
      propsSummary: 'Hồi quy · Nơ-ron · Robot · Hộp dữ liệu',
      outcomes: [
        'Chuẩn bị và làm sạch dữ liệu',
        'Huấn luyện mô hình hồi quy & phân loại',
        'Đánh giá mô hình đúng cách',
        'Xây mạng nơ-ron đầu tiên',
      ],
      durationLabel: '~19 giờ',
      lessonCount: mlTotal,
      stageCount: mlStages.length,
      lessonBaseHref: null,
      isMock: true,
      statusNote: 'Đang cập nhật',
      stages: mlStages,
    },
  ];
}

export const BOOKSHELF_COURSES: BookshelfCourse[] = createCatalog();

export const COMING_SOON_BOOKS: ComingSoonBook[] = [
  { title: 'Web', spineLabel: 'WEB' },
  { title: 'Thuật toán', spineLabel: 'THUẬT TOÁN' },
  { title: 'Git', spineLabel: 'GIT' },
];

export function findBookshelfCourse(slug: string): BookshelfCourse | undefined {
  return BOOKSHELF_COURSES.find((c) => c.slug === slug);
}
