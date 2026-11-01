import { Composition } from 'remotion';
import { Vertical, FPS, LOOP_FRAMES } from './Vertical';

// The 9:16 cut for Reels, TikTok and Shorts: the square loop played twice, framed with a title and an end card
export const Root = () => (
  <Composition id="Vertical" component={Vertical} width={1080} height={1920} fps={FPS} durationInFrames={LOOP_FRAMES * 2} />
);
