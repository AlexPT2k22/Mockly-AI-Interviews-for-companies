import { env } from "./src/lib/env.js";

console.log("🔍 CORS Configuration Check");
console.log("==========================");
console.log("PORT:", env.PORT);
console.log("ALLOWED_ORIGIN:", env.ALLOWED_ORIGIN);
console.log("Origins array:", env.ALLOWED_ORIGIN.split(",").map(o => o.trim()));
console.log("==========================");

// Test if the production domain is included
const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map(o => o.trim());
const productionDomain = "https://mockly-alpha.vercel.app";

if (allowedOrigins.includes(productionDomain)) {
  console.log("✅ Production domain is configured");
} else {
  console.log("❌ Production domain is NOT configured");
  console.log("Expected:", productionDomain);
  console.log("Current origins:", allowedOrigins);
}