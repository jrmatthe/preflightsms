import { useState, useEffect } from "react";

const BLACK = "#050508";
const CARD = "#0e1118";
const BORDER = "rgba(255,255,255,0.04)";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "rgba(255,255,255,0.35)";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const cardStyle = { background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.03)" };

const ERP_CATEGORIES = {
  accident: { label: "Aircraft Accident/Incident", color: RED, icon: "\u2708\uFE0F" },
  medical: { label: "Medical Emergency", color: "#F97316", icon: "\uD83C\uDFE5" },
  security: { label: "Security Threat", color: AMBER, icon: "\uD83D\uDD12" },
  natural_disaster: { label: "Natural Disaster", color: YELLOW, icon: "\uD83C\uDF2A\uFE0F" },
  hazmat: { label: "Fuel Spill / HAZMAT", color: "#A78BFA", icon: "\u2622\uFE0F" },
  overdue: { label: "Missing/Overdue Aircraft", color: CYAN, icon: "\uD83D\uDCE1" },
  general: { label: "General", color: MUTED, icon: "\uD83D\uDCCB" },
};

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${RED}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No Emergency Plans</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>Emergency response plans can be set up from the desktop app.</div>
    </div>
  );
}

function BackHeader({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: WHITE, fontSize: 20, padding: 4,
        cursor: "pointer", display: "flex", alignItems: "center", minWidth: 44, minHeight: 44,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: WHITE }}>{title}</div>
    </div>
  );
}

