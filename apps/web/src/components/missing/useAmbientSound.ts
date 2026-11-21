"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 실종방 배경 소리: 멀리서 밀려왔다 빠지는 파도 + 언덕을 스치는 바람.
 * 음원 파일 없이 브라우저에서 잡음을 걸러 만듦 (저작권·용량 걱정 없음). 처음엔 꺼져 있고, 켤 때만 소리를 냄
 */
export function useAmbientSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
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
      masterRef.current?.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    } else if (ctx && masterRef.current) {
      // 바로 끊지 않고 1초쯤에 걸쳐 줄인 뒤 멈춤
      masterRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      const c = ctx;
      window.setTimeout(() => void c.suspend(), 1200);
    }
  }, [on]);

  // 방을 나가면 정리
  useEffect(
    () => () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  return { on, toggle };
}

/** 잡음 버퍼 (갈색 잡음: 낮은 소리가 많은 부드러운 잡음) */
function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
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

  // 파도: 낮은 소리만 남기고, 9초쯤 간격으로 밀려왔다 빠짐
  const sea = loopNoise(ctx, buffer);
  const seaFilter = ctx.createBiquadFilter();
  seaFilter.type = "lowpass";
  seaFilter.frequency.value = 420;
  const seaGain = ctx.createGain();
  swell(ctx, seaGain.gain, 0.32, 0.22, 0.11);
  swell(ctx, seaFilter.frequency, 420, 160, 0.11);
  sea.connect(seaFilter).connect(seaGain).connect(master);

  // 바람: 가운데 높이의 소리를 아주 작게, 더 느리고 불규칙하게
  const wind = loopNoise(ctx, buffer);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 700;
  windFilter.Q.value = 0.6;
  const windGain = ctx.createGain();
  swell(ctx, windGain.gain, 0.07, 0.05, 0.047);
  swell(ctx, windFilter.frequency, 700, 250, 0.031);
  wind.connect(windFilter).connect(windGain).connect(master);

  return master;
}
