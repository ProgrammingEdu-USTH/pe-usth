/**
 * Quán Mây — dữ liệu và phần tính của hai tập. Hàm thuần, không đụng trình duyệt.
 * Mọi con số trên màn hình đều tính từ đây, không viết tay lần hai.
 */

export type EpisodeId = 'xep-don' | 'ket-hut-tien';

export const EPISODE_IDS: readonly EpisodeId[] = ['xep-don', 'ket-hut-tien'];

// ── Tập 1: xếp đơn ───────────────────────────────────────────────────────

export type Order = { id: string; name: string; minutes: number };

export const ORDERS: readonly Order[] = [
  { id: 'A', name: 'Cà phê muối ×4', minutes: 8 },
  { id: 'B', name: 'Trà đào', minutes: 2 },
  { id: 'C', name: 'Sinh tố ×2', minutes: 5 },
  { id: 'D', name: 'Nước chanh', minutes: 1 },
  { id: 'E', name: 'Trà sữa', minutes: 3 },
];

export const ARRIVAL_ORDER = ORDERS.map((o) => o.id);
export const WAIT_GOAL = 4.5;

export type Slot = { order: Order; start: number; end: number };

/** Một người pha, mọi đơn đã đến cùng lúc: thời gian chờ là lúc bắt đầu pha. */
export function schedule(ids: readonly string[], orders: readonly Order[] = ORDERS): Slot[] {
  let clock = 0;
  return ids.flatMap((id) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return [];
    const slot = { order, start: clock, end: clock + order.minutes };
    clock = slot.end;
    return [slot];
  });
}

export function averageWait(slots: readonly Slot[]): number {
  return slots.length ? slots.reduce((sum, s) => sum + s.start, 0) / slots.length : 0;
}

/** Ca mới ở bước 5: bốn đơn gọi theo thời gian pha. */
export const NEW_CASE: readonly Order[] = [
  { id: 'P', name: 'Đơn 12 phút', minutes: 12 },
  { id: 'Q', name: 'Đơn 1 phút', minutes: 1 },
  { id: 'R', name: 'Đơn 2 phút', minutes: 2 },
  { id: 'S', name: 'Đơn 3 phút', minutes: 3 },
];

// ── Tập 2: két hụt tiền ──────────────────────────────────────────────────

export type Row = {
  id: number;
  gio: string;
  mon: string;
  gia: number;
  ma_giam: string | null;
  da_tra: number;
};

const row = (id: number, gio: string, mon: string, gia: number, ma_giam: string | null, da_tra: number): Row =>
  ({ id, gio, mon, gia, ma_giam, da_tra });

export const ROWS: readonly Row[] = [
  row(101, '08:10', 'Trà đào', 20000, null, 20000),
  row(102, '08:42', 'Cà phê muối', 25000, 'HSSV', 22500),
  row(103, '09:15', 'Trà sữa', 30000, null, 30000),
  row(104, '10:05', 'Sinh tố', 35000, 'SINHNHAT', 0),
  row(105, '11:30', 'Trà đào', 20000, 'HSSV', 18000),
  row(106, '11:34', 'Cà phê muối', 25000, null, 25000),
  row(107, '12:20', 'Trà sữa', 30000, null, 30000),
  row(108, '14:05', 'Trà đào', 20000, 'TEST100', 0),
  row(109, '14:09', 'Cà phê muối', 25000, 'TEST100', 0),
  row(110, '14:12', 'Sinh tố', 35000, null, 35000),
  row(111, '14:18', 'Trà sữa', 30000, 'TEST100', 0),
  row(112, '14:27', 'Trà đào', 20000, 'TEST100', 0),
  row(113, '14:40', 'Cà phê muối', 25000, 'TEST100', 0),
  row(114, '15:30', 'Trà đào', 20000, null, 20000),
  row(115, '17:10', 'Sinh tố', 35000, 'HSSV', 31500),
  row(116, '18:02', 'Trà sữa', 30000, null, 30000),
];

export const SHORTFALL = 120000;
export const CULPRIT = 'TEST100';

export type Field = 'da_tra' | 'gia' | 'ma_giam';
export type Op = '=' | '>';

export const FIELDS: Record<Field, { ops: Op[]; values: string[] }> = {
  da_tra: { ops: ['=', '>'], values: ['0', '20000', '30000'] },
  gia: { ops: ['=', '>'], values: ['0', '20000', '30000'] },
  ma_giam: { ops: ['='], values: ['TEST100', 'HSSV', 'SINHNHAT'] },
};

export const isField = (v: unknown): v is Field => v === 'da_tra' || v === 'gia' || v === 'ma_giam';

/** `WHERE field op value`. NULL không khớp phép so sánh nào, như SQL thật. */
export function where(field: Field, op: Op, value: string, rows: readonly Row[] = ROWS): Row[] {
  return rows.filter((r) => {
    const cell = r[field];
    if (cell === null) return false;
    const wanted = typeof cell === 'number' ? Number(value) : value;
    return op === '=' ? cell === wanted : cell > wanted;
  });
}

export function sqlText(field: Field, op: Op, value: string): string {
  const literal = field === 'ma_giam' ? `'${value}'` : value;
  return `SELECT *\nFROM don_hang\nWHERE ${field} ${op} ${literal};`;
}

export const ZERO_ROWS = where('da_tra', '=', '0');

export type Group = { code: string; count: number; total: number };

/** `GROUP BY ma_giam` kèm COUNT(*) và SUM(gia). */
export function groupByCode(rows: readonly Row[]): Group[] {
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const code = r.ma_giam ?? 'NULL';
    const g = groups.get(code) ?? { code, count: 0, total: 0 };
    g.count += 1;
    g.total += r.gia;
    groups.set(code, g);
  }
  return [...groups.values()];
}

// ── Chấm ─────────────────────────────────────────────────────────────────

/** Cấu hình hiện tại đã đủ để chạy chưa. */
export function canRun(id: EpisodeId, work: readonly string[]): boolean {
  if (id === 'xep-don') return work.length === ORDERS.length;
  const [field, op, value] = work;
  return isField(field) && FIELDS[field].ops.includes(op as Op) && FIELDS[field].values.includes(value);
}

/** Cấu hình có đạt mục tiêu của bước 3 không. */
export function evaluate(id: EpisodeId, work: readonly string[]): boolean {
  if (!canRun(id, work)) return false;
  if (id === 'xep-don') return averageWait(schedule(work)) <= WAIT_GOAL;
  const got = where(work[0] as Field, work[1] as Op, work[2]).map((r) => r.id);
  return got.length === ZERO_ROWS.length && ZERO_ROWS.every((r) => got.includes(r.id));
}

export const SOLUTIONS: Record<EpisodeId, string[]> = {
  'xep-don': ['D', 'B', 'E', 'C', 'A'],
  'ket-hut-tien': ['da_tra', '=', '0'],
};
