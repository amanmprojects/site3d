import { motion } from './motion'
import { useApp } from './store'

type Layer = 'engine' | 'boost' | 'warp' | 'pad'

interface LayerNodes {
  gain: GainNode
  source: AudioNode
}

const ENGINE_MIN = 0
const ENGINE_MAX = 1200
const BOOST_MAX = 1100

class AudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  layers: Partial<Record<Layer, LayerNodes>> = {}
  started = false
  muted = false
  raf = 0

  ensure() {
    if (this.ctx) return
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    const master = this.ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.9
    master.connect(this.ctx.destination)
    this.master = master
  }

  start() {
    this.ensure()
    if (!this.ctx || this.started) return
    this.started = true
    this.buildEngine()
    this.buildBoost()
    this.buildWarp()
    this.buildPad()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    this.tick()
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0
  }

  private makeNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  private buildEngine() {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.master!)
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 60
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 400
    osc.connect(lp)
    lp.connect(gain)
    osc.start()
    this.layers.engine = { gain, source: osc }
  }

  private buildBoost() {
    const ctx = this.ctx!
    const buf = this.makeNoiseBuffer()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 800
    bp.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(bp)
    bp.connect(gain)
    gain.connect(this.master!)
    src.start()
    this.layers.boost = { gain, source: src }
  }

  private buildWarp() {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.master!)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 220
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 6
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 40
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    osc.connect(gain)
    osc.start()
    lfo.start()
    this.layers.warp = { gain, source: osc }
  }

  private buildPad() {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 0.16
    gain.connect(this.master!)
    const freqs = [55, 82.5, 110, 165]
    for (const f of freqs) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.25
      const detune = ctx.createOscillator()
      detune.type = 'sine'
      detune.frequency.value = 0.05 + f / 2000
      const detuneGain = ctx.createGain()
      detuneGain.gain.value = 4
      detune.connect(detuneGain)
      detuneGain.connect(o.detune)
      o.connect(g)
      g.connect(gain)
      o.start()
      detune.start()
    }
    this.layers.pad = { gain, source: gain }
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.now(), 0.05)
    }
  }

  scanChime() {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const t = this.now()
    const notes = [880, 1320]
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = freq
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t + i * 0.08)
      g.gain.linearRampToValueAtTime(0.18, t + i * 0.08 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.5)
      o.connect(g)
      g.connect(this.master!)
      o.start(t + i * 0.08)
      o.stop(t + i * 0.08 + 0.55)
    })
  }

  warpWhoosh() {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const t = this.now()
    const buf = this.makeNoiseBuffer()
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(200, t)
    bp.frequency.exponentialRampToValueAtTime(3500, t + 1.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.35, t + 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.master!)
    src.start(t)
    src.stop(t + 1.55)
  }

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick)
    if (!this.ctx) return
    const speed = motion.speed
    const boostOver = Math.max(0, speed - ENGINE_MAX) / (BOOST_MAX - ENGINE_MIN)
    const engineLayer = this.layers.engine
    const boostLayer = this.layers.boost
    const warpLayer = this.layers.warp

    if (engineLayer) {
      const drive = Math.min(1, speed / ENGINE_MAX)
      engineLayer.gain.gain.setTargetAtTime(0.04 + drive * 0.16, this.now(), 0.08)
      const osc = engineLayer.source as OscillatorNode
      osc.frequency.setTargetAtTime(55 + drive * 90, this.now(), 0.1)
    }
    if (boostLayer) {
      const g = Math.min(1, boostOver) * 0.14
      boostLayer.gain.gain.setTargetAtTime(g, this.now(), 0.1)
    }
    if (warpLayer) {
      const g = useApp.getState().warpTo ? 0.22 : 0
      warpLayer.gain.gain.setTargetAtTime(g, this.now(), 0.15)
    }
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    if (this.ctx) this.ctx.close()
    this.ctx = null
    this.master = null
    this.layers = {}
    this.started = false
  }
}

let engine: AudioEngine | null = null
function getEngine() {
  if (!engine) engine = new AudioEngine()
  return engine
}

export function startAudio() {
  getEngine().start()
}

export function setAudioMuted(m: boolean) {
  getEngine().setMuted(m)
}

export function audioScanChime() {
  getEngine().scanChime()
}

export function audioWarpWhoosh() {
  getEngine().warpWhoosh()
}

export function isAudioStarted() {
  return !!engine?.started
}
