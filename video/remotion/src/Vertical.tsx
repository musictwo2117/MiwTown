import { AbsoluteFill, Loop, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Fredoka';

const { fontFamily } = loadFont('normal', { weights: ['500', '600'] });
export const FPS = 30;
export const LOOP_FRAMES = 315;   // the square loop: 10.5 s

const INK = '#6b3d45', ROSE = '#e8608a', CREAM = '#fffaf6';
const END = 75;   // the end card's length in frames

// a word whose letters drop in one after another on a bouncy spring
const Bouncy = ({ text, delay, size, color, weight }: { text: string; delay: number; size: number; color: string; weight: number }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily, fontSize: size, fontWeight: weight, color, display: 'flex', justifyContent: 'center', whiteSpace: 'pre' }}>
      {[...text].map((c, i) => {
        const s = spring({ frame: frame - delay - i * 2, fps, config: { damping: 9, stiffness: 160 } });
        return <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * -60}px) scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) }}>{c}</span>;
      })}
    </div>
  );
};

export const Vertical = () => {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const outro = spring({ frame: frame - (durationInFrames - END), fps, config: { damping: 15, stiffness: 110 } });
  const float = Math.sin((frame / LOOP_FRAMES) * Math.PI * 4) * 6;   // a gentle bob, twice per loop

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #ffe0ea 0%, #fff0e6 55%, #ffe6ee 100%)' }}>
      {/* soft polka dots, like the shop's wallpaper hearts */}
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(#ffc9d7 9px, transparent 10px)', backgroundSize: '90px 90px', opacity: 0.55 }} />

      {/* the video's own chalkboard already says "Miw's Cheesecake", so the frame names the project instead */}
      <div style={{ position: 'absolute', top: 250, width: '100%' }}>
        <Bouncy text="Miw's Town" delay={4} size={124} color={INK} weight={600} />
        <div style={{ height: 10 }} />
        <Bouncy text="your Claude Code agents, as tiny friends" delay={18} size={46} color={ROSE} weight={500} />
      </div>

      {/* the square loop, as a framed picture that pops in */}
      <div style={{
        position: 'absolute', left: 50, top: 560 + float, width: 980, height: 980, borderRadius: 56, overflow: 'hidden',
        border: `10px solid ${CREAM}`, boxShadow: '0 30px 60px rgba(160, 80, 100, 0.25)',
        transform: `scale(${0.82 + 0.18 * enter})`, opacity: enter,
      }}>
        <Loop durationInFrames={LOOP_FRAMES}>
          <OffthreadVideo src={staticFile('intro.mp4')} style={{ width: '100%', height: '100%' }} />
        </Loop>
      </div>

      <div style={{ position: 'absolute', top: 1640, width: '100%', fontFamily, fontWeight: 500, fontSize: 46, color: INK, textAlign: 'center', opacity: interpolate(frame, [40, 60], [0, 0.85], { extrapolateRight: 'clamp' }) }}>
        seven little friends, one big cheesecake
      </div>

      {/* end card: a cream sheet slides up with a goodbye */}
      <AbsoluteFill style={{ transform: `translateY(${(1 - outro) * 1920}px)`, background: CREAM, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily, fontSize: 64, fontWeight: 500, color: ROSE, marginBottom: 20 }}>see you at</div>
        <div style={{ fontFamily, fontSize: 118, fontWeight: 600, color: INK }}>Miw's Cheesecake</div>
        <div style={{ fontFamily, fontSize: 100, color: ROSE, marginTop: 30, transform: `scale(${1 + 0.08 * Math.sin(frame / 5)})` }}>♡</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
