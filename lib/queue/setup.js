import { mailQueue, auditQueue, bookingQueue } from '@lib/queue';
import {
  handleRecoverPassword,
  handleNotificationAssign,
} from '@lib/queue/handlers/mailHandler';
import { handleAuditLog } from '@lib/queue/handlers/auditHandler';
import {
  handleBookingConfirmation,
  handleBookingCancellation,
} from '@lib/queue/handlers/bookingHandler';

let initialized = false;

export const setupQueues = () => {
  if (initialized) return;

  // Mail handlers
  mailQueue.register('recoverPassword', handleRecoverPassword);
  mailQueue.register('notificationAssign', handleNotificationAssign);

  // Audit handlers
  auditQueue.register('createLog', handleAuditLog);

  // Booking handlers
  bookingQueue.register('confirmBooking', handleBookingConfirmation);
  bookingQueue.register('cancelBooking', handleBookingCancellation);

  initialized = true;
};
