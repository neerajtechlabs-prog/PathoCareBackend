import { buildPatientUid } from '../utils/patient-uid.util';

describe('buildPatientUid', () => {
  it('formats a patient UID with the expected date and sequence', () => {
    const uid = buildPatientUid(new Date('2026-07-09T00:00:00.000Z'), 3);

    expect(uid).toBe('PT-20260709-0003');
  });
});
