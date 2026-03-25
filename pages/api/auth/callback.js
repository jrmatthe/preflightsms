import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// Auth callback — receives a platform token from the portal,
// syncs the user session, and redirects to the app.
// preflightSMS is the platform Supabase — users/orgs already exist here,
// so we just need to verify the token and create a session.
export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("Missing token");
  }

  try {
    // Verify the platform token
    const payload = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);

    // Check that this token is for this product
    if (!payload.products?.includes("sms")) {
      return res.status(403).send("Organization does not have access to preflightSMS");
    }

    // Use service role — since SMS IS the platform Supabase, users already exist
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Generate a session directly using admin API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: payload.email,
    });

    if (sessionError) {
      console.error("[auth/callback] generateLink error:", sessionError);
      return res.status(500).send("Failed to generate session");
    }

    // Use the token_hash and redirect to a client page that will verify it
    const hashed_token = sessionData.properties.hashed_token;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    // Redirect to the verify page which will call verifyOtp on the client side
    return res.redirect(302, `${appUrl}/auth/verify?token_hash=${hashed_token}&type=magiclink`);
  } catch (err) {
    console.error("[auth/callback]", err);
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token expired. Please try again from the portal.");
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).send("Invalid token.");
    }
    return res.status(500).send("Authentication failed");
  }
}
