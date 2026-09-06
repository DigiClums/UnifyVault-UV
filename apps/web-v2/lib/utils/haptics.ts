export function triggerHapticNotification(
  type: 'success' | 'warning' | 'error' | 'light' = 'light',
) {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate([40, 60, 80]);
      } else if (type === 'warning' || type === 'error') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(25);
      }
    }
  } catch (e) {
    // Ignore unsupported devices
  }
}

export function playAlertChime() {
  if (typeof window === 'undefined') return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // AudioContext blocked before interaction
  }
}
