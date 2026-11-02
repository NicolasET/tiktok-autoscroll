export type Logger = (message: string, ...details: unknown[]) => void;

export function createDebugLogger(isEnabled: () => boolean): Logger {
  return (message, ...details) => {
    if (isEnabled()) console.info('[Autoscroll for TikTok]', message, ...details);
  };
}
