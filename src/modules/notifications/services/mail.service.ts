import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      requireTLS: true,
    });
  }

  async sendMail(to: string, subject: string, body: string) {
    return this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text: body,
    });
  }
}
