import * as qrcode from 'qrcode';

export async function generateBookingBarcode(bookingNumber: string): Promise<string> {
  return `BC-${bookingNumber}`;
}

export async function generateBookingQrCode(bookingNumber: string): Promise<string> {
  return qrcode.toDataURL(bookingNumber);
}
