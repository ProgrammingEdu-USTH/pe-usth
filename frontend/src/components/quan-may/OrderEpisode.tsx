'use client';

import {
  ARRIVAL_ORDER,
  averageWait,
  NEW_CASE,
  ORDERS,
  schedule,
  WAIT_GOAL,
  type Slot,
} from '@/lib/quan-may/episodes';
import { currentRun, SOLUTION_AFTER, type Action, type EpisodeProgress } from '@/lib/quan-may/progress';

import Frame, { Choices, type FrameProps } from './Frame';
import styles from './quan-may.module.css';

const num = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

/** Dòng thời gian bằng DOM: mỗi đơn một hàng, thanh bắt đầu ở lúc được pha. */
function Timeline({ slots, caption, shown = slots.length }: { slots: Slot[]; caption: string; shown?: number }) {
  const total = Math.max(1, ...slots.map((s) => s.end));
  return (
    <table className={styles.timeline}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Đơn</th>
          <th scope="col">Pha</th>
          <th scope="col">Chờ</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((s, i) => (
          <tr key={s.order.id} data-hidden={i >= shown ? '' : undefined}>
            <th scope="row">{s.order.name}</th>
            <td>
              <span className={styles.track}>
                {i < shown && (
                  <span
                    className={styles.bar}
                    style={{ left: `${(s.start / total) * 100}%`, width: `${(s.order.minutes / total) * 100}%` }}
                  />
                )}
              </span>
              {s.order.minutes} phút
            </td>
            <td>{i < shown ? `${s.start} phút` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const GUESSES = [
  { value: '4', label: 'Khoảng 4 phút' },
  { value: '10', label: 'Khoảng 10 phút' },
  { value: '19', label: 'Khoảng 19 phút' },
  { value: '?', label: 'Chưa biết' },
];

const DECISIONS = [
  { value: 'swap', label: 'Đổi chỗ đơn 2 phút và đơn 3 phút', order: ['P', 'Q', 'S', 'R'] },
  { value: 'one', label: 'Chỉ đưa đơn 1 phút lên đầu', order: ['Q', 'P', 'R', 'S'] },
  { value: 'last', label: 'Đưa đơn 12 phút xuống cuối', order: ['Q', 'R', 'S', 'P'] },
];

export default function OrderEpisode({ p, send }: { p: EpisodeProgress; send: (a: Action) => void }) {
  const arrival = schedule(ARRIVAL_ORDER);
  const arrivalWait = averageWait(arrival);
  const mine = schedule(p.work);
  const run = currentRun(p);
  const mineWait = averageWait(mine);
  const solved = p.passed.includes(3);
  const guess = GUESSES.find((g) => g.value === p.prediction)?.label;

  const base = {
    episode: 'Tập 1 · Xếp đơn giờ đông',
    step: p.current,
    onBack: p.current > 1 ? () => send({ type: 'back' }) : undefined,
  };
  const metrics = (wait: number | null): FrameProps['metrics'] => [
    { label: 'Chờ trung bình', value: wait === null ? '—' : `${num(wait)} phút`, tone: wait === null ? undefined : wait <= WAIT_GOAL ? 'ok' : 'bad' },
    { label: 'Mục tiêu', value: `≤ ${num(WAIT_GOAL)} phút` },
  ];
  const next = (label: string): FrameProps['primary'] => ({
    label,
    disabled: !p.passed.includes(p.current) && p.current !== 4,
    onClick: () => send({ type: 'next' }),
  });
  const queue = (
    <ul className={styles.cards}>
      {ORDERS.map((o) => (
        <li key={o.id}>
          <b>{o.name}</b>
          <span>{o.minutes} phút pha</span>
        </li>
      ))}
    </ul>
  );

  if (p.current === 1)
    return (
      <Frame
        {...base}
        task="Đoán thời gian chờ khi pha theo thứ tự khách đến."
        title="Năm đơn đến cùng lúc"
        metrics={metrics(null)}
        changes={guess ? [`Lời đoán của bạn: ${guess}`] : []}
        stage={queue}
        primary={next('Chạy thử thứ tự đến')}
      >
        <p>Quán Mây chỉ có một người pha. Linh thấy khách cau mày vì đợi lâu.</p>
        <Choices
          legend="Pha lần lượt từ trên xuống, trung bình mỗi đơn chờ bao lâu mới được pha?"
          options={GUESSES}
          value={p.prediction}
          onPick={(value) => send({ type: 'predict', value })}
        />
      </Frame>
    );

  if (p.current === 2) {
    const total = arrival.length;
    const last = arrival[p.watched - 1];
    const done = p.watched >= total;
    return (
      <Frame
        {...base}
        task="Bấm pha từng đơn và để ý cột Chờ."
        title="Thứ tự đến chạy ra sao"
        metrics={metrics(done ? arrivalWait : null)}
        changes={last ? [`${last.order.name}: chờ ${last.start} phút, xong ở phút ${last.end}`] : []}
        stage={
          <>
            <Timeline slots={arrival} shown={p.watched} caption="Pha theo thứ tự đến" />
            {!done && (
              <div className={styles.actions}>
                <button type="button" onClick={() => send({ type: 'watch', to: p.watched + 1, total })}>
                  Pha đơn tiếp theo
                </button>
                <button type="button" className={styles.quiet} onClick={() => send({ type: 'watch', to: total, total })}>
                  Xem hết
                </button>
              </div>
            )}
          </>
        }
        feedback={done ? { tone: 'info', text: `Chờ trung bình ${num(arrivalWait)} phút. Bạn đoán: ${guess ?? 'chưa đoán'}.` } : null}
        primary={next('Tự xếp lại')}
      >
        <p>Một đơn phải chờ tổng thời gian pha của mọi đơn đứng trước nó.</p>
      </Frame>
    );
  }

  if (p.current === 3) {
    const slowest = mine.reduce<Slot | null>((a, s) => (!a || s.start > a.start ? s : a), null);
    const longest = mine.slice(0, -1).reduce<Slot | null>((a, s) => (!a || s.order.minutes > a.order.minutes ? s : a), null);
    const hintTexts = [
      'Đơn pha lâu mà đứng trước thì mọi đơn sau đều phải chờ nó.',
      'Xem đơn đang chờ lâu nhất: đơn nào đứng trước nó mà pha lâu?',
      'Hai chỗ đầu đã được đặt sẵn cho bạn.',
    ];
    const showSolution = p.attempts >= SOLUTION_AFTER && !solved && p.hints >= hintTexts.length;
    const hint: FrameProps['hint'] =
      p.attempts === 0 || solved
        ? null
        : showSolution
          ? { label: 'Xem lời giải', onClick: () => send({ type: 'solution' }) }
          : p.hints < hintTexts.length
            ? { label: 'Gợi ý', onClick: () => send(p.hints === 2 ? { type: 'hint', work: ['D', 'B'] } : { type: 'hint' }) }
            : null;
    const feedback: FrameProps['feedback'] = run
      ? run.ok
        ? { tone: 'ok', text: `Đạt. Chờ trung bình còn ${num(mineWait)} phút.` }
        : {
            tone: 'bad',
            text: `Chờ trung bình ${num(mineWait)} phút, chưa đạt. ${slowest?.order.name} chờ lâu nhất (${slowest?.start} phút). Thử chuyển ${longest?.order.name} ra sau.`,
          }
      : p.hints > 0
        ? { tone: 'info', text: hintTexts[Math.min(p.hints, hintTexts.length) - 1] }
        : null;
    return (
      <Frame
        {...base}
        task="Xếp đủ năm đơn sao cho chờ trung bình không quá 4,5 phút."
        title="Bạn là người xếp hàng"
        metrics={metrics(run ? mineWait : null)}
        changes={p.work.length ? [`Đã xếp ${p.work.length}/${ORDERS.length} đơn`, run ? `Đã pha: chờ trung bình ${num(mineWait)} phút` : 'Chưa pha thứ tự này'] : []}
        stage={
          <>
            <ol className={styles.slots} aria-label="Thứ tự pha của bạn">
              {ORDERS.map((_, i) => {
                const o = ORDERS.find((x) => x.id === p.work[i]);
                return (
                  <li key={i}>
                    {o ? (
                      <button type="button" aria-label={`Gỡ ${o.name} khỏi vị trí ${i + 1}`} onClick={() => send({ type: 'work', work: p.work.filter((id) => id !== o.id) })}>
                        <b>{o.name}</b>
                        <span>{run ? `chờ ${mine[i].start} phút` : `${o.minutes} phút`}</span>
                      </button>
                    ) : (
                      <span className={styles.empty}>{i + 1}</span>
                    )}
                  </li>
                );
              })}
            </ol>
            <ul className={styles.cards} aria-label="Đơn chưa xếp">
              {ORDERS.filter((o) => !p.work.includes(o.id)).map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => send({ type: 'work', work: [...p.work, o.id] })}>
                    <b>{o.name}</b>
                    <span>{o.minutes} phút pha</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <button type="button" disabled={p.work.length < ORDERS.length || Boolean(run)} onClick={() => send({ type: 'run' })}>
                Pha theo thứ tự này
              </button>
            </div>
          </>
        }
        feedback={feedback}
        hint={hint}
        primary={next('Xem vì sao nhanh hơn')}
      >
        <p>Chạm một đơn để đưa vào hàng. Chạm lại trong hàng để gỡ ra.</p>
      </Frame>
    );
  }

  if (p.current === 4)
    return (
      <Frame
        {...base}
        task="So hai dòng thời gian."
        title="Việc ngắn đi trước"
        metrics={metrics(mineWait)}
        changes={[`Chờ trung bình: ${num(arrivalWait)} → ${num(mineWait)} phút`]}
        stage={
          <>
            <Timeline slots={arrival} caption={`Thứ tự đến: chờ trung bình ${num(arrivalWait)} phút`} />
            <Timeline slots={mine} caption={`Thứ tự của bạn: chờ trung bình ${num(mineWait)} phút`} />
          </>
        }
        primary={next('Thử một ca mới')}
      >
        <p>Đơn ngắn đứng trước khiến ít người phải chờ lâu. Cách xếp này gọi là <b>việc ngắn nhất trước</b> (SJF).</p>
        <p>Một việc dài đứng đầu làm cả hàng ùn lại. Đó là <b>hiệu ứng đoàn xe</b>.</p>
      </Frame>
    );

  if (p.current === 5) {
    const picked = DECISIONS.find((d) => d.value === p.decision);
    const before = averageWait(schedule(NEW_CASE.map((o) => o.id), NEW_CASE));
    const after = picked ? averageWait(schedule(picked.order, NEW_CASE)) : null;
    return (
      <Frame
        {...base}
        task="Chọn một thay đổi giúp giảm chờ nhiều nhất."
        title="Một ca mới"
        metrics={[{ label: 'Chờ trung bình', value: after === null ? `${num(before)} phút` : `${num(before)} → ${num(after)} phút`, tone: after === null ? undefined : p.decision === 'last' ? 'ok' : 'bad' }]}
        changes={picked && after !== null ? [`${picked.label}: ${num(before)} → ${num(after)} phút`] : []}
        stage={<Timeline slots={schedule(picked ? picked.order : NEW_CASE.map((o) => o.id), NEW_CASE)} caption={picked ? 'Sau thay đổi bạn chọn' : 'Hàng đang chờ'} />}
        primary={next('Đúc kết')}
      >
        <Choices
          legend="Bốn đơn đã đến đủ, theo thứ tự 12, 1, 2, 3 phút. Bạn đổi gì?"
          value={p.decision}
          locked={Boolean(p.decision)}
          onPick={(value) => send({ type: 'decide', value })}
          options={DECISIONS.map((d) => ({
            value: d.value,
            label: d.label,
            correct: d.value === 'last',
            note: `Chờ trung bình ${num(averageWait(schedule(d.order, NEW_CASE)))} phút.`,
          }))}
        />
      </Frame>
    );
  }

  return (
    <Frame
      {...base}
      task="Đọc ba ý rồi sang tập sau."
      title="Bạn vừa lập lịch cho một CPU"
      metrics={metrics(mineWait)}
      changes={[]}
      stage={
        <ul className={styles.summary}>
          <li>Đơn hàng giống một <b>tiến trình</b>, người pha giống <b>CPU</b>.</li>
          <li>Việc ngắn trước làm giảm thời gian chờ trung bình.</li>
          <li>Việc dài đứng đầu kéo mọi việc sau chậm lại.</li>
        </ul>
      }
      feedback={{
        tone: p.solutionShown ? 'info' : 'ok',
        text: p.solutionShown ? 'Bạn đã đi hết tập, có xem lời giải ở bước 3.' : 'Bạn đã xong tập này.',
      }}
      primary={{ label: 'Mở tập Két bị hụt', href: '/quan-may/ket-hut-tien' }}
      hint={{ label: 'Chơi lại', onClick: () => send({ type: 'replay' }) }}
    >
      <p>Tối đó Linh đếm két và thấy thiếu tiền.</p>
    </Frame>
  );
}
