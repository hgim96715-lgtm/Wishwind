"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 실종방 배경 소리: 잔잔하게 밀려왔다 빠지는 파도 + 가끔 울리는 풍경(바람종) 소리.
 * 낮게 웅웅거리는 소리는 차갑고 어둡게 들려서(사용자 의견 2026-11-21) 빼고, 밝고 부드러운 소리 위주로 만듦.
 * 음원 파일 없이 브라우저에서 잡음을 걸러 만듦 (저작권·용량 걱정 없음). 처음엔 꺼져 있고, 켤 때만 소리를 냄
 */
export function useAmbientSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const chimeTimer = useRef<number | null>(null);
  const [on, setOn] = useState(false);

  /** 버튼을 누른 순간에 바로 켜고 끔 (아이폰 사파리는 누르는 동작 안에서 시작해야 소리가 남) */
  const toggle = useCallback(() => {
    const next = !on;
    setOn(next);
    let ctx = ctxRef.current;
    if (next) {
      if (!ctx) {
        ctx = new AudioContext();
        ctxRef.current = ctx;
        masterRef.current = build(ctx);
      }
      void ctx.resume();
      masterRef.current?.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8);
      // 풍경 소리: 4~9초에 한 번, 가끔 두세 음이 이어서
      const c = ctx;
      const loop = () => {
        if (masterRef.current) chime(c, masterRef.current);
        chimeTimer.current = window.setTimeout(loop, 4000 + Math.random() * 5000);
      };
      chimeTimer.current = window.setTimeout(loop, 1500);
    } else if (ctx && masterRef.current) {
      if (chimeTimer.current) window.clearTimeout(chimeTimer.current);
      // 바로 끊지 않고 1초쯤에 걸쳐 줄인 뒤 멈춤
      masterRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      const c = ctx;
      window.setTimeout(() => void c.suspend(), 1200);
    }
  }, [on]);

  // 방을 나가면 정리
  useEffect(
    () => () => {
      if (chimeTimer.current) window.clearTimeout(chimeTimer.current);
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  return { on, toggle };
}

/** 잡음 버퍼 (분홍 잡음: 쏴아 하는 부드러운 물결 소리에 가까움) */
function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
  }
  return buf;
}

/** 풍경(바람종) 한 번: 밝은 5음 음계 중 하나를 맑게 울리고 천천히 사라짐. 가끔 두세 음이 이어짐 */
const CHIME_NOTES = [784, 880, 1047, 1175, 1319, 1568];
function chime(ctx: AudioContext, out: AudioNode) {
  const count = Math.random() < 0.35 ? 2 + Math.floor(Math.random() * 2) : 1;
  for (let n = 0; n < count; n++) {
    const t = ctx.currentTime + n * (0.18 + Math.random() * 0.25);
    const f = CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    g.connect(out);
    // 기본음 + 살짝 높은 배음 → 쇠 풍경처럼 맑은 소리
    for (const [mult, amp] of [[1, 1], [2.76, 0.25]] as const) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult;
      const a = ctx.createGain();
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(t + 3.3);
    }
  }
}

function loopNoise(ctx: AudioContext, buffer: AudioBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(0, Math.random() * buffer.duration);
  return src;
}

/** 느린 흔들림(LFO)으로 소리 크기를 오르내리게 함 */
function swell(ctx: AudioContext, target: AudioParam, base: number, depth: number, hz: number) {
  target.value = base;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = hz;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(target);
  lfo.start();
}

function build(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const buffer = noiseBuffer(ctx, 6);

  // 파도: 웅웅거리는 아주 낮은 소리는 걸러 내고(따뜻하게), 10초쯤 간격으로 잔잔히 밀려왔다 빠짐
  const sea = loopNoise(ctx, buffer);
  const seaLow = ctx.createBiquadFilter();
  seaLow.type = "highpass";
  seaLow.frequency.value = 180;
  const seaFilter = ctx.createBiquadFilter();
  seaFilter.type = "lowpass";
  seaFilter.frequency.value = 1300;
  const seaGain = ctx.createGain();
  swell(ctx, seaGain.gain, 0.22, 0.16, 0.1);
  swell(ctx, seaFilter.frequency, 1300, 500, 0.1);
  sea.connect(seaLow).connect(seaFilter).connect(seaGain).connect(master);

  // 바람: 산들바람처럼 아주 작게, 더 느리게
  const wind = loopNoise(ctx, buffer);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 1100;
  windFilter.Q.value = 0.7;
  const windGain = ctx.createGain();
  swell(ctx, windGain.gain, 0.04, 0.03, 0.047);
  swell(ctx, windFilter.frequency, 1100, 300, 0.031);
  wind.connect(windFilter).connect(windGain).connect(master);

  return master;
}
