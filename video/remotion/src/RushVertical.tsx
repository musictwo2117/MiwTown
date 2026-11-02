import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Fredoka';
import { Bouncy } from './Vertical';

const { fontFamily } = loadFont('normal', { weights: ['500', '600'] });
export const RUSH_FRAMES = 636;   // the square promo: 21.2 s at 30 fps

const INK = '#6b3d45', ROSE = '#e8608a', CREAM = '#fffaf6';
// the three steps, lit up while the promo is on that part of the game (frames of rush.mp4)
const STEPS = [
  { label: 'Bake', emoji: '🍳', from: 96, to: 318 },
  { label: 'Serve', emoji: '🧁', from: 318, to: 438 },
  { label: 'Cash up', emoji: '💰', from: 438, to: 534 },
];

export const RushVertical = () => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const float = Math.sin((frame / 150) * Math.PI * 2) * 6;

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #ffe0ea 0%, #fff0e6 55%, #ffe6ee 100%)' }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(#ffc9d7 9px, transparent 10px)', backgroundSize: '90px 90px', opacity: 0.55 }} />

      <div style={{ position: 'absolute', top: 250, width: '100%' }}>
        <Bouncy text="Cheesecake Rush" delay={4} size={118} color={INK} weight={600} />
        <div style={{ height: 10 }} />
        <Bouncy text="a cozy dessert-shop game" delay={26} size={48} color={ROSE} weight={500} />
      </div>

      {/* the square promo, as a framed picture that pops in; its own sound plays with it */}
      <div style={{
        position: 'absolute', left: 50, top: 560 + float, width: 980, height: 980, borderRadius: 56, overflow: 'hidden',
        border: `10px solid ${CREAM}`, boxShadow: '0 30px 60px rgba(160, 80, 100, 0.25)',
        transform: `scale(${0.82 + 0.18 * enter})`, opacity: enter,
      }}>
        <OffthreadVideo src={staticFile('rush.mp4')} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Bake, Serve, Cash up: the current step pops up, pink and bigger */}
      <div style={{ position: 'absolute', top: 1625, width: '100%', display: 'flex', justifyContent: 'center', gap: 22, opacity: interpolate(frame, [50, 75], [0, 1], { extrapolateRight: 'clamp' }) }}>
        {STEPS.map((s, i) => {
          const on = frame >= s.from && frame < s.to + 12;
          const k = spring({ frame: frame - s.from, fps, config: { damping: 11, stiffness: 150 } });
          const lit = frame >= s.from && frame < s.to ? 0.9 + 0.1 * Math.min(1, k) : 1;
          return (
            <div key={i} style={{
              fontFamily, fontWeight: 600, fontSize: 40, padding: '16px 30px', borderRadius: 60,
              background: frame >= s.from && frame < s.to ? ROSE : CREAM, color: frame >= s.from && frame < s.to ? CREAM : INK,
              opacity: on || frame < s.from ? 1 : 0.6, border: `6px solid ${frame >= s.from && frame < s.to ? ROSE : '#ffd3e0'}`,
              boxShadow: '0 10px 24px rgba(160, 80, 100, 0.18)', transform: `scale(${lit === 1 ? 1 : 1.08 * lit})`,
            }}>{s.emoji}  {s.label}</div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 1775, width: '100%', fontFamily, fontWeight: 500, fontSize: 42, color: INK, textAlign: 'center', opacity: 0.8 }}>
        ♡ from Miw's Town
      </div>
    </AbsoluteFill>
  );
};
