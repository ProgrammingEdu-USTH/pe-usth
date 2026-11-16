#!/usr/bin/env ts-node
/**
 * GIỮ CHÂN D1 / D7 / D30 — CHỈ ĐỌC, không ghi một dòng nào vào DB.
 *
 * Người học QUAY LẠI không, và sau bao lâu? Cùng nguồn với `pheu-tien-do.ts` (`enrollments` +
 * `lesson_progress`): không cần lớp ghi vết, không cần sự đồng ý. Mọi phép tính ở
 * `src/course-admin/giu-chan.ts` và có Jest chấm; file này chỉ đi lấy hàng rồi in. Định nghĩa, ngày 0,
 * mẫu số "đủ tuổi" và GIỚI HẠN đọc ở đầu file đó — và bảng in ra có kèm giới hạn, vì một bảng số đi một
 * mình sẽ bị trích một mình.
 *
 *   npx ts-node scripts/giu-chan.ts                      # khoá mặc định, chỉ tài khoản khách
 *   npx ts-node scripts/giu-chan.ts --course=python_advanced
 *   npx ts-node scripts/giu-chan.ts --tat-ca-tai-khoan   # gồm cả tài khoản thật
 *   npx ts-node scripts/giu-chan.ts --json
 *
 * Chưa chạy với dữ liệu thật trong vòng lặp (không có `DATABASE_URL`): phần chứng minh được là phép tính
 * (Jest) và hình dạng truy vấn (typecheck). Hành vi trên hàng thật thì chủ dự án chạy là biết.
 */
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  CHI_SO_KHAI_TRUOC_GC,
  dungGiuChan,
  type HangGhiDanhGC,
  type HangHoanThanhGC,
} from '../src/course-admin/giu-chan';

const KHOA_MAC_DINH = 'python_advanced';

function doiSo(ten: string, mac: string): string {
  const v = process.argv.find((a) => a.startsWith(`--${ten}=`));
  return v ? v.slice(ten.length + 3) : mac;
}

async function main(): Promise<number> {
  const courseId = doiSo('course', KHOA_MAC_DINH);
  const chiKhach = !process.argv.includes('--tat-ca-tai-khoan');

  if (!process.env.DATABASE_URL) {
    console.error(
      'Thiếu DATABASE_URL. Script này CHỈ ĐỌC (enrollments + lesson_progress), ' +
        'không ghi một dòng nào — nhưng nó vẫn cần chuỗi kết nối.',
    );
    return 1;
  }
  // Prisma 7 ĐÒI một driver adapter (xem `pheu-tien-do.ts`): dùng cùng PrismaNeon, đừng nghĩ ra cách thứ hai.
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const ghiDanhTho = await prisma.enrollment.findMany({
      where: { courseId },
      select: {
        userId: true,
        enrolledAt: true,
        user: { select: { email: true } },
      },
    });
    if (!ghiDanhTho.length) {
      console.error(`Khoá "${courseId}" không có ghi danh nào — sai mã khoá?`);
      return 1;
    }
    const ghiDanh: HangGhiDanhGC[] = ghiDanhTho.map((g) => ({
      userId: g.userId,
      email: g.user.email,
      ghiDanhLuc: g.enrolledAt,
    }));
    const tienDoTho = await prisma.lessonProgress.findMany({
      where: { courseId },
      select: { userId: true, completedAt: true },
    });
    const hoanThanh: HangHoanThanhGC[] = tienDoTho.map((t) => ({
      userId: t.userId,
      luc: t.completedAt,
    }));

    const ra = dungGiuChan(ghiDanh, hoanThanh, new Date(), chiKhach);

    if (process.argv.includes('--json')) {
      console.log(JSON.stringify({ courseId, chiKhach, ...ra }, null, 2));
      return 0;
    }

    console.log(`GIỮ CHÂN — khoá ${courseId}`);
    console.log(`Đơn vị: ${ra.donVi}   ·   đã ghi danh: ${ra.daGhiDanh}\n`);
    console.log(
      'CHỈ SỐ ĐÃ KHAI TRƯỚC (bảng này không in gì ngoài danh sách sau):',
    );
    for (const c of CHI_SO_KHAI_TRUOC_GC) console.log(`   · ${c}`);
    console.log();
    console.log(
      '  mốc   đủ tuổi  chưa đủ   đúng ngày N        từ ngày N trở đi',
    );
    for (const o of ra.o) {
      const pc = (v: number | null) => (v === null ? '·' : `${v.toFixed(1)}%`);
      const n = (v: number | null) => (v === null ? '·' : String(v));
      console.log(
        `  D${String(o.moc).padEnd(3)} ${String(o.mauSo).padStart(8)} ${String(o.chuaDuTuoi).padStart(8)}   ` +
          `${n(o.dungNgay).padStart(5)} ${pc(o.phanTramDungNgay).padStart(7)}        ` +
          `${n(o.tuNgay).padStart(5)} ${pc(o.phanTramTuNgay).padStart(7)}`,
      );
    }
    console.log('\nGIỚI HẠN — đọc bảng trên mà bỏ phần này là đọc sai:');
    for (const g of ra.gioiHan) console.log(`   – ${g}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((ma) => process.exit(ma))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
