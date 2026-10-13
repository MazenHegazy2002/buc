"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Slide = { title: string; bullets: string[]; narration: string };

/**
 * Narrated slideshow "video": each slide is read aloud with the browser's
 * text-to-speech and auto-advances when the narration ends.
 */
export default function VideoLesson({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const playingRef = useRef(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (idx: number) => {
      if (!supported) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(slides[idx].narration);
      u.rate = rate;
      u.lang = "en-US";
      const voice = speechSynthesis.getVoices().find((v) => /en[-_](US|GB)/.test(v.lang) && /natural|premium|enhanced|google/i.test(v.name));
      if (voice) u.voice = voice;
      u.onend = () => {
        if (!playingRef.current) return;
        if (idx < slides.length - 1) setI(idx + 1);
        else {
          playingRef.current = false;
          setPlaying(false);
        }
      };
      speechSynthesis.speak(u);
    },
    [slides, rate, supported],
  );

  useEffect(() => {
    if (playing) speak(i);
  }, [i, playing, speak]);

  useEffect(() => () => { if (supported) speechSynthesis.cancel(); }, [supported]);

  const toggle = () => {
    const next = !playing;
    playingRef.current = next;
    setPlaying(next);
    if (!next && supported) speechSynthesis.cancel();
  };
  const go = (n: number) => setI(Math.max(0, Math.min(slides.length - 1, n)));

  const s = slides[i];
  return (
    <div className="video">
      <div className="stage" key={i}>
        <div className="slide-num">SLIDE {i + 1} / {slides.length}</div>
        <h2 className="slide-title">{s.title}</h2>
        <ul className="slide-bullets">
          {s.bullets.map((b, k) => (
            <li key={k} style={{ animationDelay: `${150 + k * 120}ms` }}>{b}</li>
          ))}
        </ul>
      </div>
      <div className="caption">{s.narration}</div>
      <div className="controls">
        <button className="btn" onClick={() => go(i - 1)} disabled={i === 0} id="video-prev">⏮</button>
        <button className="btn btn-primary" onClick={toggle} id="video-play" disabled={!supported}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button className="btn" onClick={() => go(i + 1)} disabled={i === slides.length - 1} id="video-next">⏭</button>
        <div className="progress"><div style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>
        <select className="btn" value={rate} onChange={(e) => setRate(Number(e.target.value))} id="video-speed" aria-label="Speed">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
      </div>
    </div>
  );
}
