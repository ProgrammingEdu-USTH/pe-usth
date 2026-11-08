import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

import { PrismaExceptionFilter } from './prisma-exception.filter';

/**
 * Trước bộ này, spec của filter có ĐÚNG MỘT ca `should be defined`.
 *
 * Mà filter này là `@Catch(Prisma.PrismaClientKnownRequestError)` đăng ký
 * `APP_FILTER` TOÀN CỤC (`api-gateway.module.ts`), nên MỌI lỗi Prisma đi qua nó
 * và nó dựng 9 thông điệp tiếng Việt mà người dùng đọc trực tiếp. Không ca nào
 * chứng minh một thông điệp nào trong chín thông điệp ấy được phát ra.
 *
 * `json` khai kiểu tham số (`jest.fn<void, [ThanPhanHoi]>`) chứ không
 * `jest.fn()` trần: với `jest.fn()` thì `json.mock.calls[0][0]` là `any` và mọi
 * phép so trên thân response KHÔNG được TS kiểm — đúng bài học đã ghi cho
 * `all-exceptions.filter.spec.ts`.
 */
type ThanPhanHoi = {
  error: { status: number; message: string; detail: string[] | null };
  request_id: string | null;
};

type LoiPrismaGia = {
  code: string;
  meta?: unknown;
  message: string;
  stack?: string;
};

