#!/bin/sh
# Rebuild every .glb from its Blender script:  sh models/build.sh [cat cottage ...]
# Characters each have their own script; the town's buildings all come from town.py.
cd "$(dirname "$0")"
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
CHARACTERS="cat bunny bear frog chick penguin miw"
BUILDINGS="cottage tower studio library factory postoffice clinic cafe cathome"
for name in ${@:-$CHARACTERS $BUILDINGS}; do
  script=$name.py
  case " $BUILDINGS " in *" $name "*) script=town.py ;; esac
  "$BLENDER" -b -P "$script" -- "$name.glb" 2>&1 | grep -E "Error|wrote"
done
