import { describe, expect, it, vi } from 'vitest';
import { BadgePresenter } from '../../../src/background/badgePresenter';

function fakeAction() {
  return {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
    setBadgeTextColor: vi.fn(() => Promise.resolve()),
    setTitle: vi.fn(() => Promise.resolve()),
  };
}

describe('BadgePresenter', () => {
  it('shows ON globally while autoscroll is enabled', async () => {
    const action = fakeAction();
    const badge = new BadgePresenter(action);
    await badge.showGlobal(true);
    expect(action.setBadgeText).toHaveBeenCalledWith({ text: 'ON' });
    await badge.showGlobal(false);
    expect(action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });

  it("marks a tab where TikTok's autoscroll took over", async () => {
    const action = fakeAction();
    await new BadgePresenter(action).showForTab(42, 'native');
    expect(action.setBadgeText).toHaveBeenCalledWith({ tabId: 42, text: 'TT' });
    expect(action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 42, color: '#25f4ee' });
    expect(action.setTitle).toHaveBeenCalledWith(
      expect.objectContaining({ tabId: 42, title: expect.stringMatching(/en pausa/) as unknown }),
    );
  });
});
