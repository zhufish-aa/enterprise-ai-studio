/** Schedules chart requests; waiting charts are accepted without a preset queue length. */
export class PreviewQueryQueue {
  private readonly tasks = new Map<
    string,
    { abort: AbortController; run: (signal: AbortSignal) => Promise<void>; started: boolean }
  >();
  private running = 0;
  private closed = false;
  constructor(
    private readonly concurrency = 2,
    private readonly capacity = Infinity,
  ) {}
  has(id: string) {
    return this.tasks.has(id);
  }
  pendingIds() {
    return this.tasks.keys();
  }
  enqueue(id: string, run: (signal: AbortSignal) => Promise<void>): boolean {
    if (this.closed || this.tasks.has(id) || this.tasks.size >= this.capacity) return false;
    this.tasks.set(id, { abort: new AbortController(), run, started: false });
    this.drain();
    return true;
  }
  cancel(id: string) {
    const task = this.tasks.get(id);
    if (!task) return;
    task.abort.abort();
    if (!task.started) {
      this.tasks.delete(id);
      this.drain();
    }
  }
  close() {
    this.closed = true;
    for (const id of this.tasks.keys()) this.cancel(id);
  }
  private drain() {
    if (this.closed) return;
    for (const [id, task] of this.tasks) {
      if (this.running >= this.concurrency) break;
      if (task.started) continue;
      task.started = true;
      this.running++;
      void Promise.resolve()
        .then(() => task.run(task.abort.signal))
        .catch(() => {})
        .finally(() => {
          this.tasks.delete(id);
          this.running--;
          this.drain();
        });
    }
  }
}
