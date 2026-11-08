import * as jwt from 'jsonwebtoken';

// Review-link tokens: signed with the API's JWT secret, self-contained, no
// DB row needed. Carries only the booking id and a purpose tag so a leaked
// token can submit exactly one thing -- the review for that booking -- and
// nothing else. 90d covers long stays booked far ahead plus the post-stay
// window the email asks for feedback in.
export const REVIEW_TOKEN_PURPOSE = 'booking-review';
const REVIEW_TOKEN_TTL = '90d';

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signReviewToken(bookingId: string): string {
  return jwt.sign({ bookingId, purpose: REVIEW_TOKEN_PURPOSE }, secret(), {
    expiresIn: REVIEW_TOKEN_TTL,
  });
}

// Returns the booking id, or null for a bad/expired/wrong-purpose token.
export function verifyReviewToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, secret()) as jwt.JwtPayload;
    if (payload?.purpose !== REVIEW_TOKEN_PURPOSE || typeof payload.bookingId !== 'string') {
      return null;
    }
    return payload.bookingId;
  } catch {
    return null;
  }
}
