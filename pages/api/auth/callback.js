import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// Auth callback — receives a platform token from the portal,
// generates a Supabase session, and passes it to the client via the verify page.
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

    // Generate a magic link and extract the hashed token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: payload.email,
    });

    if (linkError) {
      console.error("[auth/callback] generateLink error:", linkError);
      return res.status(500).send("Failed to generate session");
    }

    // Now verify the OTP server-side to get actual session tokens
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("[auth/callback] verifyOtp error:", verifyError);
      return res.status(500).send("Failed to verify session");
    }

    // Always refresh subscribed_products from SSO token on every login
    const userId = verifyData.user?.id || payload.sub;
    await supabase.from("profiles").update({
      subscribed_products: payload.products,
    }).eq("id", userId);

    // Pass session tokens to client via the verify page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const accessToken = verifyData.session.access_token;
    const refreshToken = verifyData.session.refresh_token;

    return res.redirect(302,
      `${appUrl}/auth/verify?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
    );
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
