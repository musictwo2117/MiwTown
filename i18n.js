// Cheesecake Rush: Thai translation. Everything the game and home.js put on screen is written in English; when the language is Thai
// this watches the page and swaps each piece of text (and each title tooltip) for its Thai version, so the game's own code
// never needs to know about languages. Add a line to S (any text), X (a whole text on its own) or R (a pattern with numbers) for new strings.
(() => {
  // literal pieces of text, replaced wherever they appear (longest first)
  const S = [
    // the desserts and the friends
    ['Strawberry Cheesecake', 'ชีสเค้กสตรอว์เบอร์รี่'], ['Strawberry Donut', 'โดนัทสตรอว์เบอร์รี่'], ['Kitty Cupcake', 'คัพเค้กแมวเหมียว'], ['Pretzel Cake', 'เค้กคาราเมลเพรทเซล'],
    ['loves the ', 'ชอบ'], ['loves cheesecake', 'ชอบชีสเค้ก'], ['tips big', 'ทิปเยอะ'], ['always orders two', 'สั่งสองอย่างเสมอ'], ['in a hurry', 'ใจร้อน'], ['happy to wait', 'รอได้สบาย ๆ'],
    // the HUD, toasts and popups
    ['One thing at a time! 🙈', 'ทีละอย่างนะ! 🙈'], ['Hands full! Serve something first 🙌', 'มือเต็มแล้ว! เสิร์ฟก่อนนะ 🙌'],
    ['just sold out! Tap its plate to bake more 🍳', 'เพิ่งหมด! แตะป้ายเพื่ออบเพิ่ม 🍳'], ['Nobody is waiting to pay yet 💤', 'ยังไม่มีใครรอจ่ายเงิน 💤'],
    ['Back to work! 💪', 'กลับไปทำงาน! 💪'], ['⏰ Time to open!', '⏰ ได้เวลาเปิดร้านแล้ว!'], ['🔔 Last orders! Serve the friends still here', '🔔 ออเดอร์สุดท้าย! เสิร์ฟเพื่อนที่ยังอยู่ให้ครบนะ'],
    ['New on the menu: ', 'เมนูใหม่: '], ['💗 favorite!', '💗 ของโปรด!'], ['💢 too slow…', '💢 ช้าไป…'], ['💢 left without paying', '💢 เดินหนีไม่จ่ายเงิน'], ['Thank you! 💗', 'ขอบคุณค่ะ! 💗'],
    ['Nothing baked yet. Open anyway?', 'ยังไม่ได้อบอะไรเลย เปิดร้านเลยไหม?'], ['All saves deleted', 'ลบเซฟทั้งหมดแล้ว'],
    ['Your change', 'เงินทอน'], ['↺ clear', '↺ ล้าง'], ['Give change ✓', 'ทอนเงิน ✓'], ['💰 cashier', '💰 แคชเชียร์'], [' (tap to put back)', ' (แตะเพื่อวางคืน)'],
    // the kitchen
    ['Kitchen · ', 'ห้องครัว · '], [' ran out!', ' หมดแล้ว!'], ['The shop is paused. Bake a quick extra batch, then get back to your friends.', 'ร้านหยุดพักอยู่ อบเพิ่มอีกสักชุดแล้วกลับไปหาเพื่อน ๆ'],
    ['Back to the shop →', 'กลับไปที่ร้าน →'], ['Open the shop →', 'เปิดร้าน →'], ['Pick a dessert to bake', 'เลือกขนมที่จะอบ'], ['Drag the ingredients into the bowl!', 'ลากวัตถุดิบลงชาม!'],
    ['Stir in circles around the bowl!', 'วนมือตีแป้งรอบชาม!'], ['or tap here to stir', 'หรือแตะตรงนี้เพื่อตี'], ['Take it out when the marker is in the green!', 'เอาออกตอนตัวชี้อยู่ในโซนเขียว!'],
    ['Take out!', 'เอาออก!'], ['Tap the cake to place toppings!', 'แตะที่เค้กเพื่อวางท็อปปิ้ง!'], ['Pick the next one!', 'เลือกอย่างถัดไปเลย!'], ['Not bad!', 'ไม่เลวเลย!'], ['Yummy!', 'อร่อย!'], ['Perfect!', 'สมบูรณ์แบบ!'],
    ['Shop closed! 🎉', 'ปิดร้านแล้ว! 🎉'], ['Not quite… 🥺', 'ยังไม่ถึงเป้า… 🥺'],
    // the home screen
    ['a cozy shop in Miw\'s Town', 'ร้านขนมแสนอบอุ่นในเมืองของมิว'], ['▶ Play', '▶ เล่น'], ['🍓 How to play', '🍓 วิธีเล่น'], ['⚙ Settings', '⚙ ตั้งค่า'], ['💖 Credits', '💖 เครดิต'], ['🥨 Back to the town', '🥨 กลับไปที่เมือง'],
    ['v0.1 · saved on this device', 'v0.1 · เซฟไว้ในเครื่องนี้'], ['⏸ Paused', '⏸ หยุดพัก'], ['▶ Resume', '▶ เล่นต่อ'], ['💾 Save & quit to title', '💾 เซฟแล้วกลับหน้าแรก'], ['💾 Choose a save', '💾 เลือกช่องเซฟ'],
    ['Start a new shop', 'เริ่มร้านใหม่'], ['← Back', '← กลับ'], ['🗑 Delete all saves', '🗑 ลบเซฟทั้งหมด'], ['Tap again to delete every save', 'แตะอีกครั้งเพื่อลบเซฟทั้งหมด'],
    ['Simple turns off the sparkles, the dark edges and the blur, which helps on slower devices.', 'โหมดเรียบง่ายจะปิดประกาย ขอบมืด และเบลอ ช่วยให้เครื่องช้าเล่นลื่นขึ้น'],
    ['🍓 How to play', '🍓 วิธีเล่น'], ['1. Bake.', '1. อบขนม'], ['2. Serve.', '2. เสิร์ฟ'], ['3. Cash up.', '3. คิดเงิน'],
    ['Before opening, make desserts in the kitchen: drag the ingredients in, stir in circles, bake, then place toppings. Better baking sells for more.', 'ก่อนเปิดร้านให้ทำขนมในห้องครัว: ลากวัตถุดิบลงชาม วนมือตีแป้ง อบ แล้ววางท็อปปิ้ง อบดีเท่าไรก็ขายได้แพงเท่านั้น'],
    ['Tap a dessert on the counter to pick it up (two at a time), then tap a friend\'s table. Quick service earns bigger tips.', 'แตะขนมที่เคาน์เตอร์เพื่อหยิบ (ถือได้ทีละ 2 ชิ้น) แล้วแตะโต๊ะของเพื่อน บริการไวได้ทิปเยอะ'],
    ['When they\'ve eaten, friends queue at the cashier: tap the register and give the right change.', 'พอกินเสร็จ เพื่อน ๆ จะไปต่อคิวที่แคชเชียร์ แตะเครื่องคิดเงินแล้วทอนเงินให้ถูกต้อง'],
    ['Cheesecake Rush, a cozy game from Miw\'s Town. Made by Miw, built together with Claude Code.', 'Cheesecake Rush เกมสบาย ๆ จากเมืองของมิว ทำโดยมิว สร้างร่วมกับ Claude Code'],
    ['The friends, the desserts and the little props were sculpted in Blender, from Python scripts.', 'เพื่อน ๆ ขนม และของตกแต่งชิ้นเล็ก ๆ ปั้นใน Blender ด้วยสคริปต์ Python'],
    ['three.js, running right in your browser.', 'three.js ทำงานตรง ๆ ในเบราว์เซอร์ของคุณ'], ['Fredoka and Nunito, from Google Fonts.', 'Fredoka, Nunito และ Mali จาก Google Fonts'],
    ['The little blips are made live with the Web Audio API.', 'เสียงเล็ก ๆ ทุกเสียงสร้างสดด้วย Web Audio API'], ['For stopping by the shop. Come back soon! 🍰', 'ที่แวะมาที่ร้านนะ มาอีกนะ! 🍰'],
    // drinks, strawberries from the garden, the calculator at the cashier
    ['Pink Milk Tea', 'ชานมชมพู'], ['Marshmallow Cocoa', 'โกโก้มาร์ชเมลโลว์'], ['Lemon Soda', 'เลมอนโซดา'],
    ['No ripe strawberries yet… they grow back soon 🌱', 'ยังไม่มีสตรอว์เบอร์รี่สุก… เดี๋ยวก็งอกใหม่ 🌱'],
    ['🍓 No strawberries left! Pick some from the garden first', '🍓 สตรอว์เบอร์รี่หมดแล้ว! ไปเก็บจากสวนก่อนนะ'],
    ['🍓 Out of strawberries! Tap the garden to pick more', '🍓 สตรอว์เบอร์รี่หมด! แตะที่สวนเพื่อเก็บเพิ่ม'], ['Pick from the garden', 'เก็บจากสวน'],
    ['Still deciding… 💭', 'ยังเลือกอยู่… 💭'], ['Tray is full! Serve someone first 🙌', 'ถาดเต็มแล้ว! เสิร์ฟให้ใครก่อนนะ 🙌'], ['Tray is full! Serve something first 🙌', 'ถาดเต็มแล้ว! เสิร์ฟก่อนนะ 🙌'],
    ['Thanks 🙂', 'ขอบคุณ 🙂'], ['So fast! 💗', 'เร็วจัง! 💗'], ['Key in the change', 'กดตัวเลขเงินทอน'], ['Scan their code!', 'สแกนโค้ดของเขา!'],
    ['Exact money, nothing to give back', 'จ่ายพอดี ไม่ต้องทอน'], ['Enter ✓', 'ยืนยัน ✓'], ['Scan ✓', 'สแกน ✓'], ['Take ✓', 'รับเงิน ✓'], ['🧾 BILL', '🧾 บิล'], ['PAID', 'ยื่นมา'],
  ];
  // texts that are a whole piece of text on their own (short words that must not match inside others)
  const X = {
    HANDS: 'มือ', closing: 'ปิดร้าน', Sound: 'เสียง', 'Back to the town': 'กลับไปที่เมือง', Menu: 'เมนู', later: 'ไว้ก่อน', 'sold out': 'หมดแล้ว', Empty: 'ว่าง',
    Strawberry: 'สตรอว์เบอร์รี่', CHANGE: 'เงินทอน', Egg: 'ไข่', Flour: 'แป้ง', 'Cream cheese': 'ครีมชีส', 'Cookie crust': 'ฐานคุกกี้', Milk: 'นม', Butter: 'เนย', Chocolate: 'ช็อกโกแลต', Pretzel: 'เพรทเซล',
    coins: 'เหรียญ', 'happy friends': 'เพื่อนที่อิ่มสุข', 'left hungry': 'เพื่อนที่หิวกลับไป',
    Continue: 'เล่นต่อ', 'New game': 'เริ่มเกมใหม่', Volume: 'ระดับเสียง', 'Visual effects': 'เอฟเฟกต์ภาพ', Camera: 'มุมกล้อง', Language: 'ภาษา',
    On: 'เปิด', Off: 'ปิด', Fancy: 'สวยงาม', Simple: 'เรียบง่าย', Low: 'ต่ำ', Mid: 'กลาง', High: 'สูง', Credits: 'เครดิต', Settings: 'ตั้งค่า',
    GAME: 'เกม', '3D MODELS': 'โมเดล 3 มิติ', ENGINE: 'เอนจิน', FONTS: 'ฟอนต์', SOUND: 'เสียง', THANKS: 'ขอบคุณ', 'Sure?': 'แน่ใจนะ?',
  };
  // patterns with numbers in them, tried in order (the specific ones first)
  const R = [
    [/Not enough! Short by (\d+) 🙅/g, 'ไม่พอ! ขาดไป $1 🙅'], [/Too much! (\d+) too many 🙅/g, 'เกินไป! เกินมา $1 🙅'], [/\((\d+) ripe\)/g, '(สุก $1 ลูก)'],
    [/Day (\d+): earn (\d+)/g, 'วันที่ $1: หาให้ได้ $2'], [/Open day (\d+) →/g, 'เปิดร้านวันที่ $1 →'], [/Try day (\d+) again/g, 'ลองวันที่ $1 อีกครั้ง'], [/Replay day (\d+)/g, 'เล่นวันที่ $1 ซ้ำ'],
    [/Continue day (\d+) →/g, 'เล่นวันที่ $1 ต่อ →'], [/opens on day (\d+)/g, 'เปิดวันที่ $1'], [/Opens on day (\d+)/g, 'เปิดวันที่ $1'], [/Day (\d+) · goal (\d+)/g, 'วันที่ $1 · เป้า $2'],
    [/\bDay (\d+)\b/g, 'วันที่ $1'], [/\bday (\d+)\b/g, 'วันที่ $1'], [/Combo ×(\d+)/g, 'คอมโบ ×$1'], [/\bBill (\d+)/g, 'ยอดรวม $1'], [/hands you (\d+)/g, 'ยื่นเงินให้ $1'],
    [/Short by (\d+)!/g, 'ทอนขาดไป $1!'], [/Too much! -(\d+)/g, 'ทอนเกิน! -$1'], [/💰 pay ×(\d+)/g, '💰 จ่ายเงิน ×$1'], [/\bwants /g, 'อยากได้ '], [/\bsold out\b/g, 'หมดแล้ว'],
    [/Bake desserts before you open\. Each batch makes (\d+); the better you bake, the more each one sells for\. What's left over keeps\./g, 'อบขนมก่อนเปิดร้านนะ แต่ละชุดได้ $1 ชิ้น อบดีเท่าไรก็ขายได้แพงเท่านั้น ที่เหลือเก็บไว้ใช้วันต่อไปได้'],
    [/⭐ best day (\d+) · 🪙 (\d+) earned/g, '⭐ วันที่ดีที่สุด $1 · 🪙 หาได้ $2'],
  ];
  const sorted = S.slice().sort((a, b) => b[0].length - a[0].length);
  const tr = s => {
    if (!/[A-Za-z]/.test(s)) return s;
    const t = s.trim();
    if (X[t] !== undefined) return s.replace(t, X[t]);
    let out = s;
    for (const [en, th] of sorted) if (out.includes(en)) out = out.split(en).join(th);
    for (const [re, th] of R) out = out.replace(re, th);
    return out;
  };

  let lang = 'en';
  const fixText = n => {
    if (n.__tr !== undefined && n.__tr === n.data) return;   // already ours
    const en = n.data, th = tr(en);
    n.__en = en; n.__tr = th;
    if (th !== en) n.data = th;
  };
  const fixTitle = el => {
    const cur = el.getAttribute && el.getAttribute('title');
    if (!cur || el.__trTitle === cur) return;
    const th = tr(cur); el.__enTitle = cur; el.__trTitle = th;
    if (th !== cur) el.setAttribute('title', th);
  };
  const walk = root => {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1) return;
    fixTitle(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? fixText(n) : fixTitle(n);
  };
  const restore = () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3 && n.__en !== undefined && n.data === n.__tr) { n.data = n.__en; n.__tr = undefined; }
      else if (n.nodeType === 1 && n.__enTitle !== undefined && n.getAttribute('title') === n.__trTitle) { n.setAttribute('title', n.__enTitle); n.__trTitle = undefined; }
    }
  };
  new MutationObserver(muts => {
    if (lang !== 'th') return;
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') fixText(m.target);
      else fixTitle(m.target);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title'] });

  // Thai needs a font with Thai letters: a round, friendly one that goes with the game
  const font = document.createElement('style');
  font.textContent = `html.th *{font-family:'Mali','Fredoka','Nunito',sans-serif !important}html.th .hlogo{font-family:'Fredoka',sans-serif !important}html.th .hlogo i{font-family:system-ui !important}`;
  document.head.appendChild(font);
  let fontLoaded = false;
  window.I18N = {
    get lang() { return lang; },
    guess() { return (navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en'; },
    set(next) {
      if (next === lang) return;
      lang = next;
      document.documentElement.lang = next;
      document.documentElement.classList.toggle('th', next === 'th');
      if (next === 'th') {
        if (!fontLoaded) { fontLoaded = true; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Mali:wght@400;600&display=swap'; document.head.appendChild(l); }
        walk(document.body);
      } else restore();
    },
  };
})();
