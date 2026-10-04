export type VocalMode = 'classic' | 'adaptive' | 'hq';

/**
 * KarOK-inspired Mid/Side vocal remover (browser Web Audio).
 * classic: center cancel (L-R)
 * adaptive / hq: Mid attenuation + band-cancel + Side boost
 */
export class VocalRemover {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private media: HTMLMediaElement | null = null;
  private raf = 0;

  private vocalSplit!: ChannelSplitterNode;
  private midFromLeft!: GainNode;
  private midFromRight!: GainNode;
  private sideFromLeft!: GainNode;
  private sideFromRight!: GainNode;
  private midSum!: GainNode;
  private sideDiff!: GainNode;
  private adaptiveMid!: GainNode;
  private bandFilter!: BiquadFilterNode;
  private bandCancel!: GainNode;
  private bandFilterHigh!: BiquadFilterNode;
  private bandHighCancel!: GainNode;
  private processedMid!: GainNode;
  private midToLeft!: GainNode;
  private midToRight!: GainNode;
  private sideToLeft!: GainNode;
  private sideToRight!: GainNode;
  private merge!: ChannelMergerNode;
  private master!: GainNode;
  private midAnalyser!: AnalyserNode;
  private sideAnalyser!: AnalyserNode;
  private midBuf!: Float32Array<ArrayBuffer>;
  private sideBuf!: Float32Array<ArrayBuffer>;

  private enabled = false;
  private mode: VocalMode = 'adaptive';
  private strength = 1;
  private midGainValue = 1;
  private bandCancelValue = 0;
  private bandHighCancelValue = 0;
  private sideGainValue = 1;

  async attach(media: HTMLMediaElement) {
    if (this.media === media && this.ctx) return;
    await this.dispose();
    this.media = media;
    media.crossOrigin = 'anonymous';
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.buildGraph();
    this.source = this.ctx.createMediaElementSource(media);
    this.source.connect(this.vocalSplit);
    this.master.connect(this.ctx.destination);
    this.startLoop();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.apply(true);
  }

  private buildGraph() {
    const t = this.ctx!;
    this.vocalSplit = t.createChannelSplitter(2);
    this.midFromLeft = t.createGain();
    this.midFromRight = t.createGain();
    this.sideFromLeft = t.createGain();
    this.sideFromRight = t.createGain();
    this.midSum = t.createGain();
    this.sideDiff = t.createGain();
    this.adaptiveMid = t.createGain();
    this.bandFilter = t.createBiquadFilter();
    this.bandCancel = t.createGain();
    this.bandFilterHigh = t.createBiquadFilter();
    this.bandHighCancel = t.createGain();
    this.processedMid = t.createGain();
    this.midToLeft = t.createGain();
    this.midToRight = t.createGain();
    this.sideToLeft = t.createGain();
    this.sideToRight = t.createGain();
    this.merge = t.createChannelMerger(2);
    this.master = t.createGain();
    this.midAnalyser = t.createAnalyser();
    this.sideAnalyser = t.createAnalyser();
    this.midAnalyser.fftSize = 1024;
    this.sideAnalyser.fftSize = 1024;
    this.midAnalyser.smoothingTimeConstant = 0.65;
    this.sideAnalyser.smoothingTimeConstant = 0.65;
    this.midBuf = new Float32Array(this.midAnalyser.fftSize);
    this.sideBuf = new Float32Array(this.sideAnalyser.fftSize);

    this.midFromLeft.gain.value = 0.5;
    this.midFromRight.gain.value = 0.5;
    this.sideFromLeft.gain.value = 0.5;
    this.sideFromRight.gain.value = -0.5;
    this.adaptiveMid.gain.value = 1;
    this.bandFilter.type = 'bandpass';
    this.bandFilter.frequency.value = 1400;
    this.bandFilter.Q.value = 0.9;
    this.bandCancel.gain.value = 0;
    this.bandFilterHigh.type = 'bandpass';
    this.bandFilterHigh.frequency.value = 3200;
    this.bandFilterHigh.Q.value = 1.1;
    this.bandHighCancel.gain.value = 0;
    this.midToLeft.gain.value = 1;
    this.midToRight.gain.value = 1;
    this.sideToLeft.gain.value = 1;
    this.sideToRight.gain.value = -1;
    this.master.gain.value = 1;

    this.vocalSplit.connect(this.midFromLeft, 0);
    this.vocalSplit.connect(this.midFromRight, 1);
    this.vocalSplit.connect(this.sideFromLeft, 0);
    this.vocalSplit.connect(this.sideFromRight, 1);
    this.midFromLeft.connect(this.midSum);
    this.midFromRight.connect(this.midSum);
    this.sideFromLeft.connect(this.sideDiff);
    this.sideFromRight.connect(this.sideDiff);
    this.midSum.connect(this.midAnalyser);
    this.sideDiff.connect(this.sideAnalyser);
    this.midSum.connect(this.adaptiveMid);
    this.adaptiveMid.connect(this.processedMid);
    this.midSum.connect(this.bandFilter);
    this.bandFilter.connect(this.bandCancel);
    this.bandCancel.connect(this.processedMid);
    this.midSum.connect(this.bandFilterHigh);
    this.bandFilterHigh.connect(this.bandHighCancel);
    this.bandHighCancel.connect(this.processedMid);
    this.processedMid.connect(this.midToLeft);
    this.processedMid.connect(this.midToRight);
    this.sideDiff.connect(this.sideToLeft);
    this.sideDiff.connect(this.sideToRight);
    this.midToLeft.connect(this.merge, 0, 0);
    this.sideToLeft.connect(this.merge, 0, 0);
    this.midToRight.connect(this.merge, 0, 1);
    this.sideToRight.connect(this.merge, 0, 1);
    this.merge.connect(this.master);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.apply(true);
  }