function dungHost(requestId?: string) {
  const json = jest.fn<void, [ThanPhanHoi]>();
  const status = jest.fn<{ json: typeof json }, [number]>(() => ({ json }));
  const response = { status } as unknown as Response;
  const request = {
    method: 'POST',
    url: '/api/v1/courses',
    requestId,
  } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function chay(loi: LoiPrismaGia, requestId?: string) {
  const { host, status, json } = dungHost(requestId);
  // Filter chỉ đọc `code`/`meta`/`message`/`stack`, không gọi method nào của
  // lớp lỗi Prisma, nên một object thuần là fixture ĐỦ THẬT ở đây. Dựng một
  // `PrismaClientKnownRequestError` xịn đòi `clientVersion` và đổi chữ ký giữa
  // các bản Prisma — một fixture phải sửa mỗi lần nâng là một fixture sẽ trôi.
  new PrismaExceptionFilter().catch(
    loi as unknown as Parameters<PrismaExceptionFilter['catch']>[0],
    host,
  );
  expect(json).toHaveBeenCalledTimes(1);
  return { than: json.mock.calls[0][0], status };
}

/** `meta` theo hình dạng THẬT của `@prisma/adapter-neon`. */
function metaNeon(fields: unknown) {
  return { driverAdapterError: { cause: { constraint: { fields } } } };
}

describe('PrismaExceptionFilter', () => {
  it('should be defined', () => {
    expect(new PrismaExceptionFilter()).toBeDefined();
  });

  describe('P2002 — trùng khoá unique', () => {
    // Cả 9 khoá của UNIQUE_FIELD_MESSAGES. Trước bộ này không khoá nào được
    // chứng minh là tới được người dùng; một khoá gõ sai (ví dụ `courseId` thay
    // cho `course_id`) sẽ im lặng trả câu chung.
    const CA: [string[], string][] = [
      [['email'], 'Email này đã được sử dụng'],
      [['code'], 'Mã này đã tồn tại'],
      [
        ['course_id', 'lesson_code'],
        'Mã bài học đã tồn tại trong khoá học này',
      ],
      [['user_id', 'course_id'], 'Bạn đã đăng ký khoá học này rồi'],
      [['user_id', 'lesson_id'], 'Bài học này đã được ghi nhận tiến độ'],
      [['user_id', 'post_id'], 'Bạn đã thích bài viết này rồi'],
      [['user_id', 'badge_id'], 'Huy hiệu này đã được trao rồi'],
      [
        ['user_id', 'roadmap_id', 'item_id'],
        'Mục lộ trình này đã được ghi nhận',
      ],
      [['user_id'], 'Dữ liệu của người dùng này đã tồn tại'],
    ];

    it.each(CA)('cột %p → câu riêng của nó', (fields, cau) => {
      const { than, status } = chay({
        code: 'P2002',
        meta: metaNeon(fields),
        message: 'unique',
      });
      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(than.error.message).toBe(cau);
      expect(than.error.detail).toEqual(fields);
    });

    it('THỨ TỰ CỘT có nghĩa — đảo lại là mất câu riêng', () => {
      // Chú thích ở `UNIQUE_FIELD_MESSAGES` nói khoá nối "theo đúng thứ tự
      // Postgres trả về". Ca này ghim rằng đó là một RÀNG BUỘC THẬT, không phải
      // một lời dặn: đảo thứ tự thì `join(',')` ra khoá khác và người dùng nhận
      // câu chung. Ngày ai đó muốn nhận cả hai thứ tự, họ phải sửa ca này —
      // chứ không phát hiện ra bằng một báo lỗi của người học.
      const { than } = chay({
        code: 'P2002',
        meta: metaNeon(['course_id', 'lesson_code']),
        message: 'unique',
      });
      expect(than.error.message).toBe(
        'Mã bài học đã tồn tại trong khoá học này',
      );

      const dao = chay({
        code: 'P2002',
        meta: metaNeon(['lesson_code', 'course_id']),
        message: 'unique',
      });
      expect(dao.than.error.message).toBe(
        'Dữ liệu đã tồn tại, vui lòng kiểm tra lại',
      );
    });

    it('cột lạ → câu chung, và `detail` vẫn nói ra cột nào', () => {
      const { than } = chay({
        code: 'P2002',
        meta: metaNeon(['khong_co_trong_bang']),
        message: 'unique',
      });
      expect(than.error.message).toBe(
        'Dữ liệu đã tồn tại, vui lòng kiểm tra lại',
      );
      expect(than.error.detail).toEqual(['khong_co_trong_bang']);
    });

    it('engine CŨ (`meta.target`) vẫn nhận ra, cả mảng lẫn chuỗi', () => {
      expect(
        chay({ code: 'P2002', meta: { target: ['email'] }, message: 'u' }).than
          .error.message,
      ).toBe('Email này đã được sử dụng');
      expect(
        chay({ code: 'P2002', meta: { target: 'email' }, message: 'u' }).than
          .error.message,
      ).toBe('Email này đã được sử dụng');
    });

    it('`constraint.fields` RỖNG thì KHÔNG rơi xuống `target`', () => {
      // Luồng của bản gốc: `Array.isArray(fields)` đúng với mảng rỗng nên nó
      // trả `[]` NGAY. Bản đầu của tôi viết `if (fields.length)` và nó lặng lẽ
      // rơi xuống `target` — một thay đổi hành vi không ai yêu cầu, ở một filter
      // toàn cục. Ca này giữ luồng cũ.
      const { than } = chay({
        code: 'P2002',
        meta: { ...metaNeon([]), target: ['email'] },
        message: 'u',
      });
      expect(than.error.message).toBe(
        'Dữ liệu đã tồn tại, vui lòng kiểm tra lại',
      );
      expect(than.error.detail).toBeNull();
    });

    it('phần tử KHÔNG phải chuỗi bị lọc, không lọt ra `detail`', () => {
      // Đây là thứ `as any` cho phép: `extractFields` khai trả `string[]` mà
      // trả thẳng `any[]`. `['user_id', 7].join(',')` ra `"user_id,7"` — không
      // khớp khoá nào — nên người dùng mất câu đúng VÀ một con số lọt ra
      // `detail`. Sau khi lọc, `['user_id']` khớp lại đúng câu của nó.
      const { than } = chay({
        code: 'P2002',
        meta: metaNeon(['user_id', 7, null, { a: 1 }]),
        message: 'u',
      });
      expect(than.error.message).toBe('Dữ liệu của người dùng này đã tồn tại');
      expect(than.error.detail).toEqual(['user_id']);
    });
  });

  describe('P2003 — vi phạm khoá ngoại', () => {
    it('constraint có `user_id` → câu về phiên đăng nhập', () => {
      const { than, status } = chay({
        code: 'P2003',
        meta: {
          driverAdapterError: {
            cause: { constraint: { name: 'enrollments_user_id_fkey' } },
          },
        },
        message: 'fk',
      });
      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(than.error.message).toBe(
        'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      );
    });

    it('constraint KHÁC → câu về dữ liệu liên quan', () => {
      const { than } = chay({
        code: 'P2003',
        meta: { field_name: 'lesson_progress_lesson_id_fkey' },
        message: 'fk',
      });
      expect(than.error.message).toBe(
        'Dữ liệu liên quan không còn tồn tại, vui lòng tải lại trang',
      );
    });

    it('dạng MẢNG không được đổi nghĩa phép `includes`', () => {
      // CHỖ CÓ HẬU QUẢ THẬT của `as any`, và nó im lặng hoàn toàn. Bản cũ khai
      // `constraint: string | undefined` rồi nhận một mảng từ `any`:
      //   'enrollments_user_id_fkey'.includes('user_id')   -> true   (ĐÚNG)
      //   ['enrollments_user_id_fkey'].includes('user_id') -> FALSE  (SAI)
      //   ['user_id'].includes('user_id')                  -> true   (TÌNH CỜ)
      // Tức một phép tung đồng xu theo nội dung mảng. Ca đầu dưới đây là ca
      // phân biệt được hai bản; hai ca sau khoá luôn hai hình dạng còn lại.
      const tenRangBuoc = chay({
        code: 'P2003',
        meta: { field_name: ['enrollments_user_id_fkey'] },
        message: 'fk',
      });
      expect(tenRangBuoc.than.error.message).toBe(
        'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      );

      const tenCot = chay({
        code: 'P2003',
        meta: { field_name: ['user_id'] },
        message: 'fk',
      });
      expect(tenCot.than.error.message).toBe(
        'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      );

      const khongLienQuan = chay({
        code: 'P2003',
        meta: { field_name: ['lesson_progress_lesson_id_fkey'] },
        message: 'fk',
      });
      expect(khongLienQuan.than.error.message).toBe(
        'Dữ liệu liên quan không còn tồn tại, vui lòng tải lại trang',
      );
    });

    it('`constraint.name` thắng `field_name` khi có cả hai', () => {
      const { than } = chay({
        code: 'P2003',
        meta: {
          driverAdapterError: {
            cause: { constraint: { name: 'posts_user_id_fkey' } },
          },
          field_name: 'khong_lien_quan',
        },
        message: 'fk',
      });
      expect(than.error.message).toBe(
        'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      );
    });
  });

  describe('mã khác và hợp đồng response', () => {
    it('mã Prisma lạ → 500 kèm câu chung, `detail` null', () => {
      const { than, status } = chay({ code: 'P2025', message: 'not found' });
      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(than.error.message).toBe(
        'Đã có lỗi xảy ra, xin vui lòng thử lại sau',
      );
      expect(than.error.detail).toBeNull();
    });

    it('`request_id` lấy từ request, và là `null` khi chưa có', () => {
      expect(
        chay({ code: 'P2025', message: 'x' }, 'abc-123').than.request_id,
      ).toBe('abc-123');
      expect(chay({ code: 'P2025', message: 'x' }).than.request_id).toBeNull();
    });

    it('`meta` thiếu hẳn hoặc sai hình dạng không làm filter ném', () => {
      for (const meta of [undefined, null, 'chuoi', 42, [], { target: 7 }]) {
        const { than } = chay({ code: 'P2002', meta, message: 'u' });
        expect(than.error.message).toBe(
          'Dữ liệu đã tồn tại, vui lòng kiểm tra lại',
        );
        expect(than.error.detail).toBeNull();
      }
    });
  });
});
