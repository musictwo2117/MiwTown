// Copies the rendered square loop (video/out/intro/intro.mp4, with its soundtrack) into public/ for Remotion.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'out', 'intro', 'intro.mp4');
if (!fs.existsSync(src)) { console.error('Render the loop first: open http://localhost:19200/?capture and ?audio, then sh video/encode.sh intro'); process.exit(1); }
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.copyFileSync(src, path.join(__dirname, 'public', 'intro.mp4'));
