// api/index.js — Vercel Serverless Entry (CommonJS)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Upstash imports
const { Ratelimit } = require("@upstash/ratelimit");
const { Redis } = require("@upstash/redis");

const app = express();

app.set('trust proxy', true);
console.log("--- VERCEL API FUNCTION INVOKED ---");

// ---------------------
// 0. ENV CHECK (helpful logs)
if (!process.env.MONGO_URI) {
  console.warn("WARNING: MONGO_URI not set in environment");
}
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("WARNING: Upstash Redis URL or Token not set. Rate limiting will fail.");
}

// ---------------------
// 1. SAFE MONGODB CONNECTION
// ---------------------
let isConnected = false;
async function connectToDatabase() {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      // serverless-friendly options
      maxPoolSize: 5,
      // useUnifiedTopology and useNewUrlParser are defaults in modern mongoose
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB connected:", isConnected);
  } catch (err) {
    console.error("MongoDB connection error:", err && err.message ? err.message : err);
    // Do not throw here — let requests fail gracefully instead of crashing the function
  }
}
connectToDatabase();

// ---------------------
// 2. CORS CONFIG (add your domain)
// ---------------------
const allowedOrigins = [
  "https://www.allgovpay.com", // <- your provided domain
  'https://www.allgovpay.com',
  "https://allgovpay.com", // <- your provided domain
  "https://allgov-three.vercel.app", // <- your provided domain
  "http://localhost:5173",
];


app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicit methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Access-Token', 'x-access-token'] // Explicit headers
})
);

app.options('*', cors());

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow tools like Postman (no origin) and same-origin
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) return callback(null, true);
//       return callback(new Error("CORS blocked: " + origin));
//     },
//     credentials: true,
//   })
// );

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("CORS + JSON middleware configured");

// ---------------------
// 3. UPSTASH RATE LIMITER (serverless-safe)
// ---------------------
let ratelimit = null;

try {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"), // 50 requests per minute sliding window
  });

  console.log("Upstash Ratelimit initialized");
} catch (err) {
  console.warn("Upstash init failed — rate limiting disabled:", err && err.message ? err.message : err);
}

// Middleware to check cf-bot-score (optional but helpful)
const cfBotScoreMiddleware = (req, res, next) => {
  try {
    const scoreHeader = req.headers["cf-bot-score"];
    if (scoreHeader) {
      const score = Number(scoreHeader);
      // block requests that look extremely bot-like (tune threshold if needed)
      if (!isNaN(score) && score < 30) {
        return res.status(403).json({ success: false, message: "Blocked by Cloudflare bot score" });
      }
    }
  } catch (err) {
    // don't crash on header parse errors
    console.warn("cf-bot-score parse error:", err && err.message ? err.message : err);
  }
  next();
};

// General rate-limit middleware using Upstash
const upstashRateLimitMiddleware = async (req, res, next) => {
  try {
    if (!ratelimit) return next(); // Upstash not configured — skip (but recommended to set env vars)

    // Identify by IP provided by Vercel/Cloudflare
    const ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";

    // call Upstash
    const rlRes = await ratelimit.limit(ip);
    // rlRes shape may vary — defensive check
    const success = rlRes && (rlRes.success === true || rlRes.allowed === true || rlRes.limit === undefined ? true : rlRes.success);

    if (!success) {
      // Optionally include Retry-After header if Upstash returned reset time
      if (rlRes && rlRes.reset) {
        res.setHeader("Retry-After", Math.ceil((rlRes.reset - Date.now()) / 1000));
      }
      return res.status(429).json({ success: false, message: "Too many requests. Slow down." });
    }

    // Optionally set headers with remaining quota info
    if (rlRes && rlRes.limit) {
      res.setHeader("X-RateLimit-Limit", rlRes.limit);
      if (rlRes.remaining !== undefined) res.setHeader("X-RateLimit-Remaining", rlRes.remaining);
      if (rlRes.reset) res.setHeader("X-RateLimit-Reset", Math.ceil(rlRes.reset / 1000));
    }

    next();
  } catch (err) {
    // On error, don't block legitimate traffic — log and proceed
    console.warn("Upstash rate limit error:", err && err.message ? err.message : err);
    next();
  }
};

// Apply bot-score middleware first, then rate limiter
app.use(cfBotScoreMiddleware);
app.use(upstashRateLimitMiddleware);

// ---------------------
// 4. ROUTES
// ---------------------
  const authRoutes = require("../routes/authRoutes");
  const userRoutes = require("../routes/userRoutes");
  const paymentRoutes = require("../routes/paymentRoutes");
  const taxRoutes = require("../routes/taxRoutes");

  const authController = require("../controllers/authController");
  const { protect } = require("../middleware/auth");

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/tax", taxRoutes);

  // Example protected endpoint
  app.get("/api/users/getData", protect, authController.getMe);

// ---------------------
// 5. INFO & ROOT ROUTES
// ---------------------
app.get("/info", (req, res) => {
  res.json({
    success: true,
    message: "Tax Payment System API",
    version: "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.send("Backend API is running.");
});

// ---------------------
// 6. ERROR HANDLER (prevents Vercel function crash on thrown errors)
// ---------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.message ? err.message : err);
  if (err.message && err.message.startsWith("CORS")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: "Server error" });
});

// ---------------------
// 7. EXPORT APP FOR VERCEL
// ---------------------
module.exports = app;