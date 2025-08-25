import { Resend } from "resend";
import { env } from "./env.js";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Sends a welcome email to new waitlist subscribers
 * @param {string} email - The subscriber's email address
 * @param {string} discountCode - The discount code to include
 * @returns {Promise<Object>} - Resend API response
 */
export async function sendWaitlistWelcomeEmail(
  email,
  discountCode = "EARLY20"
) {
  // Mock mode when no Resend API key is configured
  if (!env.RESEND_API_KEY) {
    console.log(
      `[MOCK MODE] Would send welcome email to ${email} with discount code ${discountCode}`
    );
    return { id: "mock-email-id", success: true, mock: true };
  }

  try {
    const emailTemplate = {
      from: env.FROM_EMAIL,
      to: email,
      subject: "Welcome to Mockly - Your Early Access Advantage!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Mockly</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #111827 0%, #374151 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: 600; margin-bottom: 10px; }
            .header-text { color: #d1d5db; font-size: 16px; }
            .content { padding: 40px 30px; }
            .title { font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 16px; }
            .text { color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
            .discount-box { background: linear-gradient(135deg, #111827 0%, #374151 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; }
            .discount-title { color: white; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
            .discount-code { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 12px 20px; color: white; font-size: 18px; font-weight: 600; letter-spacing: 2px; margin: 16px 0; display: inline-block; }
            .discount-desc { color: #d1d5db; font-size: 14px; }
            .features { margin: 32px 0; }
            .feature { display: flex; align-items: flex-start; margin-bottom: 16px; }
            .feature-icon { width: 20px; height: 20px; background: #111827; border-radius: 50%; margin-right: 12px; margin-top: 2px; flex-shrink: 0; }
            .feature-text { color: #6b7280; line-height: 1.5; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Mockly</div>
              <div class="header-text">Level Up Your Interview Game</div>
            </div>
            
            <div class="content">
              <h1 class="title">Welcome to the future of interview prep! 🎉</h1>
              
              <p class="text">
                Thank you for joining our waitlist! You're now part of an exclusive group of forward-thinking professionals who are serious about mastering their interview skills.
              </p>
              
              <div class="discount-box">
                <div class="discount-title">Your Early Bird Advantage</div>
                <div class="discount-code">${discountCode}</div>
                <div class="discount-desc">Save 20% on your first month when we launch</div>
              </div>
              
              <p class="text">
                As an early supporter, you'll get priority access to our beta, exclusive updates on our progress, and the chance to shape Mockly's development with your feedback.
              </p>
              
              <div class="features">
                <div class="feature">
                  <div class="feature-icon"></div>
                  <div class="feature-text"><strong>First in line:</strong> Priority access when we launch</div>
                </div>
                <div class="feature">
                  <div class="feature-icon"></div>
                  <div class="feature-text"><strong>Exclusive updates:</strong> Behind-the-scenes development insights</div>
                </div>
                <div class="feature">
                  <div class="feature-icon"></div>
                  <div class="feature-text"><strong>Shape the product:</strong> Your feedback directly influences our roadmap</div>
                </div>
                <div class="feature">
                  <div class="feature-icon"></div>
                  <div class="feature-text"><strong>Special pricing:</strong> 20% off your first month with code ${discountCode}</div>
                </div>
              </div>
              
              <p class="text">
                We're working hard to build the most intentional interview practice platform. Expected launch: Q4 2025. Stay tuned for updates!
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Thanks for believing in our mission to reduce the confidence gap in interviews.
                <br><br>
                The Mockly Team
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Mockly!

Thank you for joining our waitlist! You're now part of an exclusive group of forward-thinking professionals who are serious about mastering their interview skills.

Your Early Bird Advantage:
Use code ${discountCode} to save 20% on your first month when we launch.

As an early supporter, you'll get:
• Priority access when we launch
• Exclusive development updates  
• The chance to shape Mockly with your feedback
• Special pricing with your discount code

We're working hard to build the most intentional interview practice platform. Expected launch: Q4 2025.

Thanks for believing in our mission to reduce the confidence gap in interviews.

The Mockly Team
      `,
    };

    const result = await resend.emails.send(emailTemplate);
    console.log("Waitlist welcome email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send waitlist welcome email:", error);
    throw error;
  }
}

/**
 * Generates a unique discount code for the user
 * @param {string} email - User's email to create unique code
 * @returns {string} - Discount code
 */
export function generateDiscountCode(email) {
  // For now, return a standard code. In production, you might want unique codes
  return "EARLY20";
}
