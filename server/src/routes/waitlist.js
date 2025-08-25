import express from "express";
import { z } from "zod";
import {
  sendWaitlistWelcomeEmail,
  generateDiscountCode,
} from "../lib/resend.js";

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

// POST /api/waitlist - Join waitlist
router.post("/", async (req, res) => {
  try {
    // Validate request body
    const validatedData = waitlistSchema.parse(req.body);

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

    // Return success response with user data (for frontend to handle Supabase insertion)
    res.status(200).json({
      success: true,
      message: "Successfully joined waitlist",
      discountCode,
      userData: {
        email: validatedData.email.toLowerCase().trim(),
        first_name: validatedData.firstName.trim(),
        last_name: validatedData.lastName.trim(),
        role: validatedData.role?.trim() || null,
        company: validatedData.company?.trim() || null,
        experience_level: validatedData.experienceLevel || null,
        interests: validatedData.interests || [],
      },
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
