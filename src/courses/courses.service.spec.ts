import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { CoursesService } from './courses.service';

/**
 * Cột courses.is_published có từ đầu nhưng chưa từng được dùng để lọc, nên khoá
 * nháp (python_advanced seed với is_published = false) vẫn hiện trên trang khám
 * phá và ai cũng đăng ký được. Bộ test này khoá lại ba hành vi:
 *   1. học viên thường KHÔNG thấy / KHÔNG ghi danh được khoá chưa phát hành,
 *   2. quản trị viên thì được (xem trước bản nháp),
 *   3. học viên ĐÃ ghi danh trước khi khoá bị ẩn vẫn học tiếp bình thường.
 */
const NHAP = {
  id: 'python_advanced',
  title: 'Python nâng cao',
  level: 'advanced',
  rating: 0,
  lessonCount: 10,
  xp_reward: 100,
  isPublished: false,
  language: 'python',
  accentColor: '#3B82F6',
  contentMeta: {},
};

const DA_PHAT_HANH = { ...NHAP, id: 'python', isPublished: true };

/**
 * Điều kiện WHERE mà spec đọc lại từ `mock.calls`. Chỉ khai phần CÓ ĐỌC — mục
 * đích là để `whereDaGui()?.AND` có kiểu thật, không phải mô tả lại Prisma.
 */
type DieuKien = { AND?: unknown[] } & Record<string, unknown>;
type TruyVan = { where?: DieuKien } & Record<string, unknown>;

/**
 * Mock Prisma cho spec này. CHỈ khai bảng/hàm mà `CoursesService` thật sự gọi —
 * khai thừa là mô tả lại Prisma, mà bản mô tả đó sẽ trôi.
 *
 * VÌ SAO KHÔNG `let prisma: any`, và đây không phải chuyện con số lint: `any` ở
 * spec làm TEST NÓI DỐI. Với `any`, gõ `solution_code` thay cho `solutionCode`
 * vẫn biên dịch, `toBeUndefined()` vẫn ĐẠT, và lỗ lộ lời giải vẫn còn nguyên.
 * Công thức này đã dọn `quizzes` + `lessons` từ 553 → 263 lỗi (AGENTS.md).
 *
 * Kiểu THẬT chỉ cần ở phần ĐỐI SỐ: spec đọc lại `mock.calls` để chứng minh
 * "điều kiện publish do SERVICE gửi xuống DB". Giá trị trả về để `unknown` là
 * đủ, vì mỗi ca tự `mockResolvedValue()`.
 */
type HamMock = jest.Mock<Promise<unknown>, [TruyVan?]>;

/** `jest.fn()` trần trả `Mock<any, any>`, gán vào field đã khai kiểu lại thành
 *  `no-unsafe-assignment`. Bọc một lần ở đây thay vì ép kiểu từng chỗ. */
const mock = (): HamMock => jest.fn<Promise<unknown>, [TruyVan?]>();

type PrismaMock = {
  user: { findUnique: HamMock };
  course: { findMany: HamMock; findUnique: HamMock };
  enrollment: {
    findMany: HamMock;
    findUnique: HamMock;
    createMany: HamMock;
    updateMany: HamMock;
    deleteMany: HamMock;
  };
  lesson: { findMany: HamMock; findFirst: HamMock };
  lessonProgress: { findMany: HamMock; count: HamMock };
  // BE5: `getEnrolled`/`getCoursesEnrolled` đọc bằng `$queryRaw` (Prisma.Sql).
  $queryRaw: jest.Mock<Promise<unknown>, [Prisma.Sql]>;
  $transaction: jest.Mock<
    Promise<unknown>,
    [(p: PrismaMock) => Promise<unknown>]
  >;
};

