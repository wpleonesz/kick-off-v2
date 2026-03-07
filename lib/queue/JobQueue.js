class JobQueue {
  /**
   * Lightweight in-memory job queue with concurrency control and retries
   * @param {Object} options
   * @param {string} options.name Queue name for logging
   * @param {number} options.concurrency Max concurrent jobs (default: 1)
   * @param {number} options.retries Max retry attempts (default: 0)
   * @param {number} options.retryDelay Base delay in ms for exponential backoff (default: 1000)
   */
  constructor({ name, concurrency = 1, retries = 0, retryDelay = 1000 }) {
    this.name = name;
    this.concurrency = concurrency;
    this.retries = retries;
    this.retryDelay = retryDelay;
    this.handlers = new Map();
    this.queue = [];
    this.running = 0;
    this.stats = { processed: 0, failed: 0, pending: 0 };
  }

  /** Register a handler for a job type */
  register = (jobType, handler) => {
    this.handlers.set(jobType, handler);
  };

  /** Add a job to the queue */
  add = (jobType, data, options = {}) => {
    const job = {
      type: jobType,
      data,
      retries: options.retries ?? this.retries,
      retryDelay: options.retryDelay ?? this.retryDelay,
      attempt: 0,
    };
    this.queue.push(job);
    this.stats.pending++;
    this.#process();
  };

  /** Get queue statistics */
  getStats = () => ({
    name: this.name,
    running: this.running,
    ...this.stats,
  });

  #process = () => {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      this.running++;
      this.stats.pending--;
      this.#execute(job);
    }
  };

  #execute = async (job) => {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.error(`[${this.name}] No handler for job type: ${job.type}`);
      this.running--;
      this.stats.failed++;
      this.#process();
      return;
    }
    try {
      await handler(job.data);
      this.stats.processed++;
    } catch (error) {
      job.attempt++;
      if (job.attempt <= job.retries) {
        const delay = job.retryDelay * Math.pow(2, job.attempt - 1);
        console.warn(
          `[${this.name}] Job ${job.type} failed (attempt ${job.attempt}/${job.retries}), retrying in ${delay}ms:`,
          error.message,
        );
        setTimeout(() => {
          this.queue.push(job);
          this.stats.pending++;
          this.#process();
        }, delay);
      } else {
        console.error(
          `[${this.name}] Job ${job.type} failed permanently after ${job.attempt} attempts:`,
          error.message,
        );
        this.stats.failed++;
      }
    } finally {
      this.running--;
      this.#process();
    }
  };
}

export default JobQueue;
