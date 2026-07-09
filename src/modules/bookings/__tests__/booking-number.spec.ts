import { buildBookingNumber } from '../utils/booking-number.util';

describe('buildBookingNumber', () => {
  it('builds a booking number from a tenant code and date', () => {
    const bookingNumber = buildBookingNumber('demo', '2026-07-09', 12);

    expect(bookingNumber).toBe('DEMO-20260709-0012');
  });
});
