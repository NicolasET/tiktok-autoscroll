import type { FeedDom, FeedItem } from '../tiktok/feedDom';

export type FinishReason = 'ended' | 'loop';

export interface PlaybackListener {
  onFinished(item: FeedItem, reason: FinishReason): void;
  onPlay(): void;
}

/** Turns the feed's <video> events into "this item finished" / "something started playing". */
export class PlaybackEvents {
  private readonly lastTimes = new WeakMap<HTMLVideoElement, number>();

  constructor(
    private readonly doc: Document,
    private readonly feed: FeedDom,
  ) {}

  /** Media events don't bubble, so they are captured at the document. Returns a stop function. */
  start(listener: PlaybackListener): () => void {
    const abort = new AbortController();
    const options = { capture: true, signal: abort.signal };

    this.doc.addEventListener(
      'ended',
      (event) => {
        const item = this.itemOfVideo(event.target);
        if (item) listener.onFinished(item, 'ended');
      },
      options,
    );
    this.doc.addEventListener(
      'timeupdate',
      (event) => {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement) || !this.wrappedAround(video)) return;
        const item = this.feed.itemOf(video);
        if (item) listener.onFinished(item, 'loop');
      },
      options,
    );
    this.doc.addEventListener(
      'play',
      () => {
        listener.onPlay();
      },
      options,
    );
    return () => {
      abort.abort();
    };
  }

  private itemOfVideo(target: EventTarget | null): FeedItem | null {
    return target instanceof HTMLVideoElement ? this.feed.itemOf(target) : null;
  }

  /** Natively looping videos never fire "ended": detect the jump back to the start instead. */
  private wrappedAround(video: HTMLVideoElement): boolean {
    const previous = this.lastTimes.get(video) ?? 0;
    this.lastTimes.set(video, video.currentTime);
    return (
      video.loop && video.duration > 0 && previous > video.duration - 1 && video.currentTime < 1
    );
  }
}
