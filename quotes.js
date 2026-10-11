/**
 * quotes.js — Motivation quotes collection and helper functions
 *
 * Aimed at a student who studies, codes, and trains.
 * Real authentic quotes, famous anime quotes, proverbs, and "Daily Tracker" originals.
 * All under ~120 characters.
 *
 * Moods:
 *  - 'start': beginning, building momentum, small steps
 *  - 'keep': consistency, discipline, staying the course
 *  - 'comeback': returning after a break, resilience, clean slates
 */

const MOTIVATION_QUOTES = [
  // ── 'keep' (discipline, daily habit, consistency) ─────────────────
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", mood: "keep" },
  { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell", mood: "keep" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", mood: "keep" },
  { text: "Long-term consistency beats short-term intensity.", author: "Daily Tracker", mood: "keep" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Anonymous", mood: "keep" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear", mood: "keep" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso", mood: "keep" },
  { text: "Consistency is what transforms average into excellence.", author: "Daily Tracker", mood: "keep" },
  { text: "Show up every day, especially on the days you do not feel like it.", author: "Daily Tracker", mood: "keep" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock", mood: "keep" },
  { text: "Energy flows where attention goes and focus persists.", author: "Daily Tracker", mood: "keep" },
  { text: "Mastery is not a sprint. It is a daily practice.", author: "Daily Tracker", mood: "keep" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King", mood: "keep" },
  { text: "A small step every single day compounds into a giant leap.", author: "Daily Tracker", mood: "keep" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali", mood: "keep" },
  { text: "Hard work is worthless for those that don't believe in themselves.", author: "Naruto Uzumaki (Naruto)", mood: "keep" },
  { text: "A dropout will beat a genius through hard work.", author: "Rock Lee (Naruto)", mood: "keep" },
  { text: "Surpass your limits. Right here, right now.", author: "Yami Sukehiro (Black Clover)", mood: "keep" },
  { text: "If you can only do one thing, hone it to absolute perfection.", author: "Jigoro Kuwajima (Demon Slayer)", mood: "keep" },
  { text: "No matter how weak you are, you can always become stronger.", author: "Tanjiro Kamado (Demon Slayer)", mood: "keep" },
  { text: "A person grows once they are able to defeat their trials.", author: "Jiraiya (Naruto)", mood: "keep" },
  { text: "Whatever you do, enjoy it to the fullest. That is the secret.", author: "Rider (Fate/Zero)", mood: "keep" },
  { text: "Scars on the back are a swordsman's shame.", author: "Roronoa Zoro (One Piece)", mood: "keep" },
  { text: "The only ones who should shoot are those prepared to be shot.", author: "Lelouch Lamperouge (Code Geass)", mood: "keep" },
  { text: "I don't care if I die fighting for my dream! I will become King of the Pirates!", author: "Monkey D. Luffy (One Piece)", mood: "keep" },
  { text: "I don't run away. I never go back on my word. That is my ninja way!", author: "Naruto Uzumaki (Naruto)", mood: "keep" },
  { text: "When you give up, that is when your dream ends. Keep pushing forward!", author: "Naruto Uzumaki (Naruto)", mood: "keep" },
  { text: "Throughout heaven and earth, I alone am the honored one. Focus on your mastery today.", author: "Satoru Gojo (Jujutsu Kaisen)", mood: "keep" },
  { text: "The only thing we are allowed to do is to believe that we won't regret the choice we made.", author: "Levi Ackerman (Attack on Titan)", mood: "start" },
  { text: "Set your heart ablaze. Overcome yourself, and keep moving forward.", author: "Tanjiro Kamado (Demon Slayer)", mood: "comeback" },
  { text: "If fate is a millstone, then we are the grist. There is nothing to do but sharpen our blades.", author: "Ichigo Kurosaki (Bleach)", mood: "keep" },

  // ── 'start' (starting, focus, one thing at a time) ────────────────
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", mood: "start" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", mood: "start" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", mood: "start" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", mood: "start" },
  { text: "Focus on the process, not the outcome. The results will follow.", author: "Daily Tracker", mood: "start" },
  { text: "One focused hour is worth ten distracted ones.", author: "Daily Tracker", mood: "start" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", mood: "start" },
  { text: "Simplicity is the prerequisite for reliability.", author: "Edsger W. Dijkstra", mood: "start" },
  { text: "Code a little, read a little, move a little. Win the day.", author: "Daily Tracker", mood: "start" },
  { text: "First make it work, then make it right, then make it fast.", author: "Kent Beck", mood: "start" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall", mood: "start" },
  { text: "Today's work is tomorrow's foundation.", author: "Daily Tracker", mood: "start" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", mood: "start" },
  { text: "If you don't take risks, you can't create a future.", author: "Monkey D. Luffy (One Piece)", mood: "start" },
  { text: "I've set myself to become King of the Pirates... and if I die trying, at least I tried!", author: "Monkey D. Luffy (One Piece)", mood: "start" },
  { text: "Believe in the you that believes in yourself.", author: "Kamina (Gurren Lagann)", mood: "start" },
  { text: "It's not about whether you can or can't. You just do it.", author: "Saitama (One-Punch Man)", mood: "start" },
  { text: "Power comes in response to a need, not a desire.", author: "Goku (Dragon Ball Z)", mood: "start" },
  { text: "Even if I'm not chosen, I can still fight.", author: "Asta (Black Clover)", mood: "start" },

  // ── 'comeback' (resilience, restart, progress over perfection) ────
  { text: "Never let a stumble in the road be the end of the journey.", author: "Anonymous", mood: "comeback" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb", mood: "comeback" },
  { text: "Missing one day is an accident. Never miss two days in a row.", author: "Daily Tracker", mood: "comeback" },
  { text: "Progress over perfection, every single day.", author: "Daily Tracker", mood: "comeback" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", mood: "comeback" },
  { text: "Yesterday ended last night. Today is a clean slate.", author: "Anonymous", mood: "comeback" },
  { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford", mood: "comeback" },
  { text: "A gap yesterday doesn't define today. Reset and execute.", author: "Daily Tracker", mood: "comeback" },
  { text: "Rest when you need to, but always return.", author: "Daily Tracker", mood: "comeback" },
  { text: "The comeback is always stronger than the setback.", author: "Daily Tracker", mood: "comeback" },
  { text: "Focus on today's inputs. Forgive yesterday's misses.", author: "Daily Tracker", mood: "comeback" },
  { text: "Courage is starting again today without hesitation.", author: "Daily Tracker", mood: "comeback" },
  { text: "Push through the pain. Giving up hurts much more.", author: "Vegeta (Dragon Ball Z)", mood: "comeback" },
  { text: "No matter how deep the night, it always turns to day.", author: "Brook (One Piece)", mood: "comeback" },
  { text: "Stand up and walk. Move forward. You have your own two legs.", author: "Edward Elric (Fullmetal Alchemist)", mood: "comeback" },
  { text: "Fear is not evil. It tells you what your weakness is.", author: "Gildarts Clive (Fairy Tail)", mood: "comeback" },
  { text: "There is no shame in falling. True shame is in not standing up again.", author: "Shintaro Midorima (Kuroko's Basketball)", mood: "comeback" },
  { text: "If you don't like your destiny, have the courage to change it.", author: "Naruto Uzumaki (Naruto)", mood: "comeback" },
  { text: "Forget about regrets. Dedicate all your chakra to training today.", author: "Kakashi Hatake (Naruto)", mood: "comeback" },
];

// Session-level override when user taps "New quote" (2.3)
let _sessionQuoteOverride = null;
let _sessionQuoteDate = null;

/** Returns day-of-year index (1–366) */
function getDayOfYear(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * getMotivationQuote(context)
 * context: { yesterdayHadGaps, currentStreak, dateStr }
 */
function getMotivationQuote(context = {}) {
  const dateStr = context.dateStr || todayStr();

  // Reset override if date changed (2.3)
  if (_sessionQuoteDate !== dateStr) {
    _sessionQuoteOverride = null;
    _sessionQuoteDate = null;
  }

  if (_sessionQuoteOverride) {
    return _sessionQuoteOverride;
  }

  const { yesterdayHadGaps = false, currentStreak = 0 } = context;

  let preferredMood = 'start';
  if (yesterdayHadGaps) {
    preferredMood = 'comeback';
  } else if (currentStreak >= 7) {
    preferredMood = 'keep';
  }

  let pool = MOTIVATION_QUOTES.filter(q => q.mood === preferredMood);
  // If Anime mode is active, filter/prefer anime quotes
  if (window.AnimeEngine && AnimeEngine.isEnabled()) {
    const animeQuotes = pool.filter(q => q.author.includes('(') || q.author.includes('Luffy') || q.author.includes('Naruto'));
    if (animeQuotes.length > 0) pool = animeQuotes;
  }

  const activePool = pool.length > 0 ? pool : MOTIVATION_QUOTES;

  const dayIdx = getDayOfYear(dateStr);
  return activePool[dayIdx % activePool.length];
}

/**
 * nextRandomQuote(context) (2.3)
 * Receives the same context as getMotivationQuote, avoids returning current quote.
 */
function nextRandomQuote(context = {}) {
  const dateStr = context.dateStr || todayStr();
  const current = getMotivationQuote(context);
  const { yesterdayHadGaps = false, currentStreak = 0 } = context;

  let preferredMood = 'start';
  if (yesterdayHadGaps) {
    preferredMood = 'comeback';
  } else if (currentStreak >= 7) {
    preferredMood = 'keep';
  }

  let pool = MOTIVATION_QUOTES.filter(q => q.mood === preferredMood && q.text !== current.text);
  if (pool.length === 0) {
    pool = MOTIVATION_QUOTES.filter(q => q.text !== current.text);
  }

  const next = pool[Math.floor(Math.random() * pool.length)];
  _sessionQuoteOverride = next;
  _sessionQuoteDate = dateStr;
  return next;
}
