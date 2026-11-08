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
    dear:              (name: string) => `Dear <strong style="color:#0f172a;">${name}</strong>,`,
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
    confirmIntro:      (hotel: string) => `Your booking is confirmed. We look forward to welcoming you to <strong style="color:#c65d00;">${hotel}</strong>.`,
    arrivalTime:       'Arrival: <strong style="color:#0f172a;">3:00 PM – 11:00 PM</strong> &nbsp;·&nbsp; Departure: <strong style="color:#0f172a;">by 11:00 AM</strong>',
    viewReceipt:       'View official receipt →',
    // Cancellation
    cancelTitle:       'Booking Cancelled',
    cancelIntro:       (reason?: string) => `Your booking has been cancelled.${reason ? ` <span style="color:#78716c;">Reason: ${reason}</span>` : ''}`,
    originalAmount:    'Original amount',
    refund:            'Refund',
    noRefund:          'No refund',
    refundNote:        'The refund will appear on your account within <strong style="color:#0f172a;">5–10 business days</strong>.',
    // Reminder
    reminderEyebrow:   'Arrival reminder',
    reminderTitle:     'Check-in tomorrow!',
    reminderIntro:     (hotel: string) => `Reminder: tomorrow is your arrival day at <strong style="color:#c65d00;">${hotel}</strong>. We can't wait to see you!`,
    arrivalInfo:       'Arrival info',
    checkInTime:       'Check-in: <strong style="color:#0f172a;">3:00 PM – 11:00 PM</strong>',
    checkOutTime:      'Check-out: <strong style="color:#0f172a;">by 11:00 AM</strong>',
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
    rescheduleIntro: (reason?: string) => `Your booking has been rescheduled.${reason ? ` <span style="color:#78716c;">Reason: ${reason}</span>` : ''}`,
    originalDates: 'Original dates',
    newDates: 'New dates',
  },
  el: {
    dear:              (name: string) => `Αγαπητέ/ή <strong style="color:#0f172a;">${name}</strong>,`,
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
    confirmIntro:      (hotel: string) => `Η κράτησή σας επιβεβαιώθηκε. Ανυπομονούμε να σας υποδεχτούμε στο <strong style="color:#c65d00;">${hotel}</strong>.`,
    arrivalTime:       'Ώρα άφιξης: <strong style="color:#0f172a;">15:00 – 23:00</strong> &nbsp;·&nbsp; Αναχώρηση: <strong style="color:#0f172a;">έως 11:00</strong>',
    viewReceipt:       'Προβολή επίσημης απόδειξης →',
    // Cancellation
    cancelTitle:       'Ακύρωση Κράτησης',
    cancelIntro:       (reason?: string) => `Η κράτησή σας ακυρώθηκε.${reason ? ` <span style="color:#78716c;">Λόγος: ${reason}</span>` : ''}`,
    originalAmount:    'Αρχικό ποσό',
    refund:            'Επιστροφή χρημάτων',
    noRefund:          'Χωρίς επιστροφή',
    refundNote:        'Η επιστροφή θα εμφανιστεί στον λογαριασμό σας εντός <strong style="color:#0f172a;">5–10 εργάσιμων ημερών</strong>.',
    // Reminder
    reminderEyebrow:   'Υπενθύμιση άφιξης',
    reminderTitle:     'Check-in αύριο!',
    reminderIntro:     (hotel: string) => `Σας υπενθυμίζουμε ότι αύριο είναι η ημέρα άφιξής σας στο <strong style="color:#c65d00;">${hotel}</strong>. Σας περιμένουμε!`,
    arrivalInfo:       'Πληροφορίες άφιξης',
    checkInTime:       'Ώρα check-in: <strong style="color:#0f172a;">15:00 – 23:00</strong>',
    checkOutTime:      'Ώρα check-out: <strong style="color:#0f172a;">έως 11:00</strong>',
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
    rescheduleIntro: (reason?: string) => `Η κράτησή σας έχει αλλάξει.${reason ? ` <span style="color:#78716c;">Λόγος: ${reason}</span>` : ''}`,
    originalDates: 'Αρχικές ημερομηνίες',
    newDates: 'Νέες ημερομηνίες',
  },
} as const;

// ─── Shared design tokens ─────────────────────────────────────────────────────
const LOGO_URL  = 'https://lincanto.gr/incanto-wordmark.png';
const SITE_URL  = 'https://lincanto.gr';
const HOTEL     = "L'Incanto Apartments";
const EMAIL     = 'lincantobook@gmail.com';

