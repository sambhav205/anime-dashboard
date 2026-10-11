/**
 * anime.js — Aesthetic Anime Experience Engine
 *
 * Features:
 *  1. Daily rotating famous anime legends (Gojo, Zoro, Luffy, Naruto, Levi, Tanjiro, Ichigo)
 *  2. Cinematic dark aesthetic with dynamic character color palettes & themes
 *  3. Ambient aesthetic particle canvas (ethereal ember & stardust atmosphere)
 *  4. Minimalist aesthetic feedback on task completion (Domain Expansion, Breathing Focus)
 *  5. Resonant ambient chime via Web Audio API (zero cartoon sound, pure aesthetic bell)
 *  6. Power Level & Mastery Rank analytics
 *  7. Manual cycle option so user can preview any legend at will
 */

(function(window) {
  'use strict';

  const ANIME_KEY = 'dt_anime_theme';
  const OVERRIDE_CHAR_KEY = 'dt_anime_override_char';
  const SOUND_KEY = 'dt_anime_sound';

  // ── 7 Famous Aesthetic Anime Legends (Rotates Daily) ─────────────────
  const LEGENDS = [
    {
      id: 'ichigo',
      day: 0, // Sunday
      name: 'Ichigo Kurosaki',
      series: 'Bleach: Thousand-Year Blood War',
      title: 'SUBSTITUTE SOUL REAPER',
      kanji: '卍解 · 天鎖斬月',
      auraTitle: 'True Bankai Reiatsu',
      image: 'assets/hero-ichigo.jpg',
      accent: '#f43f5e', // Crimson
      secondary: '#38bdf8', // Spirit Blue
      glow: 'rgba(244, 63, 94, 0.4)',
      bgTint: 'rgba(244, 63, 94, 0.08)',
      quote: '“If fate is a millstone, then we are the grist. There is nothing we can do but sharpen our blades.”',
      quoteAuthor: 'Ichigo Kurosaki (Bleach)',
      streakTitle: 'Bankai Spiritual Pressure',
      ranks: ['Soul Cadet', 'Seated Officer', 'Lieutenant', 'Squad Captain', 'Soul King Guard']
    },
    {
      id: 'gojo',
      day: 1, // Monday
      name: 'Satoru Gojo',
      series: 'Jujutsu Kaisen',
      title: 'THE HONORED ONE',
      kanji: '領域展開 · 無量空処',
      auraTitle: 'Limitless & Six Eyes',
      image: 'assets/hero-gojo.jpg',
      accent: '#00f0ff', // Electric Cyan
      secondary: '#a855f7', // Hollow Purple
      glow: 'rgba(0, 240, 255, 0.4)',
      bgTint: 'rgba(0, 240, 255, 0.08)',
      quote: '“Throughout heaven and earth, I alone am the honored one. Focus all your attention on your own mastery.”',
      quoteAuthor: 'Satoru Gojo (Jujutsu Kaisen)',
      streakTitle: 'Infinity Focus Aura',
      ranks: ['Grade 4 Sorcerer', 'Grade 2 Sorcerer', 'Semi-Grade 1', 'Grade 1 Sorcerer', 'Special Grade (特級)']
    },
    {
      id: 'zoro',
      day: 2, // Tuesday
      name: 'Roronoa Zoro',
      series: 'One Piece',
      title: 'KING OF HELL',
      kanji: '鬼気九刀流 · 閻魔',
      auraTitle: 'Enma Spirit Flames',
      image: 'assets/hero-zoro.jpg',
      accent: '#10b981', // Emerald Spirit Flame
      secondary: '#94a3b8', // Katana Steel
      glow: 'rgba(16, 185, 129, 0.4)',
      bgTint: 'rgba(16, 185, 129, 0.08)',
      quote: '“When the world shoves you around, you’ve just gotta stand up and shove back. A swordsman never looks back.”',
      quoteAuthor: 'Roronoa Zoro (One Piece)',
      streakTitle: 'Conqueror’s Enma Haki',
      ranks: ['Bounty Hunter', 'Supernova', 'Master Swordsman', 'Wano Champion', 'Greatest Swordsman']
    },
    {
      id: 'luffy',
      day: 3, // Wednesday
      name: 'Monkey D. Luffy',
      series: 'One Piece',
      title: 'WARRIOR OF LIBERATION',
      kanji: '太陽の神 · ニカ',
      auraTitle: 'Gear 5 Drums of Liberation',
      image: 'assets/hero-luffy.jpg',
      accent: '#f59e0b', // Solar Dawn Gold
      secondary: '#ef4444', // Emperor Crimson
      glow: 'rgba(245, 158, 11, 0.4)',
      bgTint: 'rgba(245, 158, 11, 0.08)',
      quote: '“I don’t want to conquer anything. I just want to be the most free person in the entire world.”',
      quoteAuthor: 'Monkey D. Luffy (One Piece)',
      streakTitle: 'JoyBoy Liberation Frequency',
      ranks: ['East Blue Novice', 'Grand Line Voyager', 'Warlord Defeater', 'Emperor (Yonko)', 'Pirate King']
    },
    {
      id: 'naruto',
      day: 4, // Thursday
      name: 'Naruto Uzumaki',
      series: 'Naruto Shippuden',
      title: 'SEVENTH HOKAGE',
      kanji: '仙法 · 六道仙人モード',
      auraTitle: 'Six Paths Sage Mode',
      image: 'assets/hero-naruto.jpg',
      accent: '#f97316', // Twilight Amber
      secondary: '#10b981', // Leaf Green
      glow: 'rgba(249, 115, 22, 0.4)',
      bgTint: 'rgba(249, 115, 22, 0.08)',
      quote: '“Hard work is worthless for those that don’t believe in themselves. Carry your will of fire every single day.”',
      quoteAuthor: 'Naruto Uzumaki (Naruto)',
      streakTitle: 'Sage Chakra Reservoir',
      ranks: ['Genin', 'Chunin', 'Jonin Specialist', 'Sage of Konoha', 'Hokage (火影)']
    },
    {
      id: 'levi',
      day: 5, // Friday
      name: 'Levi Ackerman',
      series: 'Attack on Titan',
      title: 'HUMANITY’S STRONGEST',
      kanji: '自由の翼 · 調査兵団',
      auraTitle: 'Wings of Freedom',
      image: 'assets/hero-levi.jpg',
      accent: '#14b8a6', // Survey Teal
      secondary: '#eab308', // Sunlight Gold
      glow: 'rgba(20, 184, 166, 0.4)',
      bgTint: 'rgba(20, 184, 166, 0.08)',
      quote: '“The only thing we are allowed to do is to believe that we won’t regret the choice we made. Execute without hesitation.”',
      quoteAuthor: 'Levi Ackerman (Attack on Titan)',
      streakTitle: 'Ackerman Awakening Resonance',
      ranks: ['Cadet', 'Garrison Soldier', 'Survey Corps Scout', 'Special Operations', 'Humanity’s Strongest']
    },
    {
      id: 'tanjiro',
      day: 6, // Saturday
      name: 'Tanjiro Kamado',
      series: 'Demon Slayer',
      title: 'SUN BREATHING MASTER',
      kanji: 'ヒノカミ神楽 · 碧羅の天',
      auraTitle: 'Hinokami Kagura Solar Flame',
      image: 'assets/hero-tanjiro.jpg',
      accent: '#ef4444', // Solar Flame Red
      secondary: '#10b981', // Checkered Green
      glow: 'rgba(239, 68, 68, 0.4)',
      bgTint: 'rgba(239, 68, 68, 0.08)',
      quote: '“No matter how weak or unworthy you feel, set your heart ablaze. Overcome yourself, and keep moving forward.”',
      quoteAuthor: 'Tanjiro Kamado (Demon Slayer)',
      streakTitle: 'Total Concentration: Constant',
      ranks: ['Mizunoto', 'Kanoe', 'Tsuchinoto', 'Kinoe', 'Sun Pillar (日柱)']
    }
  ];

  // A much broader rotation keeps the feature feeling like a daily nudge, not a
  // seven-card collection. New portraits are resolved only when that character
  // is shown, so the dashboard never has to load dozens of images at once.
  const addLegend = (id, name, series, quote, accent, portraitQuery) => ({
    id, name, series, quote: `“${quote}”`, quoteAuthor: `${name} (${series})`,
    title: 'DAILY FOCUS', kanji: '集中 · 前進', auraTitle: 'Keep Moving Forward',
    image: '', portraitQuery, accent, secondary: '#94a3b8',
    glow: `${accent}66`, bgTint: `${accent}16`,
    streakTitle: 'Consistency Focus', ranks: ['Begin', 'Steady', 'Focused', 'Relentless', 'Unstoppable']
  });
  LEGENDS.push(
    addLegend('asta', 'Asta', 'Black Clover', 'My magic is never giving up.', '#22c55e', 'Asta Black Clover'),
    addLegend('yami', 'Yami Sukehiro', 'Black Clover', 'Surpass your limits. Right here, right now.', '#a78bfa', 'Yami Sukehiro Black Clover'),
    addLegend('thorfinn', 'Thorfinn', 'Vinland Saga', 'You have no enemies.', '#f59e0b', 'Thorfinn Vinland Saga'),
    addLegend('eren', 'Eren Yeager', 'Attack on Titan', 'If you win, you live. If you lose, you die.', '#84cc16', 'Eren Yeager Attack on Titan'),
    addLegend('goku', 'Goku', 'Dragon Ball Super', 'Power comes in response to a need, not a desire.', '#fb923c', 'Goku Dragon Ball Super'),
    addLegend('vegeta', 'Vegeta', 'Dragon Ball Super', 'Push through the pain. Giving up hurts more.', '#6366f1', 'Vegeta Dragon Ball Super'),
    addLegend('light', 'Light Yagami', 'Death Note', 'You cannot ever win if you are always on the defensive.', '#e5e7eb', 'Light Yagami Death Note'),
    addLegend('l-lawliet', 'L', 'Death Note', 'Being alone is better than being with the wrong person.', '#cbd5e1', 'L Lawliet Death Note'),
    addLegend('saitama', 'Saitama', 'One-Punch Man', 'The true power of human beings is that we can change ourselves.', '#facc15', 'Saitama One Punch Man'),
    addLegend('genos', 'Genos', 'One-Punch Man', 'It is not about whether you can; it is about whether you will.', '#f59e0b', 'Genos One Punch Man'),
    addLegend('yuji', 'Yuji Itadori', 'Jujutsu Kaisen', 'I do not want to regret the way I lived.', '#f87171', 'Yuji Itadori Jujutsu Kaisen'),
    addLegend('megumi', 'Megumi Fushiguro', 'Jujutsu Kaisen', 'Start by saving the people in front of you.', '#60a5fa', 'Megumi Fushiguro Jujutsu Kaisen'),
    addLegend('kakashi', 'Kakashi Hatake', 'Naruto', 'The next generation will always surpass the previous one.', '#a78bfa', 'Kakashi Hatake Naruto'),
    addLegend('itachi', 'Itachi Uchiha', 'Naruto', 'People live their lives bound by what they accept as correct.', '#ef4444', 'Itachi Uchiha Naruto'),
    addLegend('rengoku', 'Kyojuro Rengoku', 'Demon Slayer', 'Set your heart ablaze.', '#fb7185', 'Kyojuro Rengoku Demon Slayer'),
    addLegend('midoriya', 'Izuku Midoriya', 'My Hero Academia', 'Dreams can become reality.', '#34d399', 'Izuku Midoriya My Hero Academia'),
    addLegend('all-might', 'All Might', 'My Hero Academia', 'The most important thing is to always smile.', '#facc15', 'All Might My Hero Academia'),
    addLegend('edward', 'Edward Elric', 'Fullmetal Alchemist', 'A lesson without pain is meaningless.', '#f97316', 'Edward Elric Fullmetal Alchemist'),
    addLegend('roy', 'Roy Mustang', 'Fullmetal Alchemist', 'Nothing is perfect, but the world is there for us.', '#ef4444', 'Roy Mustang Fullmetal Alchemist'),
    addLegend('hinata', 'Shoyo Hinata', 'Haikyu!!', 'Being weak means there is room to grow.', '#f97316', 'Shoyo Hinata Haikyu'),
    addLegend('erwin', 'Erwin Smith', 'Attack on Titan', 'The only way to win is to keep moving forward.', '#14b8a6', 'Erwin Smith Attack on Titan'),
    addLegend('kenma', 'Kenma Kozume', 'Haikyu!!', 'The future belongs to the people who keep trying.', '#facc15', 'Kenma Kozume Haikyu'),
    addLegend('kageyama', 'Tobio Kageyama', 'Haikyu!!', 'If you are going to hit it, hit it until it breaks.', '#60a5fa', 'Tobio Kageyama Haikyu'),
    addLegend('killua', 'Killua Zoldyck', 'Hunter x Hunter', 'Keep moving forward until you find what you are looking for.', '#a78bfa', 'Killua Zoldyck Hunter x Hunter'),
    addLegend('gon', 'Gon Freecss', 'Hunter x Hunter', 'You should enjoy the little detours. That is where you find the important things.', '#22c55e', 'Gon Freecss Hunter x Hunter'),
    addLegend('netero', 'Isaac Netero', 'Hunter x Hunter', 'You know nothing of the bottomless malice within the human heart.', '#f59e0b', 'Isaac Netero Hunter x Hunter'),
    addLegend('mob', 'Shigeo Kageyama', 'Mob Psycho 100', 'If everyone is not special, maybe you can be what you want to be.', '#a78bfa', 'Shigeo Kageyama Mob Psycho 100'),
    addLegend('reigen', 'Arataka Reigen', 'Mob Psycho 100', 'You are the main character of your own life.', '#38bdf8', 'Arataka Reigen Mob Psycho 100'),
    addLegend('senku', 'Senku Ishigami', 'Dr. Stone', 'The path to science is paved with failures.', '#22c55e', 'Senku Ishigami Dr Stone'),
    addLegend('boji', 'Bojji', 'Ranking of Kings', 'Even a small step forward is still progress.', '#fbbf24', 'Bojji Ranking of Kings'),
    addLegend('frieren', 'Frieren', 'Frieren: Beyond Journey’s End', 'The little moments are what make a journey worth remembering.', '#a5b4fc', 'Frieren Sousou no Frieren'),
    addLegend('maomao', 'Maomao', 'The Apothecary Diaries', 'Curiosity is a strength when you use it wisely.', '#34d399', 'Maomao Kusuriya no Hitorigoto'),
    addLegend('okabe', 'Rintaro Okabe', 'Steins;Gate', 'There is no end though there is a start in space.', '#f97316', 'Rintaro Okabe Steins Gate'),
    addLegend('simon', 'Simon', 'Gurren Lagann', 'Believe in the you that believes in yourself.', '#ef4444', 'Simon Gurren Lagann'),
    addLegend('kamina', 'Kamina', 'Gurren Lagann', 'Do not believe in yourself. Believe in the me that believes in you.', '#f97316', 'Kamina Gurren Lagann'),
    addLegend('spike', 'Spike Spiegel', 'Cowboy Bebop', 'Whatever happens, happens.', '#38bdf8', 'Spike Spiegel Cowboy Bebop'),
    addLegend('vash', 'Vash the Stampede', 'Trigun', 'The ticket to the future is always open.', '#facc15', 'Vash the Stampede Trigun'),
    addLegend('yato', 'Yato', 'Noragami', 'A small wish can become the reason to keep going.', '#60a5fa', 'Yato Noragami'),
    addLegend('subaru', 'Subaru Natsuki', 'Re:ZERO', 'Starting from zero is still a start.', '#f87171', 'Subaru Natsuki Re Zero'),
    addLegend('mugen', 'Mugen', 'Samurai Champloo', 'Keep walking your own path, even when it is rough.', '#f97316', 'Mugen Samurai Champloo'),
    addLegend('sakura', 'Sakura Haruno', 'Naruto', 'A person grows stronger when they have someone to protect.', '#f472b6', 'Sakura Haruno Naruto'),
    addLegend('jiraiya', 'Jiraiya', 'Naruto', 'A real ninja is one who endures no matter what gets thrown at him.', '#f97316', 'Jiraiya Naruto'),
    addLegend('gintoki', 'Gintoki Sakata', 'Gintama', 'The best way to live is to keep moving forward.', '#a5b4fc', 'Gintoki Sakata Gintama')
  );

  let _animeActive = true;
  let _soundActive = true;
  let _canvas = null;
  let _ctx = null;
  let _animId = null;
  let _particles = [];
  let _lastFrameTime = 0;
  let _activeLegendIndex = -1;

  // ── Legend Selection ─────────────────────────────────────────────────
  function getTodayLegend() {
    // Check manual override first
    const override = localStorage.getItem(OVERRIDE_CHAR_KEY);
    if (override) {
      const foundIdx = LEGENDS.findIndex(l => l.id === override);
      if (foundIdx !== -1) {
        _activeLegendIndex = foundIdx;
        return LEGENDS[foundIdx];
      }
    }

    // Default: rotates based on Day of Week (0 = Sunday ... 6 = Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    _activeLegendIndex = dayOfWeek;
    return LEGENDS[dayOfWeek];
  }

  function cycleNextLegend() {
    if (_activeLegendIndex === -1) getTodayLegend();
    _activeLegendIndex = (_activeLegendIndex + 1) % LEGENDS.length;
    const nextLegend = LEGENDS[_activeLegendIndex];
    localStorage.setItem(OVERRIDE_CHAR_KEY, nextLegend.id);
    applyAestheticTheme(nextLegend);
    if (typeof renderCurrentPage === 'function') {
      renderCurrentPage();
    }
    triggerAestheticToast(`Aura switched to ${nextLegend.name} (${nextLegend.series})`, nextLegend.accent);
    return nextLegend;
  }

  function resetToDailyLegend() {
    localStorage.removeItem(OVERRIDE_CHAR_KEY);
    const legend = getTodayLegend();
    applyAestheticTheme(legend);
    if (typeof renderCurrentPage === 'function') {
      renderCurrentPage();
    }
    return legend;
  }

  function applyAestheticTheme(legend) {
    if (!_animeActive) return;
    const root = document.documentElement;
    root.style.setProperty('--char-accent', legend.accent);
    root.style.setProperty('--char-glow', legend.glow);
    root.style.setProperty('--char-secondary', legend.secondary);
    root.style.setProperty('--char-tint', legend.bgTint);
  }

  // ── Power Level & Mastery Rank ───────────────────────────────────────
  function getAnimeRank(currentStreak = 0, completionRate = 0) {
    const legend = getTodayLegend();
    const score = (currentStreak * 2) + (completionRate * 10);
    let rankIndex = 0;
    if (score >= 60) rankIndex = 4;
    else if (score >= 35) rankIndex = 3;
    else if (score >= 20) rankIndex = 2;
    else if (score >= 10) rankIndex = 1;
    else rankIndex = 0;

    const rankName = legend.ranks[rankIndex];
    const tiers = ['C-TIER', 'B-TIER', 'A-TIER', 'S-TIER', 'SSS-PINNACLE'];

    return {
      tier: tiers[rankIndex],
      rankName: rankName,
      legendName: legend.name,
      series: legend.series,
      aura: legend.auraTitle,
      color: legend.accent,
      desc: `Mastery level within the realm of ${legend.series}. Your daily consistency fuels your inner ${legend.auraTitle}.`
    };
  }

  function getAnimePowerLevel(activities = [], entries = []) {
    const doneEntries = entries.filter(e => e.state === 'done');
    const partialEntries = entries.filter(e => e.state === 'partial');
    const level = 1200 + (activities.length * 250) + (doneEntries.length * 150) + (partialEntries.length * 75);
    return Math.min(99999, level);
  }

  // ── Resonant Aesthetic Web Audio Chime ────────────────────────────────
  function playAnimeSound(type = 'success') {
    if (!_animeActive || !_soundActive) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Pure aesthetic crystalline chime (meditative, resonant, elegant)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Fundamental and gentle harmonic overtone (A4 / E5 or C5 / G5)
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.frequency.setValueAtTime(880.00, now); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    } catch (e) {}
  }

  // ── Ambient Aesthetic Particle Canvas ────────────────────────────────
  function initCanvas() {
    _canvas = document.getElementById('anime-canvas');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    createParticles();
    startAnimationLoop();
  }

  function resizeCanvas() {
    if (!_canvas) return;
    _canvas.width = window.innerWidth;
    _canvas.height = window.innerHeight;
  }

  function createParticles() {
    _particles = [];
    if (!_animeActive) return;
    const isMobile = window.innerWidth < 640;
    const count = isMobile ? 24 : 45;
    const legend = getTodayLegend();

    for (let i = 0; i < count; i++) {
      _particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 1.0 + Math.random() * 2.2,
        speedY: -0.3 - Math.random() * 0.7, // gently rising ethereal embers
        speedX: (Math.random() - 0.5) * 0.4,
        alpha: 0.15 + Math.random() * 0.55,
        pulseSpeed: 0.01 + Math.random() * 0.02,
        pulseStep: Math.random() * Math.PI * 2,
        color: legend.accent
      });
    }
  }

  function startAnimationLoop() {
    if (_animId) cancelAnimationFrame(_animId);
    if (!_animeActive) {
      if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      return;
    }

    function loop(time) {
      if (!_animeActive) return;
      if (document.hidden) {
        _animId = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(32, time - (_lastFrameTime || time));
      _lastFrameTime = time;
      renderParticles(dt);
      _animId = requestAnimationFrame(loop);
    }

    _animId = requestAnimationFrame(loop);
  }

  function renderParticles() {
    if (!_ctx || !_canvas) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    const w = _canvas.width;
    const h = _canvas.height;
    const legend = getTodayLegend();

    for (let i = 0; i < _particles.length; i++) {
      const p = _particles[i];
      p.pulseStep += p.pulseSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.pulseStep) * 0.2;

      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulseStep));

      _ctx.save();
      _ctx.beginPath();
      _ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      _ctx.fillStyle = legend.accent;
      _ctx.globalAlpha = currentAlpha;
      _ctx.shadowBlur = 10;
      _ctx.shadowColor = legend.accent;
      _ctx.fill();
      _ctx.restore();
    }
  }

  // ── Hero Banner Live Aura FX (Lightning, Spirit Flames, Embers) ─────
  let _heroAnimId = null;
  let _heroCanvas = null;
  let _heroCtx = null;
  let _heroParticles = [];

  function mountHeroFX() {
    if (!_animeActive) return;
    if (_heroAnimId) {
      cancelAnimationFrame(_heroAnimId);
      _heroAnimId = null;
    }

    _heroCanvas = document.getElementById('hero-aura-canvas');
    if (!_heroCanvas) return;
    _heroCtx = _heroCanvas.getContext('2d');

    const rect = _heroCanvas.getBoundingClientRect();
    _heroCanvas.width = rect.width || 600;
    _heroCanvas.height = rect.height || 260;

    const legend = getTodayLegend();
    _heroParticles = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      _heroParticles.push({
        x: Math.random() * _heroCanvas.width,
        y: Math.random() * _heroCanvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -0.6 - Math.random() * 1.6,
        size: 1.2 + Math.random() * 2.8,
        life: Math.random(),
        maxLife: 0.6 + Math.random() * 0.4,
        color: Math.random() > 0.3 ? legend.accent : legend.secondary
      });
    }

    function heroLoop() {
      if (!_heroCanvas || !_heroCtx || !document.body.contains(_heroCanvas)) return;
      if (!_animeActive) {
        _heroCtx.clearRect(0, 0, _heroCanvas.width, _heroCanvas.height);
        return;
      }

      _heroCtx.clearRect(0, 0, _heroCanvas.width, _heroCanvas.height);
      const w = _heroCanvas.width;
      const h = _heroCanvas.height;
      const curLegend = getTodayLegend();

      for (let i = 0; i < _heroParticles.length; i++) {
        const p = _heroParticles[i];
        p.life += 0.015;
        p.x += p.vx;
        p.y += p.vy;

        if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > w + 10) {
          p.x = Math.random() * w;
          p.y = h + Math.random() * 10;
          p.life = 0;
          p.vx = (Math.random() - 0.5) * 1.5;
          p.vy = -0.8 - Math.random() * 1.8;
        }

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7;

        _heroCtx.save();
        _heroCtx.beginPath();
        _heroCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        _heroCtx.fillStyle = p.color;
        _heroCtx.globalAlpha = alpha;
        _heroCtx.shadowBlur = 12;
        _heroCtx.shadowColor = p.color;
        _heroCtx.fill();
        _heroCtx.restore();
      }

      // Lightning arc sparks for Gojo, Luffy, and Ichigo
      if ((curLegend.id === 'gojo' || curLegend.id === 'luffy' || curLegend.id === 'ichigo') && Math.random() < 0.12) {
        _heroCtx.save();
        _heroCtx.beginPath();
        const startX = Math.random() * w;
        const startY = Math.random() * h;
        _heroCtx.moveTo(startX, startY);
        let cx = startX;
        let cy = startY;
        for (let j = 0; j < 3; j++) {
          cx += (Math.random() - 0.5) * 35;
          cy += (Math.random() - 0.5) * 35;
          _heroCtx.lineTo(cx, cy);
        }
        _heroCtx.strokeStyle = curLegend.accent;
        _heroCtx.lineWidth = 1.5;
        _heroCtx.shadowBlur = 14;
        _heroCtx.shadowColor = curLegend.accent;
        _heroCtx.globalAlpha = 0.8;
        _heroCtx.stroke();
        _heroCtx.restore();
      }

      _heroAnimId = requestAnimationFrame(heroLoop);
    }

    _heroAnimId = requestAnimationFrame(heroLoop);
  }

  // ── Aesthetic Minimalist Action Toast ────────────────────────────────
  function triggerAestheticToast(text, color = null) {
    const legend = getTodayLegend();
    const activeColor = color || legend.accent;
    const el = document.createElement('div');
    el.className = 'aesthetic-action-toast';
    el.innerHTML = `
      <div class="aesthetic-toast-inner" style="border-color:${activeColor};box-shadow:0 8px 30px ${activeColor}33">
        <span class="aesthetic-toast-kanji">${legend.kanji.split('·')[0].trim()}</span>
        <div class="aesthetic-toast-content">
          <div class="aesthetic-toast-title" style="color:${activeColor}">${text}</div>
          <div class="aesthetic-toast-legend">${legend.name} · ${legend.title}</div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 400);
    }, 2400);
  }

  function triggerTaskCompleteEffect(x, y) {
    if (!_animeActive) return;
    playAnimeSound('success');
    const legend = getTodayLegend();

    // Subtle aesthetic ripple at click point
    if (x && y) {
      const ripple = document.createElement('div');
      ripple.className = 'aesthetic-click-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.borderColor = legend.accent;
      ripple.style.boxShadow = `0 0 20px ${legend.accent}`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    }

    triggerAestheticToast(`FOCUS DISCIPLINE EXECUTED ✦`, legend.accent);
  }

  // ── Aesthetic Victory Celebration ────────────────────────────────────
  function showAestheticCelebration() {
    if (!_animeActive) return;
    playAnimeSound('success');
    const legend = getTodayLegend();

    const modal = document.createElement('div');
    modal.className = 'aesthetic-celebrate-modal';
    modal.innerHTML = `
      <div class="aesthetic-celebrate-box" style="border-color:${legend.accent};box-shadow:0 0 50px ${legend.accent}44">
        <button class="aesthetic-celebrate-close" aria-label="Close">✕</button>
        <div class="aesthetic-celebrate-kanji">${legend.kanji}</div>
        <div class="aesthetic-celebrate-tag" style="color:${legend.accent}">✦ HARMONY ACHIEVED ✦</div>
        <h2 class="aesthetic-celebrate-name">${legend.name}</h2>
        <div class="aesthetic-celebrate-series">${legend.series}</div>
        <div class="aesthetic-celebrate-img-wrap">
          <img src="${legend.image}" alt="${legend.name}" class="aesthetic-celebrate-img" />
          <div class="aesthetic-celebrate-overlay"></div>
        </div>
        <div class="aesthetic-celebrate-quote">
          <p>${legend.quote}</p>
          <span style="color:${legend.accent}">— ${legend.quoteAuthor}</span>
        </div>
        <p class="aesthetic-celebrate-sub">Every scheduled discipline for today has been accomplished. Rest in tranquility.</p>
        <button class="aesthetic-celebrate-btn" id="aesthetic-celebrate-ok" style="background:${legend.accent}">
          CONTINUE FORWARD ✦
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      modal.classList.add('fade-out');
      setTimeout(() => modal.remove(), 350);
    };

    modal.querySelector('.aesthetic-celebrate-close').addEventListener('click', close);
    modal.querySelector('#aesthetic-celebrate-ok').addEventListener('click', close);
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
    });
  }

  // ── Toggle and Storage ───────────────────────────────────────────────
  function isAnimeEnabled() {
    return _animeActive;
  }

  function setAnimeTheme(enabled) {
    _animeActive = Boolean(enabled);
    localStorage.setItem(ANIME_KEY, _animeActive ? 'true' : 'false');

    document.documentElement.classList.toggle('anime-theme-active', _animeActive);
    document.body.classList.toggle('anime-theme-active', _animeActive);

    const toggleBtn = document.getElementById('anime-toggle');
    const toggleText = document.getElementById('anime-toggle-status');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', _animeActive);
      toggleBtn.setAttribute('aria-pressed', _animeActive ? 'true' : 'false');
      toggleBtn.title = _animeActive ? 'Anime Mode is ON (Click to turn OFF)' : 'Anime Mode is OFF (Click to turn ON)';
    }
    if (toggleText) {
      toggleText.textContent = _animeActive ? 'ON' : 'OFF';
    }

    if (_animeActive) {
      const legend = getTodayLegend();
      applyAestheticTheme(legend);
      createParticles();
      startAnimationLoop();
    } else {
      if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      if (_animId) cancelAnimationFrame(_animId);
    }

    if (typeof renderCurrentPage === 'function') {
      renderCurrentPage();
    }
  }

  function toggleAnimeTheme() {
    setAnimeTheme(!_animeActive);
  }

  function initAnimeEngine() {
    const stored = localStorage.getItem(ANIME_KEY);
    _animeActive = stored === null ? true : stored === 'true';

    const soundStored = localStorage.getItem(SOUND_KEY);
    _soundActive = soundStored === null ? true : soundStored === 'true';

    document.documentElement.classList.toggle('anime-theme-active', _animeActive);
    document.body.classList.toggle('anime-theme-active', _animeActive);

    const toggleBtn = document.getElementById('anime-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleAnimeTheme);
      toggleBtn.classList.toggle('active', _animeActive);
      toggleBtn.setAttribute('aria-pressed', _animeActive ? 'true' : 'false');
    }
    const toggleText = document.getElementById('anime-toggle-status');
    if (toggleText) {
      toggleText.textContent = _animeActive ? 'ON' : 'OFF';
    }

    if (_animeActive) {
      const legend = getTodayLegend();
      applyAestheticTheme(legend);
    }

    initCanvas();
  }

  // ── Global Export ────────────────────────────────────────────────────
  window.AnimeEngine = {
    init: initAnimeEngine,
    isEnabled: isAnimeEnabled,
    setTheme: setAnimeTheme,
    toggle: toggleAnimeTheme,
    getLegend: getTodayLegend,
    cycleLegend: cycleNextLegend,
    resetLegend: resetToDailyLegend,
    allLegends: LEGENDS,
    burst: triggerTaskCompleteEffect,
    celebrate: showAestheticCelebration,
    playSound: playAnimeSound,
    getRank: getAnimeRank,
    getPowerLevel: getAnimePowerLevel,
    mountHeroFX: mountHeroFX
  };

})(window);
