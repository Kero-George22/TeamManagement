import React, { useEffect, useRef } from 'react';

export default function ScoreRing({ score = 0, size = 90 }) {
  const ringRef = useRef(null);

  useEffect(() => {
    if (!ringRef.current) return;
    const color =
      score >= 70 ? 'var(--green)' :
      score >= 40 ? 'var(--gold)'  : 'var(--red)';
    ringRef.current.style.background =
      `conic-gradient(${color} ${score}%, rgba(255,255,255,0.04) 0%)`;
    const val = ringRef.current.querySelector('.score-ring-val');
    if (val) val.style.color = color;
  }, [score]);

  return (
    <div
      ref={ringRef}
      className="score-ring"
      style={{ width: size, height: size }}
    >
      <div style={{ position:'absolute', width: size - 20, height: size - 20, borderRadius:'50%', background:'var(--bg-card)' }} />
      <span className="score-ring-val" style={{ position:'relative', zIndex:1, fontFamily:'var(--font-display)', fontSize: size * 0.2, fontWeight:900 }}>
        {score}
      </span>
    </div>
  );
}
