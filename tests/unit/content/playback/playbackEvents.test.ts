import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  PlaybackEvents,
  type PlaybackListener,
} from '../../../../src/content/playback/playbackEvents';
import { FeedDom } from '../../../../src/content/tiktok/feedDom';
import { cinemaFeed, makePosts } from '../../../fixtures/tiktokDom';
import { cardAt, mount, videoAt } from '../../helpers';

function setPlayback(video: HTMLVideoElement, currentTime: number, duration = 10): void {
  Object.defineProperty(video, 'currentTime', { configurable: true, value: currentTime });
  Object.defineProperty(video, 'duration', { configurable: true, value: duration });
}

describe('PlaybackEvents', () => {
  let listener: {
    onFinished: Mock<PlaybackListener['onFinished']>;
    onPlay: Mock<PlaybackListener['onPlay']>;
  };
  let stop: () => void;

  beforeEach(() => {
    mount(cinemaFeed(makePosts('video', 'video')));
    listener = { onFinished: vi.fn(), onPlay: vi.fn() };
    stop = new PlaybackEvents(document, new FeedDom(document)).start(listener);
  });

  afterEach(() => {
    stop();
  });

  it('reports the item whose video ended', () => {
    videoAt(1).dispatchEvent(new Event('ended'));
    expect(listener.onFinished).toHaveBeenCalledWith(
      expect.objectContaining({ element: cardAt(1) }),
      'ended',
    );
  });

  it('ignores videos outside the feed', () => {
    const stray = document.createElement('video');
    document.body.append(stray);
    stray.dispatchEvent(new Event('ended'));
    expect(listener.onFinished).not.toHaveBeenCalled();
  });

  it('detects natively looping videos jumping back to the start', () => {
    const video = videoAt(0);
    video.loop = true;
    setPlayback(video, 9.5);
    video.dispatchEvent(new Event('timeupdate'));
    expect(listener.onFinished).not.toHaveBeenCalled();
    setPlayback(video, 0.2);
    video.dispatchEvent(new Event('timeupdate'));
    expect(listener.onFinished).toHaveBeenCalledWith(
      expect.objectContaining({ element: cardAt(0) }),
      'loop',
    );
  });

  it('ignores seeks back on videos that do not loop', () => {
    const video = videoAt(0);
    setPlayback(video, 9.5);
    video.dispatchEvent(new Event('timeupdate'));
    setPlayback(video, 0.2);
    video.dispatchEvent(new Event('timeupdate'));
    expect(listener.onFinished).not.toHaveBeenCalled();
  });

  it('forwards play events', () => {
    videoAt(0).dispatchEvent(new Event('play'));
    expect(listener.onPlay).toHaveBeenCalledOnce();
  });

  it('stops listening', () => {
    stop();
    videoAt(0).dispatchEvent(new Event('ended'));
    expect(listener.onFinished).not.toHaveBeenCalled();
  });
});
