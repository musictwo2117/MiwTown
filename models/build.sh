#!/bin/sh
# Rebuild every character .glb from its Blender script:  sh models/build.sh [cat bunny ...]
cd "$(dirname "$0")"
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
for name in ${@:-cat bunny bear frog chick penguin miw}; do
  "$BLENDER" -b -P "$name.py" -- "$name.glb" 2>&1 | grep -E "Error|wrote"
done
