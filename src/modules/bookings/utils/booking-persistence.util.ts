import { BookingStatus } from '../../../database/entities/tenant/booking.entity';

export interface BookingPersistencePayload {
  patientId: string;
  doctorId?: string;
  testIds?: string[];
  preferredDate?: string;
  notes?: string;
  email?: string;
  phone?: string;
  paymentMode?: string;
  amount?: number;
  centre?: string;
  regNo?: string;
  barcode?: string;
  time?: string;
  recordNo?: string;
  uid?: string;
  patientName?: string;
  patientTitle?: string;
  age?: number;
  ageUnit?: string;
  sex?: string;
  mobile?: string;
  area?: string;
  doctor?: string;
  doctorEmail?: string;
  doctorType?: string;
  bookingType?: string;
  sample?: string;
  takenBy?: string;
  panel?: string;
  fileNo?: string;
  userRate?: string;
  resultType?: string;
  tests?: Array<{
    id?: string;
    backendId?: string;
    code?: string;
    test?: string;
    reportDays?: number;
    rate?: number;
  }>;
  moveAllColumns?: boolean;
  bookingPlusResult?: boolean;
  bookingPlusReceipt?: boolean;
  printWorkingSlip?: boolean;
  extraBy?: string;
  discountBy?: string;
  payType?: string;
  discount?: number;
  discountPercent?: number;
  total?: number;
  net?: number;
  paid?: number;
  cancelRemark?: string;
}

export function buildBookingPersistenceData(
  payload: BookingPersistencePayload,
  bookingNumber: string,
  userId: string,
) {
  const preferredDate = payload.preferredDate ? new Date(payload.preferredDate) : undefined;
  const bookingDate = payload.preferredDate ? new Date(payload.preferredDate) : undefined;

  return {
    bookingNumber,
    patientId: payload.patientId,
    doctorId: payload.doctorId,
    status: BookingStatus.PENDING,
    preferredDate,
    bookingDate,
    notes: payload.notes,
    cancellationRemark: payload.cancelRemark,
    email: payload.email,
    phone: payload.phone,
    paymentMode: payload.paymentMode,
    amount: Number(payload.amount ?? 0),
    paidAmount: Number(payload.paid ?? 0),
    paymentVerified: Boolean(payload.paid && Number(payload.paid) > 0),
    centre: payload.centre,
    regNo: payload.regNo,
    barcode: payload.barcode,
    bookingTime: payload.time,
    recordNo: payload.recordNo,
    uid: payload.uid,
    patientName: payload.patientName,
    patientTitle: payload.patientTitle,
    age: payload.age,
    ageUnit: payload.ageUnit,
    sex: payload.sex,
    mobile: payload.mobile,
    area: payload.area,
    doctorPrintName: payload.doctor,
    doctorEmail: payload.doctorEmail,
    doctorType: payload.doctorType,
    bookingType: payload.bookingType,
    sample: payload.sample,
    takenBy: payload.takenBy,
    panel: payload.panel,
    fileNo: payload.fileNo,
    userRate: payload.userRate,
    resultType: payload.resultType,
    moveAllColumns: payload.moveAllColumns,
    bookingPlusResult: payload.bookingPlusResult,
    bookingPlusReceipt: payload.bookingPlusReceipt,
    printWorkingSlip: payload.printWorkingSlip,
    extraBy: payload.extraBy,
    discountBy: payload.discountBy,
    discount: Number(payload.discount ?? 0),
    discountPercent: Number(payload.discountPercent ?? 0),
    totalAmount: Number(payload.total ?? payload.amount ?? 0),
    net: Number(payload.net ?? payload.amount ?? 0),
    paid: Number(payload.paid ?? 0),
    createdBy: userId,
    updatedBy: userId,
  };
}
