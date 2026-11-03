#!/bin/sh
# Turns the frames a clip captured (open http://localhost:19200/<clip>?capture) into an MP4 for X,
# a looping GIF and a contact sheet: sh tools/video/encode.sh intro
# (a promo clip that doesn't loop: FADE=0.8 NOLOOP=1 sh tools/video/encode.sh rush)
set -e
CLIP=${1:-intro}; FPS=${FPS:-30}
OUT="$(dirname "$0")/out/$CLIP"
# H.264 High, yuv420p, starts playing at once
ffmpeg -y -loglevel error -framerate $FPS -i "$OUT/frames/%04d.${EXT:-png}" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -movflags +faststart "$OUT/$CLIP.mp4"
# with a soundtrack (open http://localhost:19200/<clip>?audio): normalise it to -14 LUFS, peaks under -1 dBTP,
# and mux it in as AAC, cut to the picture
if [ -f "$OUT/$CLIP.wav" ]; then
  AF="loudnorm=I=-14:TP=-1:LRA=11,aresample=48000"
  # FADE=0.8 fades the sound out over its last 0.8 s, for clips that don't loop
  if [ -n "$FADE" ]; then N=$(ls "$OUT/frames" | wc -l | tr -d ' '); AF="$AF,afade=t=out:st=$(awk "BEGIN{print $N/$FPS-$FADE}"):d=$FADE"; fi
  ffmpeg -y -loglevel error -i "$OUT/$CLIP.mp4" -i "$OUT/$CLIP.wav" -filter_complex "[1:a]$AF[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/$CLIP.sound.mp4"
  mv "$OUT/$CLIP.sound.mp4" "$OUT/$CLIP.mp4"
fi
# one palette for the whole GIF so colors don't flicker, 720 px wide
ffmpeg -y -loglevel error -framerate $FPS -i "$OUT/frames/%04d.${EXT:-png}" -vf "fps=15,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 "$OUT/$CLIP.gif"
# every 15th frame, 6 across: read it like a storyboard
ffmpeg -y -loglevel error -i "$OUT/frames/%04d.${EXT:-png}" -vf "select='not(mod(n\,15))',scale=300:-1,tile=6x4" -frames:v 1 "$OUT/contact.png"
# three loops back to back, to watch the seam (NOLOOP=1 skips it, for clips that don't loop)
[ -n "$NOLOOP" ] || ffmpeg -y -loglevel error -stream_loop 2 -i "$OUT/$CLIP.mp4" -c copy "$OUT/loop_check.mp4"
echo "$OUT/$CLIP.mp4"
