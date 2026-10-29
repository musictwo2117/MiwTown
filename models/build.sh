#!/bin/sh
# Rebuild every .glb from its Blender script:  sh models/build.sh [cat cottage ...]
# Characters each have their own script; the town's buildings all come from town.py, the Cat Room's furniture from room.py.
cd "$(dirname "$0")"
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
CHARACTERS="cat bunny bear frog chick penguin miw"
BUILDINGS="cottage tower studio library factory postoffice clinic cafe cathome"
FURNITURE="bookshelf whiteboard routertable serverrack desk sofa floorlamp cornerplant catbed kitchen fridge diningtable bathtub toilet washbasin bed nightstand wardrobe planters balconyplants beanbags"
for name in ${@:-$CHARACTERS $BUILDINGS $FURNITURE}; do
  script=$name.py
  case " $BUILDINGS " in *" $name "*) script=town.py ;; esac
  case " $FURNITURE " in *" $name "*) script=room.py ;; esac
  "$BLENDER" -b -P "$script" -- "$name.glb" 2>&1 | grep -E "Error|wrote"
done
