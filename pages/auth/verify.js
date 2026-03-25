import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";

export default function AuthVerify() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const attempted = useRef(false);

  useEffect(() => {
    const { access_token, refresh_token } = router.query;
    if (!access_token || !refresh_token) return;
    if (attempted.current) return;
    attempted.current = true;

    async function setSession() {
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error("[verify] setSession error:", sessionError);
          setError(sessionError.message);
          return;
        }

        // Session is set — navigate to main app
        window.location.href = "/";
      } catch (err) {
        console.error("[verify]", err);
        setError(err.message);
      }
    }

    setSession();
  }, [router.query]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0A" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#EF4444", fontSize: 16, marginBottom: 16 }}>Authentication failed</p>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>{error}</p>
          <a href={process.env.NEXT_PUBLIC_PORTAL_URL || "/"} style={{ color: "#22D3EE", fontSize: 14 }}>
            Return to Preflight 360
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0A" }}>
      <p style={{ color: "#666" }}>Signing in...</p>
    </div>
  );
}
