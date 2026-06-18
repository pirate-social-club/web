"use strict";
(() => {
  // src/components/compositions/karaoke/capture/karaoke-capture-dsp.ts
  var KARAOKE_CAPTURE_OUTPUT_RATE = 16e3;
  var KARAOKE_CAPTURE_CHUNK_SAMPLES = 1600;
  function downmixToMono(channels, frames) {
    const out = new Float32Array(frames);
    const channelCount = channels.length;
    if (channelCount === 0) return out;
    if (channelCount === 1) {
      out.set(channels[0].subarray(0, frames));
      return out;
    }
    for (let i = 0; i < frames; i += 1) {
      let sum = 0;
      for (let c = 0; c < channelCount; c += 1) sum += channels[c][i] ?? 0;
      out[i] = sum / channelCount;
    }
    return out;
  }
  function sinc(x) {
    if (x === 0) return 1;
    const pix = Math.PI * x;
    return Math.sin(pix) / pix;
  }
  function blackman(x, halfTaps) {
    if (x <= -halfTaps || x >= halfTaps) return 0;
    const t = x / halfTaps;
    return 0.42 + 0.5 * Math.cos(Math.PI * t) + 0.08 * Math.cos(2 * Math.PI * t);
  }
  var StreamingResampler = class {
    // global (fractional) input index of the next output sample
    constructor(options) {
      // input samples advanced per output sample
      // Precomputed windowed-sinc kernel, sampled `oversample` points per tap, so the
      // hot loop is table-lookup + linear interp (NO sin()/cos() per tap) — important
      // for real-time worklet cost (audit F4).
      this.oversample = 512;
      this.history = [];
      // sliding window of input samples
      this.historyBase = 0;
      // global input index of history[0]
      this.inputPos = 0;
      this.inputRate = options.inputRate;
      this.outputRate = options.outputRate ?? KARAOKE_CAPTURE_OUTPUT_RATE;
      this.halfTaps = options.halfTaps ?? 16;
      const factor = this.outputRate / this.inputRate;
      this.filterScale = Math.min(1, factor);
      this.halfWidthInput = this.halfTaps / this.filterScale;
      this.step = this.inputRate / this.outputRate;
      const length = this.halfTaps * this.oversample + 2;
      const table = new Float64Array(length);
      for (let k = 0; k < length; k += 1) {
        const x = k / this.oversample;
        table[k] = sinc(x) * blackman(x, this.halfTaps);
      }
      this.kernelTable = table;
    }
    /** Whether this resampler is a no-op (input already at output rate). */
    get isPassthrough() {
      return this.inputRate === this.outputRate;
    }
    kernel(x) {
      const xa = x < 0 ? -x : x;
      if (xa >= this.halfTaps) return 0;
      const pos = xa * this.oversample;
      const i = pos | 0;
      const frac = pos - i;
      const table = this.kernelTable;
      return table[i] + (table[i + 1] - table[i]) * frac;
    }
    sampleAt(p) {
      const jStart = Math.ceil(p - this.halfWidthInput);
      const jEnd = Math.floor(p + this.halfWidthInput);
      let acc = 0;
      for (let j = jStart; j <= jEnd; j += 1) {
        const idx = j - this.historyBase;
        if (idx < 0 || idx >= this.history.length) continue;
        acc += this.history[idx] * this.kernel((p - j) * this.filterScale);
      }
      return acc * this.filterScale;
    }
    /** Feeds input samples, returns the output samples producible so far. */
    process(input) {
      if (this.isPassthrough) return input.slice();
      for (let i = 0; i < input.length; i += 1) this.history.push(input[i]);
      const lastAvailable = this.historyBase + this.history.length - 1;
      const out = [];
      while (this.inputPos + this.halfWidthInput <= lastAvailable) {
        out.push(this.sampleAt(this.inputPos));
        this.inputPos += this.step;
      }
      const keepFrom = Math.floor(this.inputPos - this.halfWidthInput);
      const drop = keepFrom - this.historyBase;
      if (drop > 0) {
        this.history.splice(0, drop);
        this.historyBase += drop;
      }
      return Float32Array.from(out);
    }
    /**
     * Drains the samples the sinc kernel was holding for look-ahead, producing the
     * final outputs up to (and including) the LAST real input sample. The right tail
     * of the kernel is zero-padded for these last outputs — but we never advance
     * past the last real sample, so no post-signal silence is invented as audio
     * (audit F3). Leaves the resampler reset; call once at end-of-stream.
     */
    flush() {
      if (this.isPassthrough) return new Float32Array(0);
      const lastAvailable = this.historyBase + this.history.length - 1;
      const out = [];
      while (this.inputPos <= lastAvailable) {
        out.push(this.sampleAt(this.inputPos));
        this.inputPos += this.step;
      }
      this.reset();
      return Float32Array.from(out);
    }
    reset() {
      this.history = [];
      this.historyBase = 0;
      this.inputPos = 0;
    }
  };
  function floatToInt16(input, out) {
    const result = out ?? new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, input[i]));
      result[i] = Math.round(clamped * 32767);
    }
    return result;
  }
  var KaraokeCaptureChunker = class {
    // cumulative output samples committed to emitted chunks
    constructor(options) {
      this.pending = [];
      this.producedSamples = 0;
      this.outputRate = options.outputRate ?? KARAOKE_CAPTURE_OUTPUT_RATE;
      this.chunkSamples = options.chunkSamples ?? KARAOKE_CAPTURE_CHUNK_SAMPLES;
      this.startTimeMs = options.startTimeMs;
    }
    makeChunk(samples) {
      const pcm = new Int16Array(samples);
      this.producedSamples += samples.length;
      return {
        capturedAtMs: this.startTimeMs + this.producedSamples / this.outputRate * 1e3,
        pcm16: pcm.buffer
      };
    }
    /** Adds samples, returning any complete chunks (partial remainder stays buffered). */
    push(samples) {
      const chunks = [];
      for (let i = 0; i < samples.length; i += 1) {
        this.pending.push(samples[i]);
        if (this.pending.length === this.chunkSamples) {
          chunks.push(this.makeChunk(this.pending));
          this.pending = [];
        }
      }
      return chunks;
    }
    /** Emits any buffered remainder as a final (short) chunk; null if none. */
    flush() {
      if (this.pending.length === 0) return null;
      const chunk = this.makeChunk(this.pending);
      this.pending = [];
      return chunk;
    }
    reset() {
      this.pending = [];
      this.producedSamples = 0;
    }
  };
  var KaraokeCaptureDsp = class {
    constructor(options) {
      const outputRate = options.outputRate ?? KARAOKE_CAPTURE_OUTPUT_RATE;
      this.resampler = new StreamingResampler({
        halfTaps: options.halfTaps,
        inputRate: options.inputRate,
        outputRate
      });
      this.chunker = new KaraokeCaptureChunker({
        chunkSamples: options.chunkSamples,
        outputRate,
        startTimeMs: options.startTimeMs
      });
    }
    processQuantum(channels, frames) {
      const mono = downmixToMono(channels, frames);
      const resampled = this.resampler.process(mono);
      if (resampled.length === 0) return [];
      return this.chunker.push(floatToInt16(resampled));
    }
    /**
     * End-of-stream flush (deactivate/seek/finish): drains the resampler's retained
     * tail through the chunker, then emits any partial chunk — so the final
     * filter-width of audio is NOT lost (audit F3). Returns all resulting chunks.
     */
    flush() {
      const chunks = [];
      const tail = this.resampler.flush();
      if (tail.length > 0) chunks.push(...this.chunker.push(floatToInt16(tail)));
      const remainder = this.chunker.flush();
      if (remainder) chunks.push(remainder);
      return chunks;
    }
  };

  // src/components/compositions/karaoke/capture/karaoke-capture-processor.ts
  var KaraokeCaptureProcessor = class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.inputRate = sampleRate;
      this.epoch = 0;
      this.active = false;
      this.stopped = false;
      this.dsp = null;
      this.port.onmessage = (event) => this.handle(event.data);
    }
    handle(message) {
      switch (message.type) {
        case "configure":
          this.inputRate = message.inputRate || sampleRate;
          this.chunkSamples = message.chunkSamples;
          this.halfTaps = message.halfTaps;
          break;
        case "activate":
          this.epoch = message.epoch;
          this.dsp = new KaraokeCaptureDsp({
            chunkSamples: this.chunkSamples,
            halfTaps: this.halfTaps,
            inputRate: this.inputRate,
            startTimeMs: message.startTimeMs
          });
          this.active = true;
          break;
        case "deactivate":
          this.active = false;
          this.flushTail();
          this.port.postMessage({ epoch: message.epoch, type: "flushed" });
          this.dsp = null;
          break;
        case "stop":
          this.active = false;
          this.dsp = null;
          this.stopped = true;
          break;
      }
    }
    flushTail() {
      if (!this.dsp) return;
      for (const chunk of this.dsp.flush()) {
        this.port.postMessage({ capturedAtMs: chunk.capturedAtMs, epoch: this.epoch, pcm16: chunk.pcm16, type: "chunk" }, [chunk.pcm16]);
      }
    }
    process(inputs) {
      if (this.stopped) return false;
      if (!this.active || !this.dsp) return true;
      const input = inputs[0];
      if (!input || input.length === 0) return true;
      const frames = input[0]?.length ?? 0;
      if (frames === 0) return true;
      for (const chunk of this.dsp.processQuantum(input, frames)) {
        this.port.postMessage({ capturedAtMs: chunk.capturedAtMs, epoch: this.epoch, pcm16: chunk.pcm16, type: "chunk" }, [chunk.pcm16]);
      }
      return true;
    }
  };
  registerProcessor("karaoke-capture-processor", KaraokeCaptureProcessor);
})();
