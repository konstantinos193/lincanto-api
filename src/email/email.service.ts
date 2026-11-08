import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { signReviewToken } from '../reviews/review-token';

export type EmailLang = 'en' | 'el';

export interface BookingEmailData {
  guestName: string;
  guestEmail: string;
  bookingId: string;
  propertyName: string;
  roomName?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  currency: string;
  lang?: EmailLang;
  stripePaymentIntentId?: string;
  stripeReceiptUrl?: string;
  refundAmount?: number;
  refundPercentage?: number;
  cancellationReason?: string;
}

export interface BookingRescheduleEmailData {
  guestName: string;
  guestEmail: string;
  bookingId: string;
  propertyName: string;
  originalDates: { checkIn: Date; checkOut: Date };
  newDates: { checkIn: Date; checkOut: Date };
  totalPrice: number;
  reason?: string;
  lang?: EmailLang;
}

export interface InquiryEmailData {
  guestName: string;
  guestEmail: string;
  propertyName: string;
  message: string;
  inquiryId: string;
  lang?: EmailLang;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    dear:              (name: string) => `Dear <strong style="color:#e5e7eb;">${name}</strong>,`,
    property:          'Property',
    checkIn:           'Check-in',
    checkOut:          'Check-out',
    duration:          (n: number) => `${n} ${n === 1 ? 'night' : 'nights'}`,
    guests:            'Guests',
    total:             'Total',
    questions:         'Questions?',
    contact:           'Contact us:',
    replyDirect:       'Reply directly:',
    // Confirmation
    confirmTitle:      'Booking Confirmed',
    confirmIntro:      (hotel: string) => `Your booking is confirmed. We look forward to welcoming you to <strong style="color:#f59e0b;">${hotel}</strong>.`,
    arrivalTime:       'Arrival: <strong style="color:#e5e7eb;">3:00 PM – 11:00 PM</strong> &nbsp;·&nbsp; Departure: <strong style="color:#e5e7eb;">by 11:00 AM</strong>',
    viewReceipt:       'View official receipt →',
    // Cancellation
    cancelTitle:       'Booking Cancelled',
    cancelIntro:       (reason?: string) => `Your booking has been cancelled.${reason ? ` <span style="color:#6b7280;">Reason: ${reason}</span>` : ''}`,
    originalAmount:    'Original amount',
    refund:            'Refund',
    noRefund:          'No refund',
    refundNote:        'The refund will appear on your account within <strong style="color:#e5e7eb;">5–10 business days</strong>.',
    // Reminder
    reminderEyebrow:   'Arrival reminder',
    reminderTitle:     'Check-in tomorrow!',
    reminderIntro:     (hotel: string) => `Reminder: tomorrow is your arrival day at <strong style="color:#f59e0b;">${hotel}</strong>. We can't wait to see you!`,
    arrivalInfo:       'Arrival info',
    checkInTime:       'Check-in: <strong style="color:#e5e7eb;">3:00 PM – 11:00 PM</strong>',
    checkOutTime:      'Check-out: <strong style="color:#e5e7eb;">by 11:00 AM</strong>',
    needHelp:          'Need help?',
    // Inquiry admin
    newInquiryEyebrow: 'New inquiry',
    from:              'From',
    message:           'Message',
    // Inquiry guest
    receivedEyebrow:   'We received your message',
    receivedTitle:     'We\'ll be in touch soon',
    receivedIntro:     'We received your inquiry and will get back to you as soon as possible.',
    yourMessage:       'Your message',
    // Subjects
    subjectConfirm:    (ref: string, hotel: string) => `Booking Confirmation #${ref} — ${hotel}`,
    subjectCancel:     (ref: string, hotel: string) => `Booking Cancellation #${ref} — ${hotel}`,
    subjectReminder:   (hotel: string) => `Reminder: Check-in tomorrow — ${hotel}`,
    subjectInqAdmin:   (ref: string, name: string) => `New Inquiry #${ref} from ${name}`,
    subjectInqGuest:   (hotel: string) => `We received your message — ${hotel}`,
    // Reschedule
    subjectReschedule: (ref: string, hotel: string) => `Booking Rescheduled #${ref} — ${hotel}`,
    rescheduleTitle: 'Booking Rescheduled',
    rescheduleIntro: (reason?: string) => `Your booking has been rescheduled.${reason ? ` <span style="color:#6b7280;">Reason: ${reason}</span>` : ''}`,
    originalDates: 'Original dates',
    newDates: 'New dates',
  },
  el: {
    dear:              (name: string) => `Αγαπητέ/ή <strong style="color:#e5e7eb;">${name}</strong>,`,
    property:          'Κατάλυμα',
    checkIn:           'Check-in',
    checkOut:          'Check-out',
    duration:          (n: number) => `${n} ${n === 1 ? 'βράδυ' : 'βράδια'}`,
    guests:            'Επισκέπτες',
    total:             'Σύνολο',
    questions:         'Ερωτήσεις;',
    contact:           'Επικοινωνία:',
    replyDirect:       'Απαντήστε απευθείας:',
    // Confirmation
    confirmTitle:      'Κράτηση Επιβεβαιώθηκε',
    confirmIntro:      (hotel: string) => `Η κράτησή σας επιβεβαιώθηκε. Ανυπομονούμε να σας υποδεχτούμε στο <strong style="color:#f59e0b;">${hotel}</strong>.`,
    arrivalTime:       'Ώρα άφιξης: <strong style="color:#e5e7eb;">15:00 – 23:00</strong> &nbsp;·&nbsp; Αναχώρηση: <strong style="color:#e5e7eb;">έως 11:00</strong>',
    viewReceipt:       'Προβολή επίσημης απόδειξης →',
    // Cancellation
    cancelTitle:       'Ακύρωση Κράτησης',
    cancelIntro:       (reason?: string) => `Η κράτησή σας ακυρώθηκε.${reason ? ` <span style="color:#6b7280;">Λόγος: ${reason}</span>` : ''}`,
    originalAmount:    'Αρχικό ποσό',
    refund:            'Επιστροφή χρημάτων',
    noRefund:          'Χωρίς επιστροφή',
    refundNote:        'Η επιστροφή θα εμφανιστεί στον λογαριασμό σας εντός <strong style="color:#e5e7eb;">5–10 εργάσιμων ημερών</strong>.',
    // Reminder
    reminderEyebrow:   'Υπενθύμιση άφιξης',
    reminderTitle:     'Check-in αύριο!',
    reminderIntro:     (hotel: string) => `Σας υπενθυμίζουμε ότι αύριο είναι η ημέρα άφιξής σας στο <strong style="color:#f59e0b;">${hotel}</strong>. Σας περιμένουμε!`,
    arrivalInfo:       'Πληροφορίες άφιξης',
    checkInTime:       'Ώρα check-in: <strong style="color:#e5e7eb;">15:00 – 23:00</strong>',
    checkOutTime:      'Ώρα check-out: <strong style="color:#e5e7eb;">έως 11:00</strong>',
    needHelp:          'Χρειάζεστε βοήθεια;',
    // Inquiry admin
    newInquiryEyebrow: 'Νέο αίτημα επικοινωνίας',
    from:              'Από',
    message:           'Μήνυμα',
    // Inquiry guest
    receivedEyebrow:   'Λάβαμε το μήνυμά σας',
    receivedTitle:     'Θα επικοινωνήσουμε σύντομα',
    receivedIntro:     'Λάβαμε το αίτημά σας και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.',
    yourMessage:       'Το μήνυμά σας',
    // Subjects
    subjectConfirm:    (ref: string, hotel: string) => `Επιβεβαίωση Κράτησης #${ref} — ${hotel}`,
    subjectCancel:     (ref: string, hotel: string) => `Ακύρωση Κράτησης #${ref} — ${hotel}`,
    subjectReminder:   (hotel: string) => `Υπενθύμιση: Check-in αύριο — ${hotel}`,
    subjectInqAdmin:   (ref: string, name: string) => `Νέο Inquiry #${ref} από ${name}`,
    subjectInqGuest:   (hotel: string) => `Λάβαμε το μήνυμά σας — ${hotel}`,
    // Reschedule
    subjectReschedule: (ref: string, hotel: string) => `Αλλαγή Κράτησης #${ref} — ${hotel}`,
    rescheduleTitle: 'Αλλαγή Κράτησης',
    rescheduleIntro: (reason?: string) => `Η κράτησή σας έχει αλλάξει.${reason ? ` <span style="color:#6b7280;">Λόγος: ${reason}</span>` : ''}`,
    originalDates: 'Αρχικές ημερομηνίες',
    newDates: 'Νέες ημερομηνίες',
  },
} as const;

