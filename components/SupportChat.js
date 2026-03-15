import { useState, useRef, useEffect, useCallback } from "react";

const BLACK = "#000000", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323", CYAN = "#22D3EE", GREEN = "#4ADE80", RED = "#EF4444";

export default function SupportChat({ supabase, profile, session, org, currentPage }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async (directText) => {
    const text = (directText || input).trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setSending(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-support-chat", {
        body: {
          orgId: profile?.org_id,
          messages: updated,
          userContext: {
            userName: profile?.full_name || session?.user?.email,
            role: profile?.role,
            tier: org?.tier || "starter",
            currentPage,
            orgName: org?.name,
          },
        },
      });

      if (fnError) {
        // supabase-js wraps non-2xx responses — try to parse the body
        const errBody = typeof fnError === "object" && fnError.context ? fnError.context : fnError;
        throw new Error(errBody?.message || fnError?.message || "Request failed");
      }
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e.message || "Something went wrong";
      if (msg.includes("Rate limit") || msg.includes("limit")) {
        setError(msg);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that right now. Please try again or email support@preflightsms.com." }]);
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, supabase, profile, session, org, currentPage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9000,
          width: 48, height: 48, borderRadius: 24,
          background: CYAN, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(34,211,238,0.3)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(34,211,238,0.4)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(34,211,238,0.3)"; }}
        aria-label="Open support chat"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9000,
      width: 380, height: 520, maxHeight: "calc(100vh - 40px)",
      display: "flex", flexDirection: "column",
      background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 14,
      boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
      animation: "supportChatOpen 0.2s ease-out",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: `1px solid ${BORDER}`,
        borderRadius: "14px 14px 0 0", background: CARD,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: `${CYAN}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Support</div>
            <div style={{ fontSize: 10, color: GREEN, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
              Online
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none", border: "none", color: MUTED, cursor: "pointer",
            padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 4, transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = WHITE}
          onMouseLeave={e => e.currentTarget.style.color = MUTED}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: "16px 14px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, marginBottom: 6 }}>How can we help?</div>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginBottom: 20 }}>
              Ask about any PreflightSMS feature, troubleshoot issues, or get help with workflows.
            </div>
            {[
              "How do I submit a FRAT?",
              "How does flight following work?",
              "What's needed for Part 5 compliance?",
            ].map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 12px", marginBottom: 6,
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
                  color: OFF_WHITE, fontSize: 12, cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = CYAN}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.role === "user" ? CYAN : CARD,
              color: msg.role === "user" ? BLACK : OFF_WHITE,
              fontSize: 12,
              lineHeight: 1.55,
              border: msg.role === "user" ? "none" : `1px solid ${BORDER}`,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
              background: CARD, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: MUTED,
                    animation: `supportDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: `${RED}12`, border: `1px solid ${RED}33`,
            fontSize: 11, color: RED, textAlign: "center",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 14px", borderTop: `1px solid ${BORDER}`,
        display: "flex", gap: 8, alignItems: "flex-end",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          rows={1}
          style={{
            flex: 1, padding: "10px 12px", resize: "none",
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
            color: OFF_WHITE, fontSize: 12, fontFamily: "inherit",
            outline: "none", maxHeight: 80, minHeight: 38,
            transition: "border-color 0.15s",
          }}
          onFocus={e => e.target.style.borderColor = `${CYAN}66`}
          onBlur={e => e.target.style.borderColor = BORDER}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            width: 38, height: 38, borderRadius: 8, border: "none",
            background: input.trim() && !sending ? CYAN : `${CYAN}33`,
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !sending ? BLACK : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: "6px 14px 10px", textAlign: "center",
        fontSize: 9, color: MUTED,
      }}>
        AI-powered &middot; For complex issues email <a href="mailto:support@preflightsms.com" style={{ color: CYAN, textDecoration: "none" }}>support@preflightsms.com</a>
      </div>

      <style>{`
        @keyframes supportChatOpen {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes supportDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
