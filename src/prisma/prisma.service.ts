import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma';
import { createMonitoredNeon } from './neon-pool';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  private readonly stopMonitor: () => void;

  constructor() {
    const { adapter, stop } = createMonitoredNeon('main', {
      connectionString: process.env.DATABASE_URL!,
      // Hết pool thì request chờ tối đa ngần này rồi filter đổi thành 503 + Retry-After (BE11):
      // để 30 s thì người học nhìn màn hình treo nửa phút rồi mới nhận lỗi. 10 s thấp hơn hoặc
      // bằng thời gian Neon thức dậy (~10 s) nên lượt ĐẦU sau khoảng lặng có thể nhận 503 —
      // giảm bằng ping giữ thức vào GET /health/ready. Đổi bằng DB_CONNECT_TIMEOUT_MS.
      connectionTimeoutMillis: Number(
        process.env.DB_CONNECT_TIMEOUT_MS ?? 10_000,
      ),
      // Đóng connection idle sau 30s: Neon proxy tự cắt socket idle phía
      // server; giữ lâu hơn chỉ tổ dùng phải connection chết.
      idleTimeoutMillis: 30_000,
      // Trần pool (Task 262 — cấu hình pool tương đương bản Django).
      //
      // ĐÂY LÀ THAM SỐ QUYẾT ĐỊNH THÔNG LƯỢNG của toàn hệ thống. Mỗi truy
      // vấn tới Neon mất cỡ một round-trip (~64ms từ máy dev tới Singapore, đo 19/11; "237ms/us-east-2"
      // ở đây là số cũ trước khi DB chuyển Singapore ngày 27/10 — đo lại từ Render), nên số request/giây
      // tối đa ≈ max / 0.237. Với max=10 thì trần chỉ ~42 req/s — đo thực
      // tế đúng 37 req/s. Nâng max lên là cách tăng thông lượng hiệu quả
      // nhất vì thời gian đó là CHỜ MẠNG, không tốn CPU.
      //
      // Dùng endpoint '-pooler' của Neon (PgBouncer) nên chịu được hàng
      // nghìn connection; nút thắt không nằm ở phía Neon.
      max: Number(process.env.DB_POOL_MAX ?? 50),
    });
    super({ adapter });
    this.stopMonitor = stop;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    this.stopMonitor();
    await this.$disconnect();
  }
}
