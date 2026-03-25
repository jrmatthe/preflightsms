import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";

export default function AuthVerify() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const { token_hash, type } = router.query;
    if (!token_hash || !type) return;

    async function verify() {
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (verifyError) {
          console.error("[verify] error:", verifyError);
          setError(verifyError.message);
          return;
        }

        // Session is now set — redirect to the main app
        router.replace("/");
      } catch (err) {
        console.error("[verify]", err);
        setError(err.message);
      }
    }

    verify();
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