const BASE_STYLES = `
  body { margin:0; padding:0; background:#101827; font-family:Inter,'Helvetica Neue',Arial,sans-serif; }
  a { color:#c65d00; text-decoration:underline; }
  table { border-spacing:0; }
  @media only screen and (max-width:600px) {
    .outer { padding:16px 8px !important; }
    .email-pad { padding:28px 22px !important; }
    .body-pad { padding-top:0 !important; }
    .brand-location { display:none !important; }
    .detail-label,.detail-value { display:block !important; width:auto !important; text-align:left !important; }
    .detail-label { padding:14px 0 4px !important; border-bottom:0 !important; }
    .detail-value { padding:0 0 14px !important; }
    h1 { font-size:28px !important; }
  }
`;

function layout(lang: EmailLang, _headerAccent: string, headerContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${HOTEL}</title><style>${BASE_STYLES}</style></head>
<body style="margin:0;padding:0;background:#101827;font-family:Inter,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="outer" style="background:#101827;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td class="email-pad" style="background:#000000;border-radius:16px 16px 0 0;padding:28px 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${SITE_URL}" style="text-decoration:none;"><img src="${LOGO_URL}" alt="L’Incanto Apartments" width="158" style="display:block;width:158px;max-width:100%;height:auto;"></a>
      <p style="margin:8px 0 0;font-size:9px;letter-spacing:2px;color:#94a3b8;">BY SM HOLDINGS</p></td>
      <td class="brand-location" align="right" style="color:#94a3b8;font-size:11px;line-height:1.8;letter-spacing:1px;">PREVEZA<br>GREECE</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#000000;"><img src="${SITE_URL}/images/exterior/lincanto-exterior-preveza-41.jpg" alt="L’Incanto Apartments in Preveza" width="600" height="180" style="display:block;width:100%;max-width:600px;height:180px;object-fit:cover;"></td></tr>
  <tr><td class="email-pad" style="background:#ffffff;padding:32px 36px 24px;border-top:4px solid #ff9900;">${headerContent}</td></tr>
  <tr><td class="email-pad body-pad" style="background:#ffffff;padding:0 36px 32px;border-radius:0 0 16px 16px;">${bodyContent}</td></tr>
  <tr><td style="padding:28px 20px;text-align:center;">
    <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 8px;">${HOTEL}</p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.9;margin:0;">Chroneika · Preveza, Greece<br>
    <a href="mailto:${EMAIL}" style="color:#cbd5e1;">${EMAIL}</a> &nbsp;·&nbsp; <a href="${SITE_URL}" style="color:#ffb547;">lincanto.gr</a></p>
    <p style="color:#94a3b8;font-size:10px;margin:16px 0 0;">&copy; ${new Date().getFullYear()} SM Holdings · All rights reserved.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function detailsTable(rows: { label: string; value: string; highlight?: boolean }[]): string {
  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td class="detail-label" width="32%" style="color:#64748b;padding:14px 0;font-size:12px;line-height:1.6;${i < rows.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}">${r.label}</td>
      <td class="detail-value" style="overflow-wrap:anywhere;line-height:1.6;color:${r.highlight ? '#c65d00' : '#0f172a'};font-size:${r.highlight ? '24px' : '14px'};font-weight:${r.highlight ? '700' : '500'};text-align:right;padding:14px 0;${i < rows.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}">${r.value}</td>
    </tr>`).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:0;margin:24px 0;">
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
      <p style="margin:0 0 14px;color:#15803d;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">&#10003; ${lang === 'el' ? 'Επιβεβαίωση κράτησης' : 'Reservation confirmed'}</p>
      <h1 style="color:#0f172a;margin:0 0 8px;font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;">${t.confirmTitle}</h1>
      <p style="color:rgba(28,25,23,0.55);margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Ref #${ref}</p>
    `;

    const body = `
      <p style="color:#475569;font-size:15px;margin:0 0 24px;">${t.dear(data.guestName)}</p>
      <p style="color:#475569;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.confirmIntro(HOTEL)}</p>
      ${detailsTable([
        { label: t.property,  value: data.propertyName + (data.roomName ? ` — ${data.roomName}` : '') },
        { label: t.checkIn,   value: this.formatDate(data.checkIn, lang) },
        { label: t.checkOut,  value: this.formatDate(data.checkOut, lang) },
        { label: lang === 'el' ? 'Διάρκεια' : 'Duration', value: t.duration(nights) },
        { label: t.guests,    value: String(data.guests) },
        { label: t.total,     value: `${data.currency} ${data.totalPrice.toFixed(2)}`, highlight: true },
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:16px 24px;margin:8px 0 16px;border:1px solid rgba(180,83,9,0.2);">
        <tr><td style="color:#475569;font-size:13px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">${t.arrivalTime}</td></tr>
        ${data.stripeReceiptUrl ? `
        <tr><td style="padding-top:10px;">
          <a href="${data.stripeReceiptUrl}" style="color:#c65d00;font-size:13px;text-decoration:none;border-bottom:1px solid rgba(180,83,9,0.3);">${t.viewReceipt}</a>
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
        <tr><td style="background:#f8fafc;border:1px solid rgba(180,83,9,0.2);border-radius:10px;padding:14px 20px;text-align:center;">
          <p style="color:#475569;font-size:13px;margin:0 0 10px;line-height:1.6;">${invite}</p>
          <a href="${reviewUrl}" style="display:inline-block;background:#ea7600;color:#ffffff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;text-decoration:none;">${cta}</a>
        </td></tr>
      </table>`;
        } catch { return ''; }
      })()}
      <p style="color:#78716c;font-size:12px;margin:16px 0 0;">
        ${t.questions} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectConfirm(ref, HOTEL),
      layout(lang, '#e7f1e8', header, body),
    );
  }

  // ─── 2. Booking Cancellation ──────────────────────────────────────────────
  async sendBookingCancellation(data: BookingEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];
    const ref = data.bookingId.slice(-8).toUpperCase();
    const hasRefund = data.refundAmount && data.refundAmount > 0;

    const header = `
      <h1 style="color:#0f172a;margin:0 0 8px;font-size:32px;font-weight:700;line-height:1.2;">${t.cancelTitle}</h1>
      <p style="color:rgba(28,25,23,0.55);margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Ref #${ref}</p>
    `;

    const refundRow = hasRefund
      ? { label: t.refund, value: `${data.currency} ${data.refundAmount!.toFixed(2)} (${data.refundPercentage}%)` }
      : { label: t.refund, value: t.noRefund };

    const body = `
      <p style="color:#475569;font-size:15px;margin:0 0 24px;">${t.dear(data.guestName)}</p>
      <p style="color:#475569;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.cancelIntro(data.cancellationReason)}</p>
      ${detailsTable([
        { label: t.property,       value: data.propertyName + (data.roomName ? ` — ${data.roomName}` : '') },
        { label: t.checkIn,        value: this.formatDate(data.checkIn, lang) },
        { label: t.checkOut,       value: this.formatDate(data.checkOut, lang) },
        { label: t.originalAmount, value: `${data.currency} ${data.totalPrice.toFixed(2)}` },
        refundRow,
      ])}
      ${hasRefund ? `<p style="color:#475569;font-size:13px;margin:4px 0 0;">${t.refundNote}</p>` : ''}
      <p style="color:#78716c;font-size:12px;margin:28px 0 0;">
        ${t.contact} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectCancel(ref, HOTEL),
      layout(lang, '#f7eaea', header, body),
    );
  }

  // ─── 3. Check-in Reminder ─────────────────────────────────────────────────
  async sendCheckInReminder(data: BookingEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];

    const header = `
      <p style="color:rgba(180,83,9,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">${t.reminderEyebrow}</p>
      <h1 style="color:#0f172a;margin:0 0 8px;font-size:32px;font-weight:700;line-height:1.2;">${t.reminderTitle}</h1>
      <p style="color:rgba(28,25,23,0.55);margin:0;font-size:13px;">${this.formatDate(data.checkIn, lang)}</p>
    `;

    const body = `
      <p style="color:#475569;font-size:15px;margin:0 0 20px;">${t.dear(data.guestName)}</p>
      <p style="color:#475569;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.reminderIntro(HOTEL)}</p>
      ${detailsTable([
        { label: t.property, value: data.propertyName + (data.roomName ? ` — ${data.roomName}` : '') },
        { label: t.checkIn,  value: this.formatDate(data.checkIn, lang), highlight: true },
        { label: t.checkOut, value: this.formatDate(data.checkOut, lang) },
        { label: t.guests,   value: String(data.guests) },
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:16px 24px;margin:8px 0 24px;border-left:3px solid rgba(180,83,9,0.5);">
        <tr><td style="color:#78716c;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;padding-bottom:6px;">${t.arrivalInfo}</td></tr>
        <tr><td style="color:#475569;font-size:13px;line-height:1.7;">
          ${t.checkInTime}<br>${t.checkOutTime}
        </td></tr>
      </table>
      <p style="color:#78716c;font-size:12px;margin:20px 0 0;">
        ${t.needHelp} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectReminder(HOTEL),
      layout(lang, '#fdf3e3', header, body),
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
      <p style="color:rgba(180,83,9,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">${t.newInquiryEyebrow}</p>
      <h1 style="color:#0f172a;margin:0 0 8px;font-size:32px;font-weight:700;line-height:1.2;">Inquiry #${ref}</h1>
      <p style="color:rgba(28,25,23,0.55);margin:0;font-size:13px;">${data.propertyName}</p>
    `;

    const body = `
      ${detailsTable([
        { label: t.from,     value: data.guestName },
        { label: 'Email',    value: data.guestEmail },
        { label: t.property, value: data.propertyName },
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin:4px 0;">
        <tr><td style="color:#78716c;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;padding-bottom:10px;">${t.message}</td></tr>
        <tr><td style="color:#44403c;font-size:14px;line-height:1.75;border-left:2px solid rgba(180,83,9,0.4);padding-left:14px;">${data.message}</td></tr>
      </table>
      <p style="color:#78716c;font-size:12px;margin:24px 0 0;">
        ${t.replyDirect} <a href="mailto:${data.guestEmail}">${data.guestEmail}</a>
      </p>
    `;

    await this.send(
      adminEmail,
      t.subjectInqAdmin(ref, data.guestName),
      layout('en', '#eef1f6', header, body),
    );
  }

  // ─── 5. Inquiry → Guest confirmation ─────────────────────────────────────
  async sendInquiryConfirmationToGuest(data: InquiryEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];

    const header = `
      <p style="color:rgba(180,83,9,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">${t.receivedEyebrow}</p>
      <h1 style="color:#0f172a;margin:0 0 8px;font-size:32px;font-weight:700;line-height:1.2;">${t.receivedTitle}</h1>
      <p style="color:rgba(28,25,23,0.55);margin:0;font-size:13px;">${data.propertyName}</p>
    `;

    const body = `
      <p style="color:#475569;font-size:15px;margin:0 0 20px;">${t.dear(data.guestName)}</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.7;">${t.receivedIntro}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <tr><td style="color:#78716c;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;padding-bottom:10px;">${t.yourMessage}</td></tr>
        <tr><td style="color:#475569;font-size:13px;line-height:1.75;font-style:italic;border-left:2px solid rgba(180,83,9,0.3);padding-left:14px;">"${data.message}"</td></tr>
      </table>
      <p style="color:#78716c;font-size:12px;margin:0;">
        ${t.contact} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectInqGuest(HOTEL),
      layout(lang, '#eef1f6', header, body),
    );
  }

  // ─── 6. Booking Reschedule ───────────────────────────────────────────────────
  async sendBookingRescheduleNotification(data: BookingRescheduleEmailData): Promise<void> {
    const lang = data.lang ?? 'en';
    const t = T[lang];
    const ref = data.bookingId.slice(-8).toUpperCase();

    const header = `
      <h1 style="color:#0f172a;margin:0 0 8px;font-size:32px;font-weight:700;line-height:1.2;">${t.rescheduleTitle}</h1>
      <p style="color:rgba(28,25,23,0.55);margin:0;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Ref #${ref}</p>
    `;

    const body = `
      <p style="color:#475569;font-size:15px;margin:0 0 24px;">${t.dear(data.guestName)}</p>
      <p style="color:#475569;font-size:14px;margin:0 0 8px;line-height:1.7;">${t.rescheduleIntro(data.reason)}</p>
      ${detailsTable([
        { label: t.property, value: data.propertyName },
        { label: t.originalDates, value: `${this.formatDate(data.originalDates.checkIn, lang)} - ${this.formatDate(data.originalDates.checkOut, lang)}` },
        { label: t.newDates, value: `${this.formatDate(data.newDates.checkIn, lang)} - ${this.formatDate(data.newDates.checkOut, lang)}` },
        { label: t.total, value: `EUR ${data.totalPrice.toFixed(2)}`, highlight: true },
      ])}
      <p style="color:#78716c;font-size:12px;margin:28px 0 0;">
        ${t.questions} <a href="mailto:${EMAIL}">${EMAIL}</a>
      </p>
    `;

    await this.send(
      data.guestEmail,
      t.subjectReschedule(ref, HOTEL),
      layout(lang, '#edf2ea', header, body),
    );
  }
}
