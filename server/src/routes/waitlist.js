import express from "express";
import { z } from "zod";
import {
  sendWaitlistWelcomeEmail,
  generateDiscountCode,
} from "../lib/resend.js";
import { insertWaitlistUser, getWaitlistCount } from "../lib/supabase.js";

const router = express.Router();

// Validation schema for waitlist signup
const waitlistSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().optional(),
  company: z.string().optional(),
  experienceLevel: z.string().optional(),
  interests: z.array(z.string()).optional(),
});

// GET /api/waitlist/count - Get waitlist count
router.get("/count", async (req, res) => {
  try {
    const count = await getWaitlistCount();

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get waitlist count error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get waitlist count",
    });
  }
});

// POST /api/waitlist - Join waitlist
router.post("/", async (req, res) => {
  try {
    // Validate request body
    const validatedData = waitlistSchema.parse(req.body);

    // Prepare user data for database
    const userData = {
      email: validatedData.email.toLowerCase().trim(),
      first_name: validatedData.firstName.trim(),
      last_name: validatedData.lastName.trim(),
      role: validatedData.role?.trim() || null,
      company: validatedData.company?.trim() || null,
      experience_level: validatedData.experienceLevel || null,
      interests: validatedData.interests || [],
    };

    // Insert user into Supabase
    const insertResult = await insertWaitlistUser(userData);

    // Generate discount code
    const discountCode = generateDiscountCode(validatedData.email);

    // Send welcome email with discount
    try {
      await sendWaitlistWelcomeEmail(validatedData.email, discountCode);
      console.log(
        `Welcome email sent to ${validatedData.email} with discount code ${discountCode}`
      );
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the whole request if email fails - log and continue
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: insertResult.duplicate
        ? "Email already registered - welcome email sent anyway"
        : "Successfully joined waitlist",
      discountCode,
      duplicate: insertResult.duplicate || false,
      mock: insertResult.mock || false,
    });
  } catch (error) {
    console.error("Waitlist signup error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided",
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