// ─── Shared design tokens ─────────────────────────────────────────────────────
const LOGO_URL  = 'https://licanto.vercel.app/incanto-logo.png';
const SITE_URL  = 'https://licanto.vercel.app';
const HOTEL     = "L'Incanto Apartments";
const EMAIL     = 'lincantobook@gmail.com';

const BASE_STYLES = `
  body { margin:0; padding:0; background:#0d1117; font-family:'Inter','Helvetica Neue',Arial,sans-serif; }
  a { color:#f59e0b; text-decoration:none; }
`;

function layout(lang: EmailLang, headerAccent: string, headerContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${BASE_STYLES}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- LOGO BAR -->
      <tr>
        <td style="background:#111827;border-radius:12px 12px 0 0;padding:24px 40px;border-bottom:1px solid rgba(245,158,11,0.25);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="${LOGO_URL}" alt="${HOTEL}" height="44" style="display:block;height:44px;width:auto;">
                <span style="display:block;font-size:9px;letter-spacing:0.2em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin-top:2px;padding-left:2px;">by SM Holdings</span>
              </td>
              <td align="right" style="color:rgba(255,255,255,0.35);font-size:12px;letter-spacing:0.05em;">Preveza, Greece</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- HEADER BANNER -->
      <tr>
        <td style="background:${headerAccent};padding:36px 40px;text-align:center;">
          ${headerContent}
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#111827;padding:36px 40px;">
          ${bodyContent}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#0d1117;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid rgba(245,158,11,0.15);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#4b5563;font-size:12px;line-height:1.6;">
                <strong style="color:#6b7280;">${HOTEL}</strong> &nbsp;·&nbsp; Preveza, Greece<br>
                <a href="mailto:${EMAIL}" style="color:#f59e0b;">${EMAIL}</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}" style="color:#f59e0b;">${SITE_URL.replace('https://', '')}</a>
              </td>
              <td align="right" style="color:#374151;font-size:11px;">
                &copy; ${new Date().getFullYear()} adinfinity. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function detailsTable(rows: { label: string; value: string; highlight?: boolean }[]): string {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="color:#6b7280;padding:9px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05);">${r.label}</td>
      <td style="color:${r.highlight ? '#f59e0b' : '#e5e7eb'};font-size:${r.highlight ? '17px' : '13px'};font-weight:${r.highlight ? '700' : '500'};text-align:right;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${r.value}</td>
    </tr>`).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;padding:20px 24px;margin:20px 0;">
      <tr><td colspan="2" style="padding-bottom:12px;border-bottom:1px solid rgba(245,158,11,0.2);">&nbsp;</td></tr>
      ${rowsHtml}
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not configured — emails will be skipped. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"${HOTEL}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err instanceof Error ? err.message : err}`);
    }
  }

  private formatDate(date: Date, lang: EmailLang): string {
    return new Date(date).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  private nights(checkIn: Date, checkOut: Date): number {
    return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  }

  // ─── 1. Booking Confirmation ──────────────────────────────────────────────
  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];
    const nights = this.nights(data.checkIn, data.checkOut);
    const ref = data.bookingId.slice(-8).toUpperCase();

    const header = `
      <div style="width:56px;height:56px;background:rgba(245,158,11,0.15);border:2px solid rgba(245,158,11,0.4);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:26px;">✓</span>
      </div>
      <h1 style="color:#f9fafb;margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:-0.02em;">${t.confirmTitle}</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Ref #${ref}</p>
    `;

    const body = `
      <p style="color:#9ca3af;font-size:15px;margin:0 0 24px;">${t.dear(data.guestName)}</p>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.confirmIntro(HOTEL)}</p>
      ${detailsTable([
        { label: t.property,  value: data.propertyName + (data.roomName ? ` — ${data.roomName}` : '') },
        { label: t.checkIn,   value: this.formatDate(data.checkIn, lang) },
        { label: t.checkOut,  value: this.formatDate(data.checkOut, lang) },
        { label: lang === 'el' ? 'Διάρκεια' : 'Duration', value: t.duration(nights) },
        { label: t.guests,    value: String(data.guests) },
        { label: t.total,     value: `${data.currency} ${data.totalPrice.toFixed(2)}`, highlight: true },
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;padding:16px 24px;margin:8px 0 16px;border:1px solid rgba(245,158,11,0.2);">
        <tr><td style="color:#9ca3af;font-size:13px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.05);">${t.arrivalTime}</td></tr>
        ${data.stripeReceiptUrl ? `
        <tr><td style="padding-top:10px;">
          <a href="${data.stripeReceiptUrl}" style="color:#f59e0b;font-size:13px;text-decoration:none;border-bottom:1px solid rgba(245,158,11,0.3);">${t.viewReceipt}</a>
        </td></tr>` : ''}
      </table>
      ${(() => {
        try {
          const reviewUrl = `${process.env.REVIEW_SITE_URL || 'https://lincanto.gr'}/review?token=${signReviewToken(data.bookingId)}`;
          const invite = lang === 'el'
            ? 'Μετά τη διαμονή σας, πείτε μας πώς τα περάσατε — παίρνει ένα λεπτό.'
            : 'After your stay, tell us how it went — it takes a minute.';
          const cta = lang === 'el' ? 'Αφήστε κριτική' : 'Leave a review';
          return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
        <tr><td style="background:#0f172a;border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px 20px;text-align:center;">
          <p style="color:#9ca3af;font-size:13px;margin:0 0 10px;line-height:1.6;">${invite}</p>
          <a href="${reviewUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;text-decoration:none;">${cta}</a>
        </td></tr>
      </table>`;
        } catch { return ''; }
      })()}
      <p style="color:#4b5563;font-size:12px;margin:16px 0 0;">
        ${t.questions} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectConfirm(ref, HOTEL),
      layout(lang, 'linear-gradient(135deg,#1c2a1a 0%,#14261a 100%)', header, body),
    );
  }

  // ─── 2. Booking Cancellation ──────────────────────────────────────────────
  async sendBookingCancellation(data: BookingEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];
    const ref = data.bookingId.slice(-8).toUpperCase();
    const hasRefund = data.refundAmount && data.refundAmount > 0;

    const header = `
      <h1 style="color:#f9fafb;margin:0 0 8px;font-size:22px;font-weight:700;">${t.cancelTitle}</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Ref #${ref}</p>
    `;

    const refundRow = hasRefund
      ? { label: t.refund, value: `${data.currency} ${data.refundAmount!.toFixed(2)} (${data.refundPercentage}%)` }
      : { label: t.refund, value: t.noRefund };

    const body = `
      <p style="color:#9ca3af;font-size:15px;margin:0 0 24px;">${t.dear(data.guestName)}</p>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.cancelIntro(data.cancellationReason)}</p>
      ${detailsTable([
        { label: t.property,       value: data.propertyName + (data.roomName ? ` — ${data.roomName}` : '') },
        { label: t.checkIn,        value: this.formatDate(data.checkIn, lang) },
        { label: t.checkOut,       value: this.formatDate(data.checkOut, lang) },
        { label: t.originalAmount, value: `${data.currency} ${data.totalPrice.toFixed(2)}` },
        refundRow,
      ])}
      ${hasRefund ? `<p style="color:#9ca3af;font-size:13px;margin:4px 0 0;">${t.refundNote}</p>` : ''}
      <p style="color:#4b5563;font-size:12px;margin:28px 0 0;">
        ${t.contact} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectCancel(ref, HOTEL),
      layout(lang, '#1a1218', header, body),
    );
  }

  // ─── 3. Check-in Reminder ─────────────────────────────────────────────────
  async sendCheckInReminder(data: BookingEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];

    const header = `
      <p style="color:rgba(245,158,11,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">${t.reminderEyebrow}</p>
      <h1 style="color:#f9fafb;margin:0 0 8px;font-size:22px;font-weight:700;">${t.reminderTitle}</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;">${this.formatDate(data.checkIn, lang)}</p>
    `;

    const body = `
      <p style="color:#9ca3af;font-size:15px;margin:0 0 20px;">${t.dear(data.guestName)}</p>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.reminderIntro(HOTEL)}</p>
      ${detailsTable([
        { label: t.property, value: data.propertyName + (data.roomName ? ` — ${data.roomName}` : '') },
        { label: t.checkIn,  value: this.formatDate(data.checkIn, lang), highlight: true },
        { label: t.checkOut, value: this.formatDate(data.checkOut, lang) },
        { label: t.guests,   value: String(data.guests) },
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;padding:16px 24px;margin:8px 0 24px;border-left:3px solid rgba(245,158,11,0.5);">
        <tr><td style="color:#6b7280;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;padding-bottom:6px;">${t.arrivalInfo}</td></tr>
        <tr><td style="color:#9ca3af;font-size:13px;line-height:1.7;">
          ${t.checkInTime}<br>${t.checkOutTime}
        </td></tr>
      </table>
      <p style="color:#4b5563;font-size:12px;margin:20px 0 0;">
        ${t.needHelp} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectReminder(HOTEL),
      layout(lang, 'linear-gradient(135deg,#1a1f12 0%,#161b0e 100%)', header, body),
    );
  }

  // ─── 4. Inquiry → Admin ───────────────────────────────────────────────────
  async sendInquiryNotificationToAdmin(data: InquiryEmailData): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || '';
    if (!adminEmail) return;

    // Admin email is always in English
    const t = T['en'];
    const ref = data.inquiryId.slice(-8).toUpperCase();

    const header = `
      <p style="color:rgba(245,158,11,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">${t.newInquiryEyebrow}</p>
      <h1 style="color:#f9fafb;margin:0 0 8px;font-size:22px;font-weight:700;">Inquiry #${ref}</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;">${data.propertyName}</p>
    `;

    const body = `
      ${detailsTable([
        { label: t.from,     value: data.guestName },
        { label: 'Email',    value: data.guestEmail },
        { label: t.property, value: data.propertyName },
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;padding:20px 24px;margin:4px 0;">
        <tr><td style="color:#6b7280;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;padding-bottom:10px;">${t.message}</td></tr>
        <tr><td style="color:#d1d5db;font-size:14px;line-height:1.75;border-left:2px solid rgba(245,158,11,0.4);padding-left:14px;">${data.message}</td></tr>
      </table>
      <p style="color:#4b5563;font-size:12px;margin:24px 0 0;">
        ${t.replyDirect} <a href="mailto:${data.guestEmail}">${data.guestEmail}</a>
      </p>
    `;

    await this.send(
      adminEmail,
      t.subjectInqAdmin(ref, data.guestName),
      layout('en', 'linear-gradient(135deg,#1a1a2e 0%,#16162a 100%)', header, body),
    );
  }

  // ─── 5. Inquiry → Guest confirmation ─────────────────────────────────────
  async sendInquiryConfirmationToGuest(data: InquiryEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];

    const header = `
      <p style="color:rgba(245,158,11,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">${t.receivedEyebrow}</p>
      <h1 style="color:#f9fafb;margin:0 0 8px;font-size:22px;font-weight:700;">${t.receivedTitle}</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;">${data.propertyName}</p>
    `;

    const body = `
      <p style="color:#9ca3af;font-size:15px;margin:0 0 20px;">${t.dear(data.guestName)}</p>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;line-height:1.7;">${t.receivedIntro}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <tr><td style="color:#6b7280;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;padding-bottom:10px;">${t.yourMessage}</td></tr>
        <tr><td style="color:#9ca3af;font-size:13px;line-height:1.75;font-style:italic;border-left:2px solid rgba(245,158,11,0.3);padding-left:14px;">"${data.message}"</td></tr>
      </table>
      <p style="color:#4b5563;font-size:12px;margin:0;">
        ${t.contact} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectInqGuest(HOTEL),
      layout(lang, 'linear-gradient(135deg,#1a1a2e 0%,#16162a 100%)', header, body),
    );
  }

  // ─── 6. Booking Reschedule ───────────────────────────────────────────────────
  async sendBookingRescheduleNotification(data: BookingRescheduleEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];
    const ref = data.bookingId.slice(-8).toUpperCase();

    const header = `
      <h1 style="color:#f9fafb;margin:0 0 8px;font-size:22px;font-weight:700;">${t.rescheduleTitle}</h1>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Ref #${ref}</p>
    `;

    const body = `
      <p style="color:#9ca3af;font-size:15px;margin:0 0 24px;">${t.dear(data.guestName)}</p>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.rescheduleIntro(data.reason)}</p>
      ${detailsTable([
        { label: t.property, value: data.propertyName },
        { label: t.originalDates, value: `${this.formatDate(data.originalDates.checkIn, lang)} - ${this.formatDate(data.originalDates.checkOut, lang)}` },
        { label: t.newDates, value: `${this.formatDate(data.newDates.checkIn, lang)} - ${this.formatDate(data.newDates.checkOut, lang)}` },
        { label: t.total, value: `EUR ${data.totalPrice.toFixed(2)}`, highlight: true },
      ])}
      <p style="color:#4b5563;font-size:12px;margin:28px 0 0;">
        ${t.questions} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectReschedule(ref, HOTEL),
      layout(lang, '#1a2912', header, body),
    );
  }
}