describe('CoursesService — cổng is_published', () => {
  let service: CoursesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: mock().mockResolvedValue({ role: 'user' }) },
      course: {
        findMany: mock().mockResolvedValue([]),
        findUnique: mock(),
      },
      enrollment: {
        findMany: mock().mockResolvedValue([]),
        findUnique: mock().mockResolvedValue(null),
        createMany: mock().mockResolvedValue({ count: 1 }),
        updateMany: mock().mockResolvedValue({ count: 1 }),
        deleteMany: mock().mockResolvedValue({ count: 1 }),
      },
      lesson: {
        findMany: mock().mockResolvedValue([]),
        findFirst: mock().mockResolvedValue(null),
      },
      lessonProgress: {
        findMany: mock().mockResolvedValue([]),
        count: mock().mockResolvedValue(0),
      },
      $queryRaw: jest
        .fn<Promise<unknown>, [Prisma.Sql]>()
        .mockResolvedValue([]),
      $transaction: jest.fn((cb: (p: PrismaMock) => Promise<unknown>) =>
        cb(prisma),
      ),
    };

    const mod = await Test.createTestingModule({
      providers: [CoursesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(CoursesService);
  });

  /** Một hàng của `docGhiDanh()` — đúng tên cột mà câu SQL đặt. */
  type HangGhiDanh = {
    courseId: string;
    progress: number;
    completedLessons: number;
    status: string | null;
    timeSpent: string | null;
    enrolledAt: Date;
    title: string | null;
    lessonCount: number;
    accentColor: string | null;
    contentMeta: unknown;
    baiVuaXong: string | null;
    baiKe: string | null;
  };

  /** Định tuyến `$queryRaw` theo bảng mà câu SQL đọc. */
  const mockSql = (
    ghiDanh: HangGhiDanh[],
    studio: Array<{ courseId: string; sortOrder: number }> = [],
  ) =>
    prisma.$queryRaw.mockImplementation((sql) =>
      Promise.resolve(sql.sql.includes('FROM enrollments') ? ghiDanh : studio),
    );

  /** Câu SQL đọc bảng `bang`, đã khẳng định là có gửi. */
  const sqlDoc = (bang: string): Prisma.Sql => {
    const call = prisma.$queryRaw.mock.calls.find(([q]) =>
      q.sql.includes(`FROM ${bang}`),
    );
    expect(call).toBeDefined();
    return (call ?? [Prisma.empty])[0];
  };

  const lamAdmin = () =>
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });

  /** Điều kiện WHERE mà listCourses()/getCoursesEnrolled() thực sự gửi xuống DB. */
  // HAI chuyện khác hẳn nhau, và gộp chúng là mất một ca:
  //  - CHƯA GỌI findMany lần nào  → ca hỏng, nên NÉM kèm tên hàm. Trả
  //    `undefined` ở đây thì một ca đọc `.AND` chỉ báo "undefined không chứa
  //    {isPublished:true}", không nói được là service chưa chạm tới DB.
  //  - CÓ GỌI nhưng KHÔNG kèm `where` → một khẳng định HỢP LỆ: đó đúng là
  //    cách quản trị viên được phục vụ ("không lọc gì"), và ca đó đọc kết quả
  //    bằng `toBeUndefined()`. Ném ở đây là bắt ca đúng phải trượt.
  const whereDaGui = (call = 0): DieuKien | undefined => {
    const calls = prisma.course.findMany.mock.calls;
    if (!calls[call])
      throw new Error(`course.findMany chưa được gọi lần thứ ${call}`);
    return calls[call][0]?.where;
  };

  // ---------- 1. Danh sách khám phá ----------
  describe('listCourses', () => {
    it('học viên thường: truy vấn BẮT BUỘC có is_published = true', async () => {
      prisma.course.findMany.mockResolvedValue([DA_PHAT_HANH]);

      const res = await service.listCourses(1);

      expect(whereDaGui()?.AND).toContainEqual({ isPublished: true });
      expect(res.courses.map((c) => c.id)).toEqual(['python']);
    });

    it('học viên thường + filter/search: điều kiện publish không bị filter ghi đè', async () => {
      await service.listCourses(1, 'python', 'advanced', 'python');

      expect(whereDaGui()?.AND).toContainEqual({ isPublished: true });
      // Các mệnh đề search/level/language vẫn còn nguyên bên cạnh.
      const and = whereDaGui()?.AND;
      expect(and).toHaveLength(4);
    });

    it('quản trị viên: KHÔNG lọc publish, thấy cả khoá nháp', async () => {
      lamAdmin();
      prisma.course.findMany.mockResolvedValue([DA_PHAT_HANH, NHAP]);

      const res = await service.listCourses(9);

      expect(JSON.stringify(whereDaGui() ?? {})).not.toContain('isPublished');
      expect(res.courses.map((c) => c.id)).toEqual([
        'python',
        'python_advanced',
      ]);
    });
  });

  // ---------- 2. Ghi danh mới ----------
  describe('enroll', () => {
    it('học viên thường vào khoá chưa phát hành -> 403, KHÔNG tạo enrollment', async () => {
      prisma.course.findUnique.mockResolvedValue(NHAP);

      await expect(service.enroll(1, 'python_advanced')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.enrollment.createMany).not.toHaveBeenCalled();
    });

    it('học viên thường vào khoá đã phát hành -> ghi danh bình thường', async () => {
      prisma.course.findUnique.mockResolvedValue(DA_PHAT_HANH);

      const res = await service.enroll(1, 'python');

      expect(res.ok).toBe(true);
      expect(prisma.enrollment.createMany).toHaveBeenCalled();
    });

    it('quản trị viên vào khoá chưa phát hành -> được ghi danh để xem trước', async () => {
      lamAdmin();
      prisma.course.findUnique.mockResolvedValue(NHAP);

      const res = await service.enroll(9, 'python_advanced');

      expect(res.ok).toBe(true);
      expect(prisma.enrollment.createMany).toHaveBeenCalled();
    });

    it('học viên ĐÃ ghi danh trước khi khoá bị ẩn -> vẫn đồng bộ được tiến độ', async () => {
      prisma.course.findUnique.mockResolvedValue(NHAP);
      prisma.enrollment.findUnique.mockResolvedValue({ userId: 1 });
      prisma.lessonProgress.count.mockResolvedValue(3);

      const res = await service.enroll(1, 'python_advanced');

      expect(res).toEqual({ ok: true, completedLessons: 3, progress: 30 });
      expect(prisma.enrollment.updateMany).toHaveBeenCalled();
    });
  });

  // ---------- 3. Người đang học không bị mất khoá ----------
  describe('học viên đang học khoá bị ẩn', () => {
    const DONG_GHI_DANH: HangGhiDanh = {
      courseId: 'python_advanced',
      progress: 30,
      completedLessons: 3,
      status: 'in_progress',
      timeSpent: '2h',
      enrolledAt: new Date(),
      title: NHAP.title,
      lessonCount: NHAP.lessonCount,
      accentColor: NHAP.accentColor,
      contentMeta: {},
      baiVuaXong: null,
      baiKe: null,
    };

    it('getEnrolled: không lọc is_published, khoá bị ẩn vẫn nằm trong danh sách', async () => {
      mockSql([DONG_GHI_DANH]);

      const res = await service.getEnrolled(1);

      expect(res.enrolled.map((e) => e.id)).toEqual(['python_advanced']);
      // Truy vấn chỉ ràng buộc theo userId — không có mệnh đề publish nào.
      const sql = sqlDoc('enrollments');
      expect(sql.sql).not.toContain('is_published');
      expect(sql.values).toEqual([1]);
    });

    it('getCoursesEnrolled: catalog giữ lại đúng khoá user đã ghi danh', async () => {
      prisma.course.findMany.mockResolvedValue([DA_PHAT_HANH, NHAP]);
      mockSql([DONG_GHI_DANH]);

      const res = await service.getCoursesEnrolled(1);

      expect(whereDaGui()).toEqual({
        OR: [{ isPublished: true }, { enrollments: { some: { userId: 1 } } }],
      });
      expect(res.enrolled.map((e) => e.id)).toEqual(['python_advanced']);
      // Tìm RỒI khẳng định có: `find()` trả `undefined` khi không thấy, và
      // đọc thẳng `.enrolled` của nó là ném TypeError thay vì báo "không có
      // khoá đó trong danh mục" — tức ca test mất chính câu nó định nói.
      const khoaNhap = res.courses.find((c) => c.id === 'python_advanced');
      expect(khoaNhap).toBeDefined();
      expect(khoaNhap?.enrolled).toBe(true);
    });

    it('getCoursesEnrolled của quản trị viên: không lọc gì', async () => {
      lamAdmin();
      await service.getCoursesEnrolled(9);
      expect(whereDaGui()).toBeUndefined();
    });
  });

  // ---------- BE5 ----------
  describe('BE5: /enrolled đọc ghi danh trong MỘT vòng', () => {
    const hang = (over: Partial<HangGhiDanh>): HangGhiDanh => ({
      courseId: 'python_advanced',
      progress: 0,
      completedLessons: 0,
      status: 'in_progress',
      timeSpent: null,
      enrolledAt: new Date('2026-11-01T00:00:00Z'),
      title: 'Python cho Data Analyst',
      lessonCount: 172,
      accentColor: null,
      contentMeta: {},
      baiVuaXong: null,
      baiKe: null,
      ...over,
    });

    it('hai câu SQL chạy CÙNG LÚC, không câu nào chờ câu kia', async () => {
      // Câu nào tới trước thì treo lại cho tới khi câu thứ hai cũng đã được
      // gửi; nếu service chạy nối đuôi thì câu thứ hai không bao giờ tới.
      let tha: () => void = () => undefined;
      const cho = new Promise<void>((r) => (tha = r));
      prisma.$queryRaw.mockImplementation(async () => {
        if (prisma.$queryRaw.mock.calls.length === 2) tha();
        await cho;
        return [];
      });
      // Lưới an toàn để ca này trượt chứ không treo nếu service nối đuôi.
      let hetGio = false;
      const hen = setTimeout(() => {
        hetGio = true;
        tha();
      }, 1000);

      await service.getEnrolled(1);
      clearTimeout(hen);

      expect(hetGio).toBe(false);
      const daGui = prisma.$queryRaw.mock.calls.map(([q]) => q.sql);
      expect(daGui).toHaveLength(2);
      expect(daGui.some((q) => q.includes('FROM enrollments'))).toBe(true);
      expect(daGui.some((q) => q.includes('FROM lesson_progress'))).toBe(true);
      // Không còn đường Prisma cũ nào bị gọi.
      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
      expect(prisma.lesson.findMany).not.toHaveBeenCalled();
      expect(prisma.lessonProgress.findMany).not.toHaveBeenCalled();
    });

    it('tên bài vừa xong / bài kế lấy từ JOIN, rơi về "Bài n" khi trống', async () => {
      mockSql([
        hang({
          courseId: 'python_advanced',
          completedLessons: 3,
          baiVuaXong: 'Biến',
          baiKe: 'Vòng lặp',
        }),
        hang({
          courseId: 'db_design',
          completedLessons: 2,
          baiVuaXong: '',
          baiKe: null,
        }),
        hang({ courseId: 'sql', completedLessons: 0, baiKe: 'Mở đầu' }),
        hang({ courseId: 'cpp', completedLessons: 172, baiVuaXong: 'Cuối' }),
      ]);

      const res = await service.getEnrolled(1);
      const theo = (id: string) => res.enrolled.find((e) => e.id === id);

      expect(theo('python_advanced')?.lastLesson).toBe('Biến');
      expect(theo('python_advanced')?.nextLesson).toBe('Vòng lặp');
      expect(theo('db_design')?.lastLesson).toBe('Bài 2');
      expect(theo('db_design')?.nextLesson).toBe('Bài 3');
      expect(theo('sql')?.lastLesson).toBe('Chưa bắt đầu');
      expect(theo('sql')?.nextLesson).toBe('Mở đầu');
      expect(theo('cpp')?.lastLesson).toBe('Cuối');
      expect(theo('cpp')?.nextLesson).toBe('Đã hoàn thành khoá học');
      expect(theo('cpp')?.totalLessons).toBe(172);
    });

    it('completedLessonNumbers chỉ gắn cho khoá studio ĐÃ ghi danh', async () => {
      mockSql(
        [hang({ courseId: 'python_advanced' }), hang({ courseId: 'sql' })],
        [
          { courseId: 'python_advanced', sortOrder: 1 },
          { courseId: 'python_advanced', sortOrder: 2 },
        ],
      );

      const res = await service.getEnrolled(1);
      const studio = res.enrolled.find((e) => e.id === 'python_advanced');
      const khac = res.enrolled.find((e) => e.id === 'sql');

      expect(studio).toHaveProperty('completedLessonNumbers', [1, 2]);
      expect(khac).not.toHaveProperty('completedLessonNumbers');
      // Câu tiến độ lọc theo hằng STUDIO_COURSES, không theo danh sách ghi danh.
      expect(sqlDoc('lesson_progress').values).toEqual([
        1,
        ['python_advanced'],
      ]);
    });

    it('chưa ghi danh khoá nào: trả danh sách rỗng, không vỡ', async () => {
      mockSql([], [{ courseId: 'python_advanced', sortOrder: 1 }]);
      const res = await service.getEnrolled(1);
      expect(res).toEqual({ ok: true, enrolled: [] });
    });
  });

  // ---------- 4. Bảng kỹ năng cũng là một đường khám phá ----------
  describe('getSkills', () => {
    const MODULES = [
      { id: 1, courseId: 'python', module: 'Cơ bản', sortOrder: 1 },
      { id: 2, courseId: 'python_advanced', module: 'Decorator', sortOrder: 1 },
    ];

    it('học viên thường: module của khoá nháp không bị lộ', async () => {
      prisma.lesson.findMany.mockResolvedValue(MODULES);
      prisma.course.findMany.mockResolvedValue([{ id: 'python' }]);

      const res = await service.getSkills(1);

      expect(res.skills.map((s) => s.courseId)).toEqual(['python']);
      expect(JSON.stringify(res)).not.toContain('Decorator');
    });

    it('học viên đã ghi danh khoá bị ẩn: kỹ năng của khoá đó vẫn còn', async () => {
      prisma.lesson.findMany.mockResolvedValue(MODULES);
      // Truy vấn publish-OR-đã-ghi-danh trả về cả khoá bị ẩn.
      prisma.course.findMany.mockResolvedValue([
        { id: 'python' },
        { id: 'python_advanced' },
      ]);
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 2 }]);

      const res = await service.getSkills(1);

      const nangCao = res.skills.find((s) => s.courseId === 'python_advanced');
      expect(nangCao).toBeDefined();
      expect(nangCao?.progress).toBe(100);
    });

    it('quản trị viên: thấy hết, không cần truy vấn lọc khoá', async () => {
      lamAdmin();
      prisma.lesson.findMany.mockResolvedValue(MODULES);

      const res = await service.getSkills(9);

      expect(res.skills.map((s) => s.courseId)).toEqual([
        'python',
        'python_advanced',
      ]);
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });
  });
});
