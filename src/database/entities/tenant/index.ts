export { Lab } from './lab.entity';
export { Department } from './department.entity';
export { SampleType } from './sample-type.entity';
export { User } from './user.entity';
export { RefreshToken } from './refresh-token.entity';
export { TestCatalog } from './test-catalog.entity';
export { TestParameter } from './test-parameter.entity';
export { Doctor } from './doctor.entity';
export { Patient } from './patient.entity';
export { Booking, BookingStatus } from './booking.entity';
export { BookingTest } from './booking-test.entity';
export { BookingReceipt } from './booking-receipt.entity';
export { NotificationLog } from './notification-log.entity';
export { Report } from './report.entity';
export { TestParameterResult } from './test-parameter-result.entity';
export { TestResult } from './test-result.entity';
export { ActivityLog } from './activity-log.entity';

import { Lab } from './lab.entity';
import { Department } from './department.entity';
import { SampleType } from './sample-type.entity';
import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { TestCatalog } from './test-catalog.entity';
import { TestParameter } from './test-parameter.entity';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';
import { Booking } from './booking.entity';
import { BookingTest } from './booking-test.entity';
import { BookingReceipt } from './booking-receipt.entity';
import { NotificationLog } from './notification-log.entity';
import { Report } from './report.entity';
import { TestParameterResult } from './test-parameter-result.entity';
import { TestResult } from './test-result.entity';
import { ActivityLog } from './activity-log.entity';

export const tenantEntities = [
  Lab,
  Department,
  SampleType,
  User,
  RefreshToken,
  TestCatalog,
  TestParameter,
  Doctor,
  Patient,
  Booking,
  BookingTest,
  BookingReceipt,
  NotificationLog,
  Report,
  TestParameterResult,
  TestResult,
  ActivityLog,
];
