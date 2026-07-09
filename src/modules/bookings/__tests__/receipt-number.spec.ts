import { buildReceiptNumber } from '../utils/receipt-number.util';

describe('buildReceiptNumber', () => {
  it('builds a receipt number from a tenant code and date', () => {
    const receiptNumber = buildReceiptNumber('demo', '2026-07-09', 12);

    expect(receiptNumber).toBe('DEMO-RCPT-20260709-0012');
  });
});
