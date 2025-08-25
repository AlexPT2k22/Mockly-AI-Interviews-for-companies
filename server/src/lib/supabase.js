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

export { supabase };
