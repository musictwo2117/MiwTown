# 🥨 Miw's Town

A cozy, pastel 3D town that shows what your Claude Code agents are doing, live, plus a café game built on the same little characters.

Each Claude Code session moves in as a character. It walks to the Library when it reads files, sits in the Writing Studio when it edits, and ends up at the Bug Clinic when something fails. When it's done it heads home to rest, swim or grab a pretzel.

![Miw's Town: a floating pastel island with a rainbow road, a giant pretzel fountain, themed buildings, waterfalls and a pool islet](docs/town.jpg)

## What's inside

| Page | What it is |
|---|---|
| **Town** (`/town`) | A floating island with one building per state, a pool, a café, waterfalls and the 🐱 Cat Home |
| **Cat Room** (`/room`) | The same agents indoors: living room, kitchen, bathroom, bedroom and a plant balcony |
| **Cheesecake Rush** (`/game`) | A café game: bake, serve, give change and decorate the café (see below) |

Two halves share the same characters: the **agent town** (Town and Cat Room, below) shows your Claude Code agents live, and **Cheesecake Rush** is a game you can [play on its own](#play-it).

## Watch your agents in the town

### Quick start

You need [Node.js](https://nodejs.org) 18+ (no `npm install`, there are no dependencies), [Claude Code](https://claude.com/claude-code) logged in on the same machine, and a browser with WebGL.

1. Run `node agent/server.js` and open http://127.0.0.1:19100.
2. Add the hooks from `agent/claude-settings-snippet.json` to `~/.claude/settings.json`, with `/path/to/MiwTown` replaced by this folder (use the full path to `node` if hooks can't find it).
3. Start a Claude Code session anywhere. A new friend moves into town. 🎉

The hook gives up after 800 ms, so Claude Code is never slowed down when the town isn't running. Without the server, the page plays a demo with made-up agents.

### The town and the cat room

Each state an agent can be in has its own spot:

| State | Town | Cat Room |
|---|---|---|
| 💤 Resting | Cozy Cottage, pool, Pretzel Café | Sofa, kitchen, bath, bed, balcony |
| 💭 Thinking | Thinking Tower | Whiteboard |
| ✏️ Writing | Writing Studio | Desk |
| 📚 Researching | Library | Bookshelf |
| ⚙️ Running | Code Factory | Server rack |
| 📮 Syncing | Post Office | Router nook |
| 🐞 Stuck | Bug Clinic | Bug rug |

<img src="docs/room.jpg" alt="The Cat Room: a cozy floating home with a living room, kitchen, bathroom, bedroom and plant balcony, with agents resting inside" width="640">

### What you can do

- **Send tasks.** ✨ New task starts a headless Claude Code run in a folder you pick, or messages an existing agent in a fork (your open window isn't touched). Tasks can only read and edit files in that folder.
- **Play with your agents.** Tap one to pet it, rename it or change its look (cat, bunny, bear, frog, chick, penguin or Miw), and see its 3D portrait, today's timeline and recent activity.
- **Get alerts.** A card pops up when a friend is stuck, waiting for you or done. The tab title counts who needs you, and 🔔 adds desktop notifications.
- **Level up.** Agents earn XP and unlock a bow, scarf, flower crown, party hat and crown (Lv 2, 3, 5, 7, 10).
- **Look around.** 🎯 Follow a friend, 📸 save a photo, and hide 🏷️ names, 💬 bubbles or 🏠 place labels. Tap any building or room to see who's there.
- **Real Bangkok time and weather.** Day and night follow Thai time, and the sky follows the real weather from [Open-Meteo](https://open-meteo.com). Try `?hour=21` or `?weather=rain` (`clear`, `cloudy`, `rain`, `storm`).

## Cheesecake Rush 🍓

Friends sit down and order desserts and drinks; you play the café (`/game`, or 🍰 in the town's toolbar).

### Play it

You don't need Claude or an account, and nothing to install beyond Node.js or Python. Clone the repo and serve the folder (opening `game/game.html` by double-click won't work: browsers block the 3D models when a page is opened as a file).

```bash
git clone https://github.com/musictwo2117/MiwTown.git
cd MiwTown
node serve.js
```

Then open http://127.0.0.1:19100/game. Run it from the repo folder (`serve.js` just starts `agent/server.js`, the one server behind the town and the game). If it stops with `EADDRINUSE`, a copy of the server is already running on that port: just open the link above, or stop the old one first (`lsof -ti :19100 | xargs kill`), or pick another port with `AGENT_OFFICE_PORT=19200 node serve.js` and open http://127.0.0.1:19200/game. (The links use `127.0.0.1` rather than `localhost` because the server listens on IPv4 only, and some browsers try `localhost` over IPv6 first and show "refused to connect".) No Node.js? Python works too: run `python3 -m http.server 19101` and open http://127.0.0.1:19101/game/game.html. You need a browser with WebGL, and your saves stay in that browser. The game switches to Thai (ไทย) in Settings.

### How it plays

1. **Bake.** Every dessert is cooked step by step in a 3D kitchen, Cooking Mama style: crush, press, pour and bake a cheesecake, knead, roll, fry and glaze donuts, pipe macarons, cook pancakes on a griddle, frost cupcakes. Time it badly and the batch is ruined; bake well and it sells for more.
2. **Serve.** Tap desserts onto Miw's tray (up to four), or tap a table and Miw fetches the whole order. Quick service earns bigger tips.
3. **Cash up.** Friends pay with a note, exact money or QR. Read the bill on the shop till and key in the right change on the first try to earn the tip and keep your combo going.

Each day has a goal, unlocks more tables, desserts and drinks, and gives one to three stars. You keep the coins you earn and spend them in the **Shop**, open between days or from the corner button: new recipes (kitty cupcake, pretzel cake, strawberry pancakes, strawberry macarons) and drinks, a bigger display case for the counter, and decor for six spots in the café. A few pieces come with a perk, like a floor lamp for bigger tips or bean bags for more patient friends. Turn, tilt and zoom the camera round the café, and switch the music on or off. There are three save slots in the browser.

<p>
<img src="docs/game-cafe.jpg" alt="The café on day 4: friends at tables with their orders, six desserts on the counter, a stock list on the left, and a plant, floor lamp and bean bags as decor" width="49%">
<img src="docs/game-cashier.jpg" alt="The shop till in soft pastel colours: a pink receipt listing a pretzel cake and a pink milk tea for 20, and a yellow keypad with 50 paid and 30 keyed in as change" width="49%">
</p>

![Three kitchen steps: wooden mallet crushing cookies, a cheesecake glowing inside the oven, and six donuts frying in an iron pan](docs/game-kitchen.jpg)

![The Shop: the Recipes tab with kitty cupcake and marshmallow cocoa owned and other recipes for sale, and the Decor tab with a potted plant, floor lamp and café sign placed](docs/game-shop.jpg)

## Sculpted in Blender

Every character, building, piece of furniture, prop, dessert and icon is modelled from a Python script in `shared/models/` and exported as a `.glb`. They're little vinyl toys: big round heads, bead eyes, rosy cheeks, bevelled edges and a soft shadow baked into each vertex. The six animal friends each hold a slice of strawberry cheesecake, and Miw herself has long dark hair with blunt bangs, round gold glasses, a big yellow sweater, brown shorts, sneakers and a little backpack. Characters have walk, idle, ear-twitch and blink animations. The pages draw simple built-in shapes first and swap each model in as it loads.

![The seven characters: a cat, a bunny, a bear, a frog, a chick and a penguin, each holding a slice of strawberry cheesecake, and Miw with long dark hair, round gold glasses and a yellow sweater](docs/characters.jpg)

<p>
<img src="docs/buildings.jpg" alt="The town's nine buildings" width="49%">
<img src="docs/furniture.jpg" alt="The Cat Room's furniture" width="49%">
<img src="docs/props.jpg" alt="Trees, a flower and a lamp post" width="49%">
</p>

![The game's six desserts: a cheesecake slice, a pretzel cake slice, a kitty cupcake, a donut, a stack of strawberry pancakes and strawberry macarons](docs/menu.jpg)

To change a model, edit its script and rebuild (tested with Blender 5.1; set `BLENDER` if it isn't in `/Applications`):

```bash
sh shared/models/build.sh            # everything
sh shared/models/build.sh cat cafe   # just these
```

## Reference

**Configuration.** `AGENT_OFFICE_PORT` (default `19100`) sets the port for the server and the hook. `CLAUDE_BIN` (default `~/.local/bin/claude` or `claude`) is the binary used for tasks.

**Security.** The server listens on `127.0.0.1` only. Only the hook can report state (JSON with no `Origin` header), starting tasks needs a token made fresh each run, other host names are refused to block DNS rebinding, task folders must be inside your home folder, and at most 3 tasks run at once for up to 30 minutes each.

**Files.**

| File | What's in it |
|---|---|
| `agent/` | Miw's Town: `server.js` (state, tasks, weather, pages), `hook.js` (the Claude Code hook), `town.*` and `room.*` (page, styles, script) and `panel.js` (the shared panel) |
| `game/` | Cheesecake Rush: `game.html`, `game.css`, `game.js`, `kitchen.js`, `days.js`, `home.js`, `icons.js` and `i18n.js` (its Thai translation) |
| `shared/` | What both use: `scenery.js` and `models.js` (3D scenery, model loader and animations), `vendor/` (three.js r128, kept here so the pages work offline) and `models/` (Blender scripts, the `.glb` files they make, `build.sh`, and `optimize.py`) |
| `docs/` | The pictures in this README |
| `tools/video/` | Code-made promo clips and their capture and encoding tools |

Built with [three.js](https://threejs.org) r128.

The game's background music is ["Slow Stride"](https://opengameart.org/content/slow-stride) by isaiah658, released as CC0 (public domain) on OpenGameArt.org. It lives in `game/music/` as `.ogg` and `.mp3`; the sound effects are made live with the Web Audio API.
