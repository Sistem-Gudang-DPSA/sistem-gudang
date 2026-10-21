// Short beeps from a Web Audio oscillator: one high beep for a good scan, two low ones for a failed scan.
// The AudioContext only runs after a user gesture; a scan typed into a focused input counts.
let ctx: AudioContext | null = null;

function tone(freq: number, startMs: number, durMs = 100) {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    const t = ctx.currentTime + startMs / 1000;
    osc.start(t);
    osc.stop(t + durMs / 1000);
  } catch {
    // no audio support or blocked; the visual cue is enough
  }
}

export const beepOk = () => tone(880, 0);
export const beepFail = () => { tone(220, 0); tone(220, 180); };
