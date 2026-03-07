import JobQueue from './JobQueue';

const createQueue = (name, options) => {
  const queue = new JobQueue({ name, ...options });
  return queue;
};

export const mailQueue =
  global.__mailQueue ||
  createQueue('mail', { concurrency: 2, retries: 3, retryDelay: 2000 });

export const auditQueue =
  global.__auditQueue ||
  createQueue('audit', { concurrency: 3, retries: 1, retryDelay: 1000 });

export const bookingQueue =
  global.__bookingQueue ||
  createQueue('booking', { concurrency: 2, retries: 2, retryDelay: 1500 });

if (process.env.NODE_ENV !== 'production') {
  global.__mailQueue = mailQueue;
  global.__auditQueue = auditQueue;
  global.__bookingQueue = bookingQueue;
}
