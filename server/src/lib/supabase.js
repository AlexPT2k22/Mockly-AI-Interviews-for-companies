import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Create Supabase client for server-side operations
let supabase = null;

if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  console.log("[SUPABASE] Client initialized successfully");
  console.log("[SUPABASE] URL:", env.SUPABASE_URL.substring(0, 30) + "...");
} else {
  console.log("[SUPABASE] No credentials configured - using mock mode");
  console.log("[SUPABASE] URL:", env.SUPABASE_URL || "undefined");
  console.log(
    "[SUPABASE] ANON_KEY:",
    env.SUPABASE_ANON_KEY ? "defined" : "undefined"
  );
}

/**
 * Insert a new user into the waitlist table
 * @param {Object} userData - User data to insert
 * @returns {Promise<Object>} - Insert result
 */
export async function insertWaitlistUser(userData) {
  console.log("[SUPABASE] insertWaitlistUser called with:", userData);

  if (!supabase) {
    console.log(`[MOCK MODE] Would insert waitlist user:`, userData);
    return { success: true, mock: true, data: userData };
  }

  try {
    console.log("[SUPABASE] Attempting to insert user into waitlist table...");
    const { data, error } = await supabase
      .from("waitlist")
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.log("[SUPABASE] Insert error:", error);
      // Handle unique constraint violation (duplicate email)
      if (error.code === "23505") {
        console.log(
          `[SUPABASE] User ${userData.email} already exists in waitlist`
        );
        return { success: true, duplicate: true, data: userData };
      }
      throw error;
    }

    console.log(
      `[SUPABASE] Successfully inserted waitlist user: ${userData.email}`,
      data
    );
    return { success: true, data };
  } catch (error) {
    console.error("[SUPABASE] Failed to insert waitlist user:", error);
    throw error;
  }
}

/**
 * Get the total count of users in the waitlist
 * @returns {Promise<number>} - Count of waitlist users
 */
export async function getWaitlistCount() {
  console.log("[SUPABASE] getWaitlistCount called");

  if (!supabase) {
    console.log(`[MOCK MODE] Returning mock waitlist count: 247`);
    return 247; // Mock count for development
  }

  try {
    console.log("[SUPABASE] Fetching waitlist count...");
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log("[SUPABASE] Count query error:", error);
      throw error;
    }

    console.log(`[SUPABASE] Waitlist count: ${count}`);
    return count || 0;
  } catch (error) {
    console.error("[SUPABASE] Failed to get waitlist count:", error);
    throw error;
  }
}

/**
 * Upsert beta feedback by email (one feedback per email)
 * @param {{ email: string, rating: number, comment?: string|null, context?: string|null }} fb
 */
export async function upsertBetaFeedback(fb) {
  console.log("[SUPABASE] upsertBetaFeedback called with:", fb);
  if (!supabase) {
    console.log(`[MOCK MODE] Would upsert beta feedback:`, fb);
    return { success: true, mock: true };
  }
  try {
    const { data, error } = await supabase
      .from("beta_feedback")
      .upsert(
        {
          email: fb.email.toLowerCase(),
          rating: fb.rating,
          comment: fb.comment?.trim() || null,
          context: fb.context?.trim() || null,
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[SUPABASE] Failed to upsert beta feedback:", error);
    throw error;
  }
}

/**
 * Get beta feedback summary (average, count, distribution)
 */
export async function getBetaFeedbackSummary() {
  console.log("[SUPABASE] getBetaFeedbackSummary called");
  if (!supabase) {
    return {
      success: true,
      mock: true,
      average: 4.7,
      total: 12,
      distribution: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 8 },
    };
  }
  try {
    const { data, error } = await supabase
      .from("beta_feedback")
      .select("rating");
    if (error) throw error;
    const total = data.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const row of data) {
      const r = row.rating;
      if (distribution[r] !== undefined) distribution[r] += 1;
      sum += r;
    }
    const average = total ? +(sum / total).toFixed(2) : 0;
    return { success: true, average, total, distribution };
  } catch (error) {
    console.error("[SUPABASE] Failed to get beta feedback summary:", error);
    throw error;
  }
}

export { supabase };
