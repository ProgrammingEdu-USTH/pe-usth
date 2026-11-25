'use client';

import {
  CULPRIT,
  FIELDS,
  groupByCode,
  isField,
  ROWS,
  SHORTFALL,
  sqlText,
  where,
  ZERO_ROWS,
  type Field,
  type Op,
  type Row,
} from '@/lib/quan-may/episodes';
import { currentRun, SOLUTION_AFTER, type Action, type EpisodeProgress } from '@/lib/quan-may/progress';

import Frame, { Choices, type FrameProps } from './Frame';
import styles from './quan-may.module.css';

const money = (v: number) => `${v.toLocaleString('vi-VN')}₫`;

function Table({ rows, stale, caption }: { rows: readonly Row[]; stale?: boolean; caption: string }) {
  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={caption}>
      <table className={styles.table} data-stale={stale ? '' : undefined}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">id</th>
            <th scope="col" className={styles.wide}>gio</th>
            <th scope="col" className={styles.wide}>mon</th>
            <th scope="col">gia</th>
            <th scope="col">ma_giam</th>
            <th scope="col">da_tra</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td className={styles.wide}>{r.gio}</td>
              <td className={styles.wide}>{r.mon}</td>
              <td>{r.gia}</td>
              <td>{r.ma_giam ?? 'NULL'}</td>
              <td data-zero={r.da_tra === 0 ? '' : undefined}>{r.da_tra}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const GUESSES = [
  { value: 'price', label: 'Các đơn giá cao' },
  { value: 'zero', label: 'Các đơn khách trả 0₫' },
  { value: 'code', label: 'Các đơn có mã giảm giá' },
  { value: '?', label: 'Chưa biết' },
];

const DECISIONS = [
  {
    value: 'one',
    label: "UPDATE khuyen_mai SET dang_bat = 0 WHERE ma = 'TEST100';",
    correct: true,
    note: 'Chỉ tắt đúng mã thử nghiệm. Các mã khác và sổ đơn còn nguyên.',
  },
  {
    value: 'all',
    label: 'UPDATE khuyen_mai SET dang_bat = 0;',
    correct: false,
    note: 'Thiếu WHERE nên mọi mã đều tắt, kể cả mã sinh viên.',
  },
  {
    value: 'delete',
    label: 'DELETE FROM don_hang WHERE da_tra = 0;',
    correct: false,
    note: 'Xoá mất bằng chứng và đơn sinh nhật hợp lệ, còn mã vẫn bật.',
  },
];

export default function TillEpisode({
  p,
  send,
  lastWait,
}: {
  p: EpisodeProgress;
  send: (a: Action) => void;
  /** Thời gian chờ người học đạt ở tập trước, nếu đã chạy. */
  lastWait: string | null;
}) {
  const run = currentRun(p);
  const solved = p.passed.includes(3);
  const [field, op, value] = p.work;
  const chosen = isField(field) ? { field, op: op as Op, value } : null;
  const result = run && chosen ? where(chosen.field, chosen.op, chosen.value) : null;
  const groups = groupByCode(ZERO_ROWS);
  const culprit = groups.find((g) => g.code === CULPRIT);

  const base = {
    episode: 'Tập 2 · Két bị hụt tiền',
    step: p.current,
    stepNames: ['Đoán', 'Xem mẫu', 'Lọc', 'Gom nhóm', 'Quyết định', 'Đúc kết'],
    onBack: p.current > 1 ? () => send({ type: 'back' }) : undefined,
  };
  const metrics = (rows: number | null, found = false): FrameProps['metrics'] => [
    { label: 'Két hụt', value: money(SHORTFALL), tone: found ? 'ok' : 'bad' },
    { label: 'Số dòng đang xem', value: rows === null ? '—' : String(rows) },
    { label: 'Nghi phạm', value: found ? CULPRIT : '—', tone: found ? 'ok' : undefined },
  ];
  const next = (label: string): FrameProps['primary'] => ({
    label,
    disabled: !p.passed.includes(p.current),
    onClick: () => send({ type: 'next' }),
  });

  if (p.current === 1) {
    const guess = GUESSES.find((g) => g.value === p.prediction)?.label;
    return (
      <Frame
        {...base}
        task="Chọn nhóm đơn bạn muốn xem trước."
        title="Tiền rơi ở đâu?"
        metrics={metrics(ROWS.length)}
        changes={guess ? [`Bạn muốn xem trước: ${guess}`] : []}
        stage={<Table rows={ROWS} caption="Bảng don_hang: 16 đơn trong ngày" />}
        primary={next('Xem cách hỏi bảng')}
      >
        <p>
          {lastWait ? `Lần trước bạn xếp đơn để khách chờ trung bình ${lastWait} phút. ` : ''}
          Tối nay két thiếu {money(SHORTFALL)}, mà máy vẫn ghi đủ đơn.
        </p>
        <Choices
          legend="Nên xem nhóm đơn nào trước?"
          options={GUESSES}
          value={p.prediction}
          onPick={(v) => send({ type: 'predict', value: v })}
        />
      </Frame>
    );
  }

  if (p.current === 2) {
    const ran = p.watched >= 1;
    const sample = where('gia', '=', '35000');
    return (
      <Frame
        {...base}
        task="Chạy câu lệnh mẫu và xem bảng đổi thế nào."
        title="Hỏi bảng bằng SQL"
        metrics={metrics(ran ? sample.length : ROWS.length)}
        changes={ran ? [`Số dòng: ${ROWS.length} → ${sample.length}`] : []}
        stage={
          <>
            <pre className={styles.code}>{sqlText('gia', '=', '35000')}</pre>
            <div className={styles.actions}>
              <button type="button" disabled={ran} onClick={() => send({ type: 'watch', to: 1, total: 1 })}>
                Chạy câu này
              </button>
            </div>
            <Table rows={ran ? sample : ROWS} caption={ran ? 'Chỉ còn đơn giá 35000' : 'Toàn bộ bảng don_hang'} />
          </>
        }
        primary={next('Tự lọc đơn 0₫')}
      >
        <p><code>SELECT *</code> lấy mọi cột. <code>WHERE</code> chỉ giữ những dòng thoả điều kiện.</p>
      </Frame>
    );
  }

  if (p.current === 3) {
    const hintTexts = ['Bạn cần những đơn khách không trả đồng nào.', 'Hãy nhìn cột da_tra, không phải cột gia.', 'Cột đã được chọn sẵn. Bạn chọn phép so sánh và giá trị.'];
    const showSolution = p.attempts >= SOLUTION_AFTER && !solved && p.hints >= hintTexts.length;
    const hint: FrameProps['hint'] =
      p.attempts === 0 || solved
        ? null
        : showSolution
          ? { label: 'Xem lời giải', onClick: () => send({ type: 'solution' }) }
          : p.hints < hintTexts.length
            ? { label: 'Gợi ý', onClick: () => send(p.hints === 2 ? { type: 'hint', work: ['da_tra', '', ''] } : { type: 'hint' }) }
            : null;
    const setPart = (index: number, v: string) => {
      const draft = [field ?? '', op ?? '', value ?? ''];
      draft[index] = v;
      // Đổi cột thì phép và giá trị cũ không còn nghĩa.
      send({ type: 'work', work: index === 0 ? [v, '', ''] : draft });
    };
    const options = isField(field) ? FIELDS[field as Field] : null;
    const missing = result ? ZERO_ROWS.filter((z) => !result.some((r) => r.id === z.id)).length : 0;
    const extra = result ? result.filter((r) => r.da_tra !== 0).length : 0;
    const feedback: FrameProps['feedback'] = run
      ? run.ok
        ? { tone: 'ok', text: `Đúng ${ZERO_ROWS.length} đơn khách trả 0₫.` }
        : { tone: 'bad', text: `Kết quả thiếu ${missing} đơn trả 0₫ và thừa ${extra} đơn đã trả tiền. Điều kiện cần nói về số tiền khách đã trả.` }
      : p.hints > 0
        ? { tone: 'info', text: hintTexts[Math.min(p.hints, hintTexts.length) - 1] }
        : null;
    const ready = Boolean(options && options.ops.includes(op as Op) && options.values.includes(value));
    return (
      <Frame
        {...base}
        task="Lọc ra đúng các đơn khách trả 0₫."
        title="Viết điều kiện WHERE"
        metrics={metrics(result ? result.length : null)}
        changes={p.work.length ? (run ? [`Số dòng: ${ROWS.length} → ${result?.length}`] : ['Chưa chạy điều kiện này']) : []}
        stage={
          <>
            <div className={styles.query}>
              <code>WHERE</code>
              <select aria-label="Cột" value={field ?? ''} onChange={(e) => setPart(0, e.target.value)}>
                <option value="">chọn cột</option>
                {Object.keys(FIELDS).map((f) => <option key={f}>{f}</option>)}
              </select>
              <select aria-label="Phép so sánh" value={op ?? ''} disabled={!options} onChange={(e) => setPart(1, e.target.value)}>
                <option value="">phép</option>
                {options?.ops.map((o) => <option key={o}>{o}</option>)}
              </select>
              <select aria-label="Giá trị" value={value ?? ''} disabled={!options} onChange={(e) => setPart(2, e.target.value)}>
                <option value="">giá trị</option>
                {options?.values.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className={styles.actions}>
              <button type="button" disabled={!ready || Boolean(run)} onClick={() => send({ type: 'run' })}>
                Chạy điều kiện
              </button>
            </div>
            <Table rows={result ?? ROWS} stale={!result} caption={result ? 'Kết quả của điều kiện bạn viết' : 'Chưa chạy: đây vẫn là toàn bộ bảng'} />
          </>
        }
        feedback={feedback}
        hint={hint}
        primary={next('Gom theo mã')}
      >
        <p>Chọn cột, phép so sánh và giá trị, rồi chạy.</p>
      </Frame>
    );
  }

  if (p.current === 4) {
    const found = p.suspect === CULPRIT;
    const wrong = p.suspect && !found ? groups.find((g) => g.code === p.suspect) : null;
    return (
      <Frame
        {...base}
        task="Gom đơn 0₫ theo mã, rồi chạm vào mã làm hụt két."
        title="Gom nhóm để thấy bất thường"
        metrics={metrics(p.grouped ? groups.length : ZERO_ROWS.length, found)}
        changes={p.grouped ? [`${ZERO_ROWS.length} dòng → ${groups.length} nhóm theo ma_giam`] : []}
        stage={
          <>
            <pre className={styles.code}>{'SELECT ma_giam, COUNT(*), SUM(gia)\nFROM don_hang\nWHERE da_tra = 0\nGROUP BY ma_giam;'}</pre>
            {p.grouped ? (
              <ul className={styles.cards} aria-label="Kết quả gom theo mã">
                {groups.map((g) => (
                  <li key={g.code}>
                    <button type="button" aria-pressed={p.suspect === g.code} onClick={() => send({ type: 'suspect', code: g.code })}>
                      <b>{g.code}</b>
                      <span>{g.count} đơn · {money(g.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <div className={styles.actions}>
                  <button type="button" onClick={() => send({ type: 'group' })}>Chạy câu gom nhóm</button>
                </div>
                <Table rows={ZERO_ROWS} caption="Các đơn khách trả 0₫" />
              </>
            )}
          </>
        }
        feedback={
          found
            ? { tone: 'ok', text: `${CULPRIT}: ${culprit?.count} đơn, đúng ${money(culprit?.total ?? 0)} bị hụt.` }
            : wrong
              ? { tone: 'bad', text: `${wrong.code} chỉ ${money(wrong.total)}, và chủ quán đã duyệt đơn sinh nhật. So số tiền với phần két bị hụt.` }
              : null
        }
        primary={next('Chặn mã này')}
      >
        <p><code>GROUP BY</code> gộp các dòng cùng mã. <code>COUNT</code> đếm đơn, <code>SUM</code> cộng tiền.</p>
      </Frame>
    );
  }

  if (p.current === 5)
    return (
      <Frame
        {...base}
        task="Chọn một câu lệnh để chặn mã thử nghiệm."
        title="Sửa mà không phá"
        metrics={metrics(null, true)}
        changes={p.decision ? ['Đã ghi lựa chọn đầu tiên của bạn'] : []}
        stage={
          <p className={styles.note}>
            Đây là mô phỏng, không có dữ liệu thật nào bị đổi. <code>UPDATE</code> sửa giá trị trong các dòng khớp điều kiện.
          </p>
        }
        primary={next('Đúc kết')}
      >
        <Choices
          legend="Bạn chạy câu nào?"
          value={p.decision}
          locked={Boolean(p.decision)}
          onPick={(v) => send({ type: 'decide', value: v })}
          options={[DECISIONS[1], DECISIONS[0], DECISIONS[2]]}
        />
      </Frame>
    );

  return (
    <Frame
      {...base}
      task="Đọc ba ý để chốt tập này."
      title="Bạn vừa hỏi một cơ sở dữ liệu"
      metrics={metrics(null, true)}
      changes={[]}
      stage={
        <>
          <ul className={styles.summary}>
            <li><code>WHERE</code> lọc dòng.</li>
            <li><code>GROUP BY</code> gom dòng để đếm và cộng theo nhóm.</li>
            <li><code>UPDATE</code> hay <code>DELETE</code> thiếu <code>WHERE</code> đụng tới cả bảng.</li>
          </ul>
          <details className={styles.details}>
            <summary>Xem mã đầy đủ</summary>
            <pre className={styles.code}>{"SELECT ma_giam, COUNT(*), SUM(gia)\nFROM don_hang\nWHERE da_tra = 0\nGROUP BY ma_giam;\n\nUPDATE khuyen_mai\nSET dang_bat = 0\nWHERE ma = 'TEST100';"}</pre>
          </details>
        </>
      }
      feedback={{
        tone: p.solutionShown ? 'info' : 'ok',
        text: p.solutionShown ? 'Bạn đã đi hết tập, có xem lời giải ở bước 3.' : 'Bạn đã xong tập này.',
      }}
      primary={{ label: 'Về danh sách tập', href: '/quan-may?ds=1' }}
      hint={{ label: 'Chơi lại', onClick: () => send({ type: 'replay' }) }}
    >
      <p>Két đã khớp, và mã thử nghiệm đã được chặn.</p>
    </Frame>
  );
}
