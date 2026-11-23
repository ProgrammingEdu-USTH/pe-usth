import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  findPendingMigrations,
  readRepoMigrations,
} from './pending-migrations';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  constructor() {
    const adapter = new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
      // Neon autosuspend: compute "ngủ" sau vài phút không hoạt động và mất
      // ~10s để thức dậy — timeout mặc định ~10s làm request ĐẦU TIÊN sau
      // khoảng lặng luôn 500. Nới lên 30s để sống sót qua cold start.
      connectionTimeoutMillis: 30_000,
      // Đóng connection idle sau 30s: Neon proxy tự cắt socket idle phía
      // server; giữ lâu hơn chỉ tổ dùng phải connection chết.
      idleTimeoutMillis: 30_000,
      // Trần pool (Task 262 — cấu hình pool tương đương bản Django).
      //
      // ĐÂY LÀ THAM SỐ QUYẾT ĐỊNH THÔNG LƯỢNG của toàn hệ thống. Mỗi truy
      // vấn tới Neon (us-east-2) mất ~237ms round-trip, nên số request/giây
      // tối đa ≈ max / 0.237. Với max=10 thì trần chỉ ~42 req/s — đo thực
      // tế đúng 37 req/s. Nâng max lên là cách tăng thông lượng hiệu quả
      // nhất vì thời gian đó là CHỜ MẠNG, không tốn CPU.
      //
      // Dùng endpoint '-pooler' của Neon (PgBouncer) nên chịu được hàng
      // nghìn connection; nút thắt không nằm ở phía Neon.
      max: Number(process.env.DB_POOL_MAX ?? 50),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    void this.canhBaoMigrationThieu();
  }

  /** Chỉ CẢNH BÁO, không chặn khởi động: role `pe_app` không đọc được `_prisma_migrations` (AGENTS.md). */
  private async canhBaoMigrationThieu() {
    const trongRepo = readRepoMigrations();
    if (!trongRepo) return;
    try {
      const rows = await this.$queryRaw<
        Array<{ migration_name: string }>
      >`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
      const thieu = findPendingMigrations(
        trongRepo,
        rows.map((r) => r.migration_name),
      );
      if (thieu.length) {
        new Logger(PrismaService.name).error(
          `DB CHƯA áp ${thieu.length} migration của code: ${thieu.join(', ')}. ` +
            'Route đọc cột mới sẽ lỗi 500. Chạy: npx prisma migrate deploy (DIRECT_URL không có -pooler).',
        );
      }
    } catch {
      /* không đọc được bảng migration: bỏ qua */
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
