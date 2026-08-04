const rateLimit = require('express-rate-limit');

// AI routes hit an external LLM (Groq) — protect against cost abuse and spam
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a minute and try again.' },
});

module.exports = { aiLimiter };
