// Copies a rendered square clip (video/out/<clip>/<clip>.mp4, with its soundtrack) into public/ for Remotion:
// `node prepare.js` for the intro loop, `node prepare.js rush` for the Cheesecake Rush promo.
const fs = require('fs'), path = require('path');
const clip = process.argv[2] || 'intro';
const src = path.join(__dirname, '..', 'out', clip, clip + '.mp4');
if (!fs.existsSync(src)) { console.error(`Render the clip first: open http://localhost:19200/${clip === 'intro' ? '' : clip}?capture and ?audio, then sh video/encode.sh ${clip}`); process.exit(1); }
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.copyFileSync(src, path.join(__dirname, 'public', clip + '.mp4'));
