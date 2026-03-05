import { useState, useEffect, useRef, useCallback } from "react";

const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777";
const GREEN = "#4ADE80", CARD = "#222222", BORDER = "#2E2E2E";

export default function OnboardingFlow({ flow, currentStep, onAdvance, onComplete, onSkip }) {
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [continueEnabled, setContinueEnabled] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const tooltipRef = useRef(null);
  const observerRef = useRef(null);
  const animFrameRef = useRef(null);

  const step = flow.steps[currentStep];
  if (!step) return null;

  const isFinal = step.advanceOn === "dismiss";
  const PAD = 8;

  // ── Position the spotlight + tooltip on the target element ──
  const updatePosition = useCallback(() => {
    if (!step.target) { setTargetRect(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setTargetRect(null); return; }
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step.target]);

  // Recalculate on step change, resize, scroll
  useEffect(() => {
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    // MutationObserver to catch DOM changes (e.g. form appearing)
    observerRef.current = new MutationObserver(() => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updatePosition);
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      observerRef.current?.disconnect();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [updatePosition, currentStep]);

  // Position tooltip relative to target
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) {
      setTooltipPos({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      return;
    }
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 12;

    let top, left;
    // Prefer below
    if (targetRect.top + targetRect.height + gap + tt.height < vh) {
      top = targetRect.top + targetRect.height + gap;
    } else {
      top = Math.max(8, targetRect.top - tt.height - gap);
    }
    left = targetRect.left + targetRect.width / 2 - tt.width / 2;
    left = Math.max(12, Math.min(left, vw - tt.width - 12));
    top = Math.max(8, top);

    setTooltipPos({ top, left, transform: "none" });
  }, [targetRect, currentStep]);

  // ── Click advance: listen for click on target element ──
  useEffect(() => {
    if (step.advanceOn !== "click" || !step.target) return;
    const handler = () => {
      // Small delay so the UI action (e.g. opening form) completes
      setTimeout(() => onAdvance(), 100);
    };
    const el = document.querySelector(step.target);
    if (el) el.addEventListener("click", handler);
    return () => { if (el) el.removeEventListener("click", handler); };
  }, [step.advanceOn, step.target, currentStep, onAdvance]);

  // ── Continue button: watch for input value ──
  useEffect(() => {
    if (step.advanceOn !== "continue" || !step.target) { setContinueEnabled(false); return; }
    const check = () => {
      const el = document.querySelector(step.target);
      if (!el) { setContinueEnabled(false); return; }
      const input = el.querySelector("input") || el.querySelector("textarea") || el.querySelector("select");
      setContinueEnabled(input ? input.value.trim().length > 0 : false);
    };
    check();
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, [step.advanceOn, step.target, currentStep]);

  // ── Save advance: watch for fleet-save-btn click ──
  useEffect(() => {
    if (step.advanceOn !== "save") return;
    const btn = document.querySelector("[data-onboarding='fleet-save-btn']");
    if (!btn) return;
    const handler = () => {
      // Wait for save to process, then advance
      setTimeout(() => onAdvance(), 600);
    };
    btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, [step.advanceOn, currentStep, onAdvance]);

  // ── Confetti on final step ──
  useEffect(() => {
    if (isFinal) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(t);
    }
  }, [isFinal]);

  // Make target clickable by creating a transparent "hole"
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    pointerEvents: "none",
  };

  const backdropStyle = targetRect ? {
    position: "fixed",
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height,
    borderRadius: 8,
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
    zIndex: 10000,
    pointerEvents: "none",
    transition: "all 0.25s ease",
  } : {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 10000,
    pointerEvents: isFinal ? "auto" : "none",
  };

  // Allow clicks to pass through to the target
  const holeStyle = targetRect ? {
    position: "fixed",
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height,
    zIndex: 10001,
    pointerEvents: "auto",
    background: "transparent",
    cursor: "pointer",
  } : null;

  return (
    <>
      {/* Backdrop with spotlight hole */}
      <div style={backdropStyle} />
      {holeStyle && <div style={holeStyle} />}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: tooltipPos.transform || "none",
          zIndex: 10002,
          pointerEvents: "auto",
          width: 320,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "16px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "onb-fadeIn 0.2s ease-out",
        }}
      >
        {/* Step progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>
            Step {currentStep + 1} of {flow.steps.length}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {flow.steps.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i < currentStep ? GREEN : i === currentStep ? WHITE : "rgba(255,255,255,0.15)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.5, marginBottom: 14 }}>
          {step.description}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onSkip}
            style={{
              background: "none", border: "none", color: MUTED,
              fontSize: 11, cursor: "pointer", padding: "4px 0",
            }}
            onMouseEnter={e => e.currentTarget.style.color = OFF_WHITE}
            onMouseLeave={e => e.currentTarget.style.color = MUTED}
          >
            Skip
          </button>

          {step.advanceOn === "click" && (
            <span style={{ fontSize: 10, color: MUTED, fontStyle: "italic" }}>
              Click the highlighted element
            </span>
          )}

          {step.advanceOn === "continue" && (
            <button
              onClick={() => { if (continueEnabled) onAdvance(); }}
              disabled={!continueEnabled}
              style={{
                padding: "7px 20px",
                background: continueEnabled ? WHITE : "rgba(255,255,255,0.1)",
                color: continueEnabled ? "#000000" : MUTED,
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: continueEnabled ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              Continue
            </button>
          )}

          {step.advanceOn === "save" && (
            <span style={{ fontSize: 10, color: MUTED, fontStyle: "italic" }}>
              Complete the form and save
            </span>
          )}

          {step.advanceOn === "dismiss" && (
            <button
              onClick={() => onComplete(flow.id)}
              style={{
                padding: "8px 20px",
                background: GREEN,
                color: "#000000",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Confetti */}
      {showConfetti && <Confetti />}

      <style>{`
        @keyframes onb-fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ── CSS-only confetti celebration ──
function Confetti() {
  const colors = [GREEN, "#F59E0B", "#3B82F6", "#EC4899", WHITE, "#8B5CF6"];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    rotation: Math.random() * 360,
    size: 4 + Math.random() * 6,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10003, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -10,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 1,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