  setMode(mode: VocalMode) {
    this.mode = ['classic', 'adaptive', 'hq'].includes(mode) ? mode : 'adaptive';
    this.apply(true);
  }

  setStrength(strength: number) {
    this.strength = Math.max(0, Math.min(1, strength));
    this.apply(true);
  }

  setMasterGain(gain: number) {
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(Math.max(0, Math.min(1.5, gain)), this.ctx.currentTime);
    }
  }

  async resume() {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  private readRms(analyser: AnalyserNode, buf: Float32Array<ArrayBuffer>) {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  private smooth(current: number, target: number, alpha: number) {
    return current + (target - current) * alpha;
  }

  private apply(immediate = false) {
    if (!this.ctx || !this.adaptiveMid) return;

    let mid = 1;
    let band = 0;
    let bandHigh = 0;
    let side = 1;

    if (this.enabled && this.strength > 0) {
      const C = this.strength;
      const G = Math.min(1, Math.pow(C, 0.78) * 1.08);
      if (this.mode === 'classic') {
        mid = Math.max(0, 1 - C);
        band = 0;
        bandHigh = 0;
        side = 1 + C;
      } else {
        const midRms = this.readRms(this.midAnalyser, this.midBuf);
        const sideRms = this.readRms(this.sideAnalyser, this.sideBuf);
        const ratio = sideRms / Math.max(midRms, 1e-4);
        const l = Math.max(0, Math.min(1, 1 - ratio * 1.35));
        if (this.mode === 'hq') {
          mid = Math.max(0.08, 1 - G * (0.42 + 0.72 * l));
          band = -Math.min(1.08, G * (0.3 + 0.84 * l));
          bandHigh = -Math.min(0.96, G * (0.22 + 0.7 * l));
          side = 1 + Math.min(0.82, G * (0.16 + 0.62 * l));
        } else {
          mid = Math.max(0.2, 1 - G * (0.3 + 0.62 * l));
          band = -Math.min(0.86, G * (0.18 + 0.64 * l));
          bandHigh = -Math.min(0.38, G * (0.08 + 0.34 * l));
          side = 1 + Math.min(0.56, G * (0.12 + 0.45 * l));
        }
      }
    }

    const aMid = immediate ? 1 : mid < this.midGainValue ? 0.3 : 0.1;
    const aBand = immediate ? 1 : Math.abs(band) > Math.abs(this.bandCancelValue) ? 0.26 : 0.12;
    const aHigh = immediate ? 1 : Math.abs(bandHigh) > Math.abs(this.bandHighCancelValue) ? 0.24 : 0.12;
    const aSide = immediate ? 1 : side > this.sideGainValue ? 0.22 : 0.1;

    this.midGainValue = this.smooth(this.midGainValue, mid, aMid);
    this.bandCancelValue = this.smooth(this.bandCancelValue, band, aBand);
    this.bandHighCancelValue = this.smooth(this.bandHighCancelValue, bandHigh, aHigh);
    this.sideGainValue = this.smooth(this.sideGainValue, side, aSide);

    const now = this.ctx.currentTime;
    this.adaptiveMid.gain.setValueAtTime(this.midGainValue, now);
    this.bandCancel.gain.setValueAtTime(this.bandCancelValue, now);
    this.bandHighCancel.gain.setValueAtTime(this.bandHighCancelValue, now);
    this.sideToLeft.gain.setValueAtTime(this.sideGainValue, now);
    this.sideToRight.gain.setValueAtTime(-this.sideGainValue, now);
  }

  private startLoop() {
    const tick = () => {
      this.apply(false);
      this.raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(tick);
  }

  async dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    try {
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      await this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.source = null;
    this.ctx = null;
    this.media = null;
  }
}
