import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EmailService, BookingEmailData } from '../src/email/email.service';

// Render the actual service templates without SMTP or a database write.
async function main() {
  const output = resolve(process.argv[2] || 'reports/email-preview');
  await mkdir(output, { recursive: true });
  const service = new EmailService();
  let filename = '';
  (service as any).send = async (_to: string, _subject: string, html: string) => {
    await writeFile(resolve(output, filename), html);
  };
  for (const lang of ['en', 'el'] as const) {
    const data: BookingEmailData = {
      guestName: 'Konstantinos', guestEmail: 'preview@example.com',
      bookingId: 'email-preview-TEST2026', propertyName: "L'Incanto Apartments",
      roomName: 'Apartment 01 — Ground Level', checkIn: new Date('2027-06-12T12:00:00Z'),
      checkOut: new Date('2027-06-16T08:00:00Z'), guests: 2, totalPrice: 360,
      currency: 'EUR', lang, refundAmount: 180, refundPercentage: 50,
    };
    for (const [name, render] of [
      ['confirmation', () => service.sendBookingConfirmation(data)],
      ['cancellation', () => service.sendBookingCancellation(data)],
      ['reminder', () => service.sendCheckInReminder(data)],
      ['reschedule', () => service.sendBookingRescheduleNotification({ ...data,
        originalDates: { checkIn: data.checkIn, checkOut: data.checkOut },
        newDates: { checkIn: new Date('2027-06-19'), checkOut: new Date('2027-06-23') },
      })],
      ['inquiry', () => service.sendInquiryConfirmationToGuest({ ...data,
        inquiryId: 'preview-inquiry', message: 'Could we arrange a late arrival?',
      })],
    ] as const) {
      filename = `${name}-${lang}.html`;
      await render();
    }
  }
  console.log(`Email previews: ${output}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
