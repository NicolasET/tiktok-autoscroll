import type { AutoscrollMode } from '../autoscroll/status';

export interface FloatingButtonView {
  readonly visible: boolean;
  readonly mode: AutoscrollMode;
  readonly watchedCount: number;
}

interface ModePresentation {
  readonly label: string;
  readonly className: string | null;
  readonly title: string;
}

const DEFAULT_TITLE = 'Autoscroll for TikTok (Alt+Shift+S)';

const PRESENTATION: Readonly<Record<AutoscrollMode, ModePresentation>> = {
  off: { label: 'Auto off', className: null, title: DEFAULT_TITLE },
  on: { label: 'Auto on', className: 'tas-on', title: DEFAULT_TITLE },
  waiting: { label: 'En espera', className: 'tas-wait', title: DEFAULT_TITLE },
};

const STATE_CLASSES = Object.values(PRESENTATION).flatMap((p) =>
  p.className ? [p.className] : [],
);

interface Parts {
  readonly button: HTMLButtonElement;
  readonly label: HTMLSpanElement;
  readonly count: HTMLSpanElement;
}

/** The in-page pill that shows the current mode and toggles autoscroll on click. */
export class FloatingButton {
  private parts: Parts | null = null;

  constructor(
    private readonly doc: Document,
    private readonly onToggle: () => void,
  ) {}

  render(view: FloatingButtonView): void {
    if (!view.visible) {
      if (this.parts) this.parts.button.hidden = true;
      return;
    }
    const { button, label, count } = this.ensureParts();
    const presentation = PRESENTATION[view.mode];
    button.hidden = false;
    button.title = presentation.title;
    button.setAttribute('aria-pressed', String(view.mode !== 'off'));
    button.classList.remove(...STATE_CLASSES);
    if (presentation.className) button.classList.add(presentation.className);
    label.textContent = presentation.label;
    count.textContent = String(view.watchedCount);
  }

  private ensureParts(): Parts {
    if (this.parts?.button.isConnected) return this.parts;

    const button = this.doc.createElement('button');
    button.id = 'tas-fab';
    button.type = 'button';
    button.setAttribute('aria-label', 'Autoscroll');
    const dot = this.span('tas-dot');
    const label = this.span('tas-label');
    const count = this.span('tas-count');
    button.append(dot, label, count);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onToggle();
    });
    this.doc.body.append(button);

    this.parts = { button, label, count };
    return this.parts;
  }

  private span(className: string): HTMLSpanElement {
    const span = this.doc.createElement('span');
    span.className = className;
    return span;
  }
}
