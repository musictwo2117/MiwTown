#!/bin/sh
# Turns the frames a clip captured (open http://localhost:19200/<clip>?capture) into an MP4 for X,
# a looping GIF and a contact sheet: sh video/encode.sh intro
set -e
CLIP=${1:-intro}; FPS=${FPS:-30}
OUT="$(dirname "$0")/out/$CLIP"
# H.264 High, yuv420p, starts playing at once
ffmpeg -y -loglevel error -framerate $FPS -i "$OUT/frames/%04d.png" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -movflags +faststart "$OUT/$CLIP.mp4"
# one palette for the whole GIF so colors don't flicker, 720 px wide
ffmpeg -y -loglevel error -framerate $FPS -i "$OUT/frames/%04d.png" -vf "fps=15,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 "$OUT/$CLIP.gif"
# every 15th frame, 6 across: read it like a storyboard
ffmpeg -y -loglevel error -i "$OUT/frames/%04d.png" -vf "select='not(mod(n\,15))',scale=300:-1,tile=6x4" -frames:v 1 "$OUT/contact.png"
# three loops back to back, to watch the seam
ffmpeg -y -loglevel error -stream_loop 2 -i "$OUT/$CLIP.mp4" -c copy "$OUT/loop_check.mp4"
echo "$OUT/$CLIP.mp4"
