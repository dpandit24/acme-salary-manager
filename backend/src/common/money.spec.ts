import { average_minor, div_half_up, median_minor, pay_stats, sum_minor, to_usd_minor } from './money';

describe('money', () => {
  describe('to_usd_minor', () => {
    it('keeps USD unchanged at a rate of 1', () => {
      expect(to_usd_minor(12_345_678, 1_000_000)).toBe(12_345_678);
    });

    it('converts INR at a rate below 1', () => {
      // 1,000,000.00 INR at 0.012 USD/INR = 12,000.00 USD
      expect(to_usd_minor(100_000_000, 12_000)).toBe(1_200_000);
    });

    it('rounds half up at the boundary', () => {
      // 1 * 0.5 = 0.5 minor -> 1
      expect(to_usd_minor(1, 500_000)).toBe(1);
      // 1 * 0.499999 = 0.499999 minor -> 0
      expect(to_usd_minor(1, 499_999)).toBe(0);
    });

    it('does not lose precision when amount * rate exceeds 2^53', () => {
      // 90 billion minor GBP * 1.27 = 114.3 billion minor USD, product 1.143e17
      expect(to_usd_minor(90_000_000_000, 1_270_000)).toBe(114_300_000_000);
    });
  });

  describe('div_half_up', () => {
    it('rounds .5 up and below .5 down', () => {
      expect(div_half_up(5n, 2n)).toBe(3n);
      expect(div_half_up(7n, 3n)).toBe(2n);
      expect(div_half_up(8n, 3n)).toBe(3n);
    });
  });

  describe('median_minor', () => {
    it('returns the middle value for an odd count', () => {
      expect(median_minor([300, 100, 200])).toBe(200);
    });

    it('returns the half-up mean of the central values for an even count', () => {
      expect(median_minor([100, 201, 400, 50])).toBe(151); // (100 + 201) / 2 = 150.5 -> 151
    });

    it('is 0 for an empty list', () => {
      expect(median_minor([])).toBe(0);
    });
  });

  it('average is pulled up by a senior outlier while median is not', () => {
    const amounts = [100, 100, 100, 100, 10_000];
    expect(average_minor(amounts)).toBe(2_080);
    expect(median_minor(amounts)).toBe(100);
  });

  it('pay_stats combines total, average and median', () => {
    expect(pay_stats([1, 2])).toEqual({ total_minor: 3, average_minor: 2, median_minor: 2 });
    expect(sum_minor([])).toBe(0);
  });
});
