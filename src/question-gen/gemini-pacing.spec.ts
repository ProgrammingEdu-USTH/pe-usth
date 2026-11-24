import { Pacer, parseRetryDelayMs, retryWaitMs } from './gemini-pacing';

// Hình dạng lỗi THẬT Google trả về khi vượt quota (ghi 23/11/2026, model gemini-3.8-flash).
const QUOTA_429 = {
  error: {
    code: 429,
    message:
      'You exceeded your current quota. Quota exceeded for metric: generate_content_free_tier_requests, limit: 5. Please retry in 16.412380262s.',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
        retryDelay: '16s',
      },
    ],
  },
};

describe('parseRetryDelayMs', () => {
  it('đọc "retry in 16.41s" trong văn bản lỗi, làm tròn lên mili-giây', () => {
    expect(parseRetryDelayMs(QUOTA_429)).toBe(16413);
  });

  it('đọc được retryDelay trong details khi văn bản không có câu "retry in"', () => {
    expect(
      parseRetryDelayMs({ error: { details: [{ retryDelay: '7s' }] } }),
    ).toBe(7000);
  });

  it('không có gì thì null', () => {
    expect(parseRetryDelayMs({ error: { message: 'high demand' } })).toBeNull();
    expect(parseRetryDelayMs(undefined)).toBeNull();
  });
});

// Lỗi THẬT khi hết quota NGÀY (24/11/2026): chờ theo đó là treo script 19 tiếng.
const DAILY_429 = {
  error: {
    code: 429,
    message:
      'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash, description: Generate content requests per day limit exceeded on Free Tier.\nPlease retry in 19h5m25.790983238s.',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
        retryDelay: '68725s',
      },
    ],
  },
};

describe('quota ngày', () => {
  it('đọc "19h5m25.79s" thành đủ giờ, phút, giây', () => {
    // 19 × 3600 + 5 × 60 + 25,79 = 68 725,79 s
    expect(parseRetryDelayMs(DAILY_429)).toBe(68725791);
  });

  it('không thử lại khi hết quota ngày (không ngủ 19 tiếng)', () => {
    expect(retryWaitMs(429, DAILY_429, 1, 5)).toBeNull();
  });

  it('không thử lại khi Google đòi chờ quá 2 phút dù không ghi "per day"', () => {
    expect(
      retryWaitMs(429, { error: { details: [{ retryDelay: '600s' }] } }, 1, 5),
    ).toBeNull();
  });
});

describe('retryWaitMs', () => {
  it('429: chờ đúng thời gian Google yêu cầu cộng 1 giây đệm', () => {
    expect(retryWaitMs(429, QUOTA_429, 1, 5)).toBe(17413);
  });

  it('429 không có gợi ý: chờ 20 s', () => {
    expect(retryWaitMs(429, {}, 1, 5)).toBe(20000);
  });

  it('503: tăng dần 15 s, 30 s, 45 s, không quá 90 s', () => {
    expect(retryWaitMs(503, {}, 1, 5)).toBe(15000);
    expect(retryWaitMs(503, {}, 2, 5)).toBe(30000);
    expect(retryWaitMs(503, {}, 3, 5)).toBe(45000);
    expect(retryWaitMs(503, {}, 9, 9)).toBe(90000);
  });

  it('hết số lần thử thì null', () => {
    expect(retryWaitMs(503, {}, 6, 5)).toBeNull();
  });

  it('lỗi 4xx khác (key sai, model không có) không thử lại', () => {
    expect(retryWaitMs(400, {}, 1, 5)).toBeNull();
    expect(retryWaitMs(404, {}, 1, 5)).toBeNull();
    expect(retryWaitMs(403, {}, 1, 5)).toBeNull();
  });
});

describe('Pacer', () => {
  it('giãn các lượt gọi đúng khoảng tối thiểu, kể cả khi gọi đồng thời', async () => {
    let clock = 0;
    const slept: number[] = [];
    const pacer = new Pacer(
      12000,
      () => clock,
      (ms) => {
        slept.push(ms);
        clock += ms;
        return Promise.resolve();
      },
    );
    // Ba lượt xin cùng lúc: lượt đầu không chờ, hai lượt sau mỗi lượt chờ 12 s.
    await Promise.all([pacer.wait(), pacer.wait(), pacer.wait()]);
    expect(slept).toEqual([12000, 12000]);
  });

  it('không chờ thêm nếu đã qua đủ khoảng', async () => {
    let clock = 0;
    const slept: number[] = [];
    const pacer = new Pacer(
      12000,
      () => clock,
      (ms) => {
        slept.push(ms);
        clock += ms;
        return Promise.resolve();
      },
    );
    await pacer.wait();
    clock += 60000;
    await pacer.wait();
    expect(slept).toEqual([]);
  });
});
