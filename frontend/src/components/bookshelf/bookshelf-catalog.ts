/**
 * bookshelf-catalog.ts — Nguồn dữ liệu và cấu hình chủ đề cho Tủ sách.
 *
 * · Python (`python_advanced`): đọc THẬT 11 học phần / 179 bài từ curricula.json
 *   và thời lượng `~41 giờ` từ catalog.ts.
 * · Database, Database Advanced, Machine Learning: đọc THẬT từ doc-courses.json,
 *   do scripts/pe-doc/build.py sinh ra cùng lúc với nội dung bài.
 */

import { COURSES } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import DOC_COURSES from '@/lib/doc-courses.json';
import { splitLessonTitle, type ModuleRow } from '@/lib/goc-hoc';
import { STATIC_COURSES, type StaticCourseId } from '@/lib/static-courses';

export type BookshelfSlug = 'python' | 'sql' | 'database-advanced' | 'machine-learning';

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
  lessonBaseHref: string;
  /** Trang học thêm ngoài mạch bài (hai bài tương tác của Machine Learning). */
  extras?: { label: string; href: string }[];
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

function summaryOf(lessons: BookshelfLessonItem[]): string {
  const preview = lessons.slice(0, 3).map((l) => l.title).join(' · ');
  const extra = lessons.length - 3;
  return extra > 0 ? `${preview} · +${extra} bài` : preview;
}

function buildPythonStages(
  modules: ModuleRow[],
  totalHours: number,
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
      const parsed = splitLessonTitle(raw);
      return {
        index,
        no,
        code: parsed.code || `PY${String(no).padStart(2, '0')}`,
        title: parsed.title,
        minutes: 15,
      };
    });

    const estHours = Math.max(
      1,
      Math.round((lessons.length / Math.max(1, totalLessons)) * totalHours),
    );

    return {
      stageNumber,
      title: `${shortTitle} · ${subtitle}`,
      shortTitle,
      subtitle,
      estimatedHoursLabel: `~${estHours} giờ`,
      summaryLine: summaryOf(lessons),
      lessons,
    };
  });

  return { stages, totalLessons };
}

/** Khoá tĩnh: danh sách bài lấy từ bản dựng. Giáo trình CSDL không khai thời lượng. */
function buildStaticBook(courseId: StaticCourseId) {
  const source = DOC_COURSES[courseId];
  const hours = (minutes: number) => (minutes > 0 ? `~${Math.max(1, Math.round(minutes / 60))} giờ` : '');
  let totalMinutes = 0;

  const stages: BookshelfStage[] = source.modules.map((mod, mIdx) => {
    const stageNumber = mIdx + 1;
    const minutes = mod.lessons.reduce((sum, l) => sum + l.minutes, 0);
    totalMinutes += minutes;
    const lessons: BookshelfLessonItem[] = mod.lessons.map((l) => ({ ...l, index: l.no - 1 }));
    return {
      stageNumber,
      title: `Chặng ${stageNumber} · ${mod.title}`,
      shortTitle: `Chặng ${stageNumber}`,
      subtitle: mod.title,
      estimatedHoursLabel: hours(minutes),
      summaryLine: summaryOf(lessons),
      lessons,
    };
  });

  return {
    courseId,
    title: STATIC_COURSES[courseId].title,
    slug: STATIC_COURSES[courseId].slug,
    lessonBaseHref: `/lesson/${courseId}`,
    lessonCount: source.lessons,
    stageCount: stages.length,
    durationLabel: hours(totalMinutes) || 'Tự học',
    stages,
  };
}

function createCatalog(): BookshelfCourse[] {
  const pythonCatalog = COURSES.find((c) => c.id === 'python_advanced');
  const pythonModules = RAW_CURRICULA.python_advanced?.modules ?? [];
  const pythonBuilt = buildPythonStages(pythonModules, 41);

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
      stages: pythonBuilt.stages,
    },
    {
      ...buildStaticBook('database'),
      shortSpineLabel: 'DATABASE',
      badgeText: 'MỚI',
      shelfTier: 'new',
      tagline:
        'Cơ sở dữ liệu từ đầu: toán nền, mô hình quan hệ, SQL, thiết kế, giao dịch và hệ phân tán.',
      colorNote: 'Xanh ngọc & hổ phách',
      propsSummary: 'Bảng users · Truy vấn · Tháp CSDL · Chìa khoá',
      outcomes: [
        'Nắm toán nền và mô hình quan hệ trước khi viết truy vấn',
        'Viết SQL trên MySQL từ SELECT đến các báo cáo nhiều bảng',
        'Thiết kế dữ liệu từ ERD đến chuẩn hoá',
        'Hiểu lưu trữ, chỉ mục, giao dịch và hệ phân tán',
      ],
    },
    {
      ...buildStaticBook('database_advanced'),
      shortSpineLabel: 'DB ADVANCED',
      badgeText: 'MỚI',
      shelfTier: 'new',
      tagline:
        'Đi sâu sau khoá Database: lập luận và chứng minh, bên trong hệ quản trị, phân tán và PostgreSQL.',
      colorNote: 'Xanh mực & đồng',
      propsSummary: 'Bảng users · Kế hoạch truy vấn · Tháp CSDL · Chìa khoá',
      outcomes: [
        'Chứng minh tính đúng của truy vấn và phép phân rã',
        'Đọc cách storage, chỉ mục và bộ tối ưu truy vấn làm việc',
        'Lập luận về giao dịch, phục hồi và hệ phân tán',
        'Khảo sát PostgreSQL từ planner đến một extension nhỏ',
      ],
    },
    {
      ...buildStaticBook('machine_learning'),
      shortSpineLabel: 'MACHINE LEARNING',
      badgeText: 'MỚI',
      shelfTier: 'new',
      tagline: 'Dạy máy học từ dữ liệu — từ ma trận, hồi quy tới mạng nơ-ron và cây quyết định.',
      colorNote: 'Tím oải hương & hồng phấn',
      propsSummary: 'Hồi quy · Nơ-ron · Robot · Hộp dữ liệu',
      outcomes: [
        'Biểu diễn, chuẩn hoá dữ liệu và tránh rò rỉ dữ liệu',
        'Tự cài hồi quy và phân loại bằng NumPy ngay trong trình duyệt',
        'Đánh giá mô hình bằng đúng thước đo',
        'Hiểu mạng nơ-ron, phân cụm, PCA và cây quyết định',
      ],
      extras: [
        {
          label: 'Bài tương tác: đại số tuyến tính 2.1 và 2.2',
          href: '/static/courses/machine_learning/interactive/dai-so-tuyen-tinh.html',
        },
        {
          label: 'Bài tương tác: từ phương trình đến hồi quy',
          href: '/static/courses/machine_learning/interactive/phuong-trinh-den-hoi-quy.html',
        },
      ],
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

export { buildLessonHref } from './bookshelf-progress';
