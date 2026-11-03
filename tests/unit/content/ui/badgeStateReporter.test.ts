import { describe, expect, it, vi } from 'vitest';
import { BadgeStateReporter } from '../../../../src/content/ui/badgeStateReporter';
import { badgeStateMessage } from '../../../../src/shared/messages';

describe('BadgeStateReporter', () => {
  it('reports each badge state once', () => {
    const send = vi.fn(() => Promise.resolve());
    const reporter = new BadgeStateReporter(send);
    reporter.report('on');
    reporter.report('waiting');
    reporter.report('on');
    reporter.report('native');
    expect(send.mock.calls).toEqual([[badgeStateMessage('on')], [badgeStateMessage('native')]]);
  });

  it('retries after a failed send', async () => {
    const send = vi.fn(() => Promise.reject(new Error('no receiver')));
    const reporter = new BadgeStateReporter(send);
    reporter.report('off');
    await Promise.resolve();
    reporter.report('off');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('survives an invalidated extension context', () => {
    const send = vi.fn((): Promise<unknown> => {
      throw new Error('Extension context invalidated.');
    });
    const reporter = new BadgeStateReporter(send);
    expect(() => {
      reporter.report('on');
    }).not.toThrow();
    reporter.report('on');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
