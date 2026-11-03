/** Counts each item once, after it stayed on screen long enough. Skipped items never count. */
export class WatchCounter {
  private readonly counted = new Set<string>();
  private readonly excluded = new Set<string>();

  constructor(
    private readonly thresholdMs: number,
    private readonly onWatched: () => void,
  ) {}

  exclude(itemId: string): void {
    this.excluded.add(itemId);
  }

  observe(itemId: string, activeForMs: number): void {
    if (activeForMs < this.thresholdMs || this.counted.has(itemId) || this.excluded.has(itemId)) {
      return;
    }
    this.counted.add(itemId);
    this.onWatched();
  }
}
