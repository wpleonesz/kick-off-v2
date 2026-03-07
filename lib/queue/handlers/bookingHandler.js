import prisma from '@database/client';
import { invalidateCache } from '@lib/cache/cacheManager';

export const handleBookingConfirmation = async (data) => {
  const { bookingId } = data;
  await prisma.bookings.update({
    where: { id: bookingId },
    data: { status: 'confirmed' },
  });
  await invalidateCache('bookings:*');
};

export const handleBookingCancellation = async (data) => {
  const { bookingId } = data;
  await prisma.bookings.update({
    where: { id: bookingId },
    data: { status: 'cancelled' },
  });
  await invalidateCache('bookings:*');
};
