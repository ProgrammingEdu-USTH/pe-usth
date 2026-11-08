import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from 'src/generated/prisma';

// Key = tên CỘT DB (snake_case), nối bằng ',' theo đúng thứ tự Postgres trả về
const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  email: 'Email này đã được sử dụng',
  code: 'Mã này đã tồn tại',
  'course_id,lesson_code': 'Mã bài học đã tồn tại trong khoá học này',
  'user_id,course_id': 'Bạn đã đăng ký khoá học này rồi',
  'user_id,lesson_id': 'Bài học này đã được ghi nhận tiến độ',
  'user_id,post_id': 'Bạn đã thích bài viết này rồi',
  'user_id,badge_id': 'Huy hiệu này đã được trao rồi',
  'user_id,roadmap_id,item_id': 'Mục lộ trình này đã được ghi nhận',
  user_id: 'Dữ liệu của người dùng này đã tồn tại',
};

/**
 * Hình dạng `exception.meta` mà filter này ĐỌC — khai bằng `unknown` ở mọi lá.
 *
 * `meta` của Prisma là `unknown` theo kiểu, và nội dung thật phụ thuộc ENGINE:
 * với `@prisma/adapter-neon` nó lồng trong `driverAdapterError.cause.constraint`,
 * còn engine cũ đặt ở `target`. Khai `unknown` thay vì `string[]`/`string` là
 * CỐ Ý: ở biên này ta KHÔNG biết, nên hai hàm dưới phải đi kiểm từng giá trị.
 * Khai `string[]` ở đây chỉ là dời lời nói dối từ `as any` sang một type alias.
 */
type MetaPrisma = {
  target?: unknown;
  field_name?: unknown;
  driverAdapterError?: {
    cause?: { constraint?: { fields?: unknown; name?: unknown } };
  };
};

/**
 * Giữ lại ĐÚNG những phần tử là chuỗi; một chuỗi trần thành mảng một phần tử.
 *
 * VÌ SAO LỌC chứ không ép kiểu: giá trị này đi vào `fields.join(',')` để tra
 * `UNIQUE_FIELD_MESSAGES`, rồi vào `detail` của response. `['user_id', 7]`
 * `join` ra `"user_id,7"` — không khớp khoá nào, nên người dùng nhận câu chung
 * "Dữ liệu đã tồn tại" thay vì câu đúng, và một con số lọt ra `detail`. Lọc thì
 * phần chuỗi còn dùng được; ép kiểu thì cả hai sai mà không ai thấy.
 * Cùng cách `mapChuoi()` ở `all-exceptions.filter.ts` xử lý biên của nó.
 */
function chiChuoi(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

/**
 * Gộp thành MỘT chuỗi để tìm chuỗi con — chịu được cả chuỗi lẫn mảng.
 *
 * ĐÂY LÀ CHỖ CÓ HẬU QUẢ THẬT, không phải một con số lint. Bản cũ khai
 * `const constraint: string | undefined = …` rồi dùng
 * `constraint?.includes('user_id')`, trong khi giá trị đến từ `any`. Khi nó là
 * MẢNG thì phép gọi ấy VẪN chạy — `Array.prototype.includes` — nhưng ĐỔI
 * NGHĨA, và nó đổi theo kiểu TUỲ NỘI DUNG:
 *
 *   'enrollments_user_id_fkey'.includes('user_id')   -> true   (câu ĐÚNG)
 *   ['enrollments_user_id_fkey'].includes('user_id') -> FALSE  (câu SAI)
 *   ['user_id'].includes('user_id')                  -> true   (đúng, do TÌNH CỜ)
 *
 * Tức `as any` cho một phép tung đồng xu: tên RÀNG BUỘC thì sai, tên CỘT thì
 * tình cờ đúng. Không exception nào ném, và người dùng nhận "Dữ liệu liên quan
 * không còn tồn tại" khi lẽ ra phải là "Phiên đăng nhập không hợp lệ".
 *
 * `join(',')` chữa ĐÚNG chỗ đó: mảng nào cũng về một chuỗi để tìm chuỗi con,
 * nên cả ba dòng trên đều ra `true`. KHÔNG dùng một hàm "chỉ nhận chuỗi, mảng
 * thành undefined": với `['enrollments_user_id_fkey']` nó cũng trả câu chung —
 * tức CÙNG kết quả sai như bản `any`, và một ca test cho chiều đó sẽ RỖNG. Đã
 * thử và bỏ.
 */
function chuoiTimKiem(v: unknown): string {
  return chiChuoi(v).join(',');
}

function extractFields(
  exception: Prisma.PrismaClientKnownRequestError,
): string[] {
  const meta = exception.meta as MetaPrisma | undefined;

  // Prisma 7 + driver adapter (@prisma/adapter-neon): shape thực tế của project này
  //
  // Phép kiểm là `Array.isArray`, KHÔNG phải `fields.length` — và đó là để giữ
  // nguyên luồng cũ. Bản đầu của tôi viết `if (fields.length) return fields`,
  // tức một `constraint.fields` RỖNG sẽ rơi xuống `target`; bản cũ thì trả `[]`
  // ngay. Khác biệt nhỏ nhưng nó là một thay đổi hành vi tôi không hề định làm,
  // và ở một filter toàn cục thì mọi thay đổi không cố ý đều phải chặn lại.
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(fields)) return chiChuoi(fields);

  // Fallback: shape cũ meta.target (mảng HOẶC chuỗi), phòng khi đổi adapter.
  return chiChuoi(meta?.target);
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra, xin vui lòng thử lại sau';
    // `string[] | null`, KHÔNG `any`: trường này ra thẳng response, nên kiểu của
    // nó là một phần hợp đồng với client.
    let detail: string[] | null = null;

    if (exception.code === 'P2002') {
      status = HttpStatus.BAD_REQUEST;
      const fields = extractFields(exception);
      message =
        UNIQUE_FIELD_MESSAGES[fields.join(',')] ??
        'Dữ liệu đã tồn tại, vui lòng kiểm tra lại';
      detail = fields.length ? fields : null;
    } else if (exception.code === 'P2003') {
      // Vi phạm khoá ngoại. Lá chắn thứ 2 (JwtStrategy đã chặn user bị xoá
      // ngay từ cổng vào) — phòng trường hợp bản ghi tham chiếu (khoá học,
      // bài học...) bị xoá đúng lúc request đang xử lý (race hiếm gặp).
      status = HttpStatus.BAD_REQUEST;
      const meta = exception.meta as MetaPrisma | undefined;
      // `constraint.name` thắng `field_name` khi có cả hai — giữ đúng thứ tự
      // `??` của bản cũ, chỉ thay phép "có giá trị" bằng phép "có chuỗi nào".
      const ten = chuoiTimKiem(
        meta?.driverAdapterError?.cause?.constraint?.name,
      );
      const constraint = ten || chuoiTimKiem(meta?.field_name);
      message = constraint.includes('user_id')
        ? 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại'
        : 'Dữ liệu liên quan không còn tồn tại, vui lòng tải lại trang';
    }

    const requestId = request.requestId || null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} Prisma ${exception.code}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      error: { status, message, detail },
      request_id: requestId,
    });
  }
}