// ── PLAN DETAIL VIEW ─────────────────────────────────────────
function PlanDetail({ plan, onLoadChecklist, onLoadCallTree, onBack, onAcknowledgeErp, session }) {
  const [checklist, setChecklist] = useState(null);
  const [callTree, setCallTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const cat = ERP_CATEGORIES[plan.category] || ERP_CATEGORIES.general;

  // Acknowledgment status
  const myAck = (plan.acknowledgments || []).find(a => a.user_id === session?.user?.id);
  const needsAck = plan.is_active && (!myAck || myAck.plan_version < (plan.version || 1) || (plan.acknowledgment_frequency_months && new Date(myAck.acknowledged_at).getTime() + plan.acknowledgment_frequency_months * 30 * 86400000 < Date.now()));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      onLoadChecklist ? onLoadChecklist(plan.id) : Promise.resolve([]),
      onLoadCallTree ? onLoadCallTree(plan.id) : Promise.resolve([]),
    ]).then(([cl, ct]) => {
      if (!cancelled) {
        setChecklist(cl || []);
        setCallTree(ct || []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [plan.id]);

  const sortedChecklist = (checklist || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedCallTree = (callTree || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div>
      <BackHeader title="Emergency Plan" onBack={onBack} />

      <div style={{ padding: 16 }}>
        {/* Acknowledgment banner */}
        {needsAck && onAcknowledgeErp && (
          <div style={{ ...cardStyle, padding: 16, marginBottom: 16, borderLeft: `3px solid ${AMBER}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 4 }}>Acknowledgment Required</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
              {!myAck ? "You have not yet acknowledged this ERP." : "This plan has been updated or your acknowledgment has expired."}
            </div>
            <button
              disabled={acking}
              onClick={async () => {
                setAcking(true);
                await onAcknowledgeErp(plan.id, plan.version || 1);
                setAcking(false);
              }}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(201,169,110,0.3)",
                background: "rgba(201,169,110,0.08)", color: "#C9A96E", fontSize: 15, fontWeight: 600,
                cursor: acking ? "not-allowed" : "pointer", opacity: acking ? 0.5 : 1,
              }}
            >{acking ? "Acknowledging..." : "Acknowledge"}</button>
          </div>
        )}
        {!needsAck && myAck && plan.is_active && (
          <div style={{ ...cardStyle, padding: 12, marginBottom: 16, borderLeft: `3px solid ${GREEN}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
            <span style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>Acknowledged</span>
            <span style={{ fontSize: 12, color: MUTED }}>on {new Date(myAck.acknowledged_at).toLocaleDateString()}</span>
          </div>
        )}

        {/* Plan header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, lineHeight: 1.3, marginBottom: 6 }}>{plan.name}</div>
          {plan.description && (
            <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>{plan.description}</div>
          )}
          <div style={{
            display: "inline-block", marginTop: 8, padding: "3px 10px", borderRadius: 8,
            fontSize: 14, fontWeight: 600, background: `${cat.color}16`, color: cat.color,
            border: `1px solid ${cat.color}30`,
          }}>{cat.label}</div>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <style>{`@keyframes erpPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 48, background: BORDER, borderRadius: 8, marginBottom: 8, animation: "erpPulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : (
          <>
            {/* CHECKLIST */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: OFF_WHITE, marginBottom: 12,
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>Response Checklist</div>

              {sortedChecklist.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 14 }}>No checklist items.</div>
              ) : sortedChecklist.map((item, i) => (
                <div key={item.id || i} style={{
                  ...cardStyle, padding: 14, marginBottom: 8,
                  borderLeft: `3px solid ${item.is_critical ? RED : BORDER}`,
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Step number */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: item.is_critical ? `${RED}22` : BLACK,
                      border: `1px solid ${item.is_critical ? RED : BORDER}`,
                      color: item.is_critical ? RED : MUTED,
                      fontSize: 14, fontWeight: 700,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: WHITE, lineHeight: 1.5, fontWeight: 500 }}>
                        {item.action_text}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {item.responsible_role && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                            background: `${CYAN}16`, color: CYAN, border: `1px solid ${CYAN}30`,
                          }}>{item.responsible_role}</span>
                        )}
                        {item.time_target && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                            background: `${AMBER}16`, color: AMBER, border: `1px solid ${AMBER}30`,
                          }}>{item.time_target}</span>
                        )}
                        {item.is_critical && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 700,
                            background: `${RED}22`, color: RED, border: `1px solid ${RED}40`,
                          }}>CRITICAL</span>
                        )}
                      </div>
                      {item.notes && (
                        <div style={{ fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>{item.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CALL TREE */}
            {sortedCallTree.length > 0 && (
              <div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: OFF_WHITE, marginBottom: 12,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>Emergency Contacts</div>

                {sortedCallTree.map((contact, i) => (
                  <div key={contact.id || i} style={{
                    ...cardStyle, padding: 14, marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    {/* Priority number */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: BLACK, border: `1px solid ${BORDER}`,
                      color: MUTED, fontSize: 14, fontWeight: 700,
                    }}>{i + 1}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: WHITE }}>{contact.contact_name}</div>
                      <div style={{ fontSize: 14, color: MUTED }}>
                        {contact.contact_role}
                        {contact.is_external && (
                          <span style={{
                            marginLeft: 6, padding: "1px 6px", borderRadius: 4,
                            fontSize: 14, background: `${MUTED}22`, color: MUTED,
                          }}>External</span>
                        )}
                      </div>
                      {contact.notes && (
                        <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>{contact.notes}</div>
                      )}
                    </div>

                    {/* Phone — tappable */}
                    {contact.phone_primary && (
                      <a href={`tel:${contact.phone_primary.replace(/[^+\d]/g, "")}`} aria-label={`Call ${contact.contact_name}`} onClick={e => e.stopPropagation()} style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                        background: `${GREEN}16`, border: `1px solid ${GREEN}30`,
                        textDecoration: "none",
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── MAIN ERP VIEW ────────────────────────────────────────────
export default function MobileERPView({ erpPlans, onLoadChecklist, onLoadCallTree, onAcknowledgeErp, session }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const plans = (erpPlans || []).filter(p => p.is_active !== false);

  // Sync selected plan with upstream data
  const activePlan = selectedPlan ? (erpPlans || []).find(p => p.id === selectedPlan.id) || selectedPlan : null;

  if (activePlan) {
    return (
      <PlanDetail
        plan={activePlan}
        onLoadChecklist={onLoadChecklist}
        onLoadCallTree={onLoadCallTree}
        onBack={() => setSelectedPlan(null)}
        onAcknowledgeErp={onAcknowledgeErp}
        session={session}
      />
    );
  }

  if (plans.length === 0) return <EmptyState />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 14, color: MUTED, marginBottom: 12 }}>
        {plans.length} emergency plan{plans.length !== 1 ? "s" : ""}
      </div>
      {plans.map(plan => {
        const cat = ERP_CATEGORIES[plan.category] || ERP_CATEGORIES.general;
        return (
          <button key={plan.id} onClick={() => setSelectedPlan(plan)} aria-label={`${plan.name}, ${cat.label}`} style={{
            ...cardStyle, padding: 16, width: "100%", textAlign: "left", cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14,
            marginBottom: 10, borderLeft: `3px solid ${cat.color}`,
          }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{cat.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 2 }}>{plan.name}</div>
              <div style={{ fontSize: 14, color: MUTED }}>{cat.label}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}
