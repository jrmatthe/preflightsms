import { useState, useMemo, useEffect, useCallback } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const CARD = "#222222", NEAR_BLACK = "#0A0A0A", BLACK = "#000000";
const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777";
const BORDER = "#2E2E2E";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };
const inp = { width: "100%", padding: "10px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 14, boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 };

const DIMENSIONS = {
  reporting_culture: "Reporting Culture",
  just_culture: "Just Culture",
  learning_culture: "Learning Culture",
  management_commitment: "Management Commitment",
  safety_engagement: "Safety Engagement",
};

const LIKERT_LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

const STANDARD_QUESTIONS = [
  { id: "q1", text: "I feel comfortable reporting safety concerns without fear of reprisal", category: "reporting_culture", response_type: "likert_5", required: true },
  { id: "q2", text: "I believe safety reports are taken seriously by management", category: "reporting_culture", response_type: "likert_5", required: true },
  { id: "q3", text: "I know how to submit a safety report in our system", category: "reporting_culture", response_type: "likert_5", required: true },
  { id: "q4", text: "I have submitted at least one safety report in the past 12 months", category: "reporting_culture", response_type: "yes_no", required: true },
  { id: "q5", text: "I receive feedback on safety reports I submit", category: "reporting_culture", response_type: "likert_5", required: true },
  { id: "q6", text: "I believe our reporting system protects reporter confidentiality", category: "reporting_culture", response_type: "likert_5", required: true },
  { id: "q7", text: "I trust that honest mistakes will not result in punishment", category: "just_culture", response_type: "likert_5", required: true },
  { id: "q8", text: "There is a clear line between acceptable and unacceptable behavior", category: "just_culture", response_type: "likert_5", required: true },
  { id: "q9", text: "Management responds fairly to safety events", category: "just_culture", response_type: "likert_5", required: true },
  { id: "q10", text: "People are encouraged to speak up about unsafe conditions", category: "just_culture", response_type: "likert_5", required: true },
  { id: "q11", text: "I feel my safety concerns are heard at all levels of the organization", category: "just_culture", response_type: "likert_5", required: true },
  { id: "q12", text: "Our organization learns from safety events and near-misses", category: "learning_culture", response_type: "likert_5", required: true },
  { id: "q13", text: "Safety lessons are communicated effectively to all personnel", category: "learning_culture", response_type: "likert_5", required: true },
  { id: "q14", text: "Training helps me perform my job more safely", category: "learning_culture", response_type: "likert_5", required: true },
  { id: "q15", text: "I have received adequate SMS training", category: "learning_culture", response_type: "likert_5", required: true },
  { id: "q16", text: "Changes are made based on safety data and feedback", category: "learning_culture", response_type: "likert_5", required: true },
  { id: "q17", text: "Senior management demonstrates a genuine commitment to safety", category: "management_commitment", response_type: "likert_5", required: true },
  { id: "q18", text: "Safety is prioritized over schedule and cost pressure", category: "management_commitment", response_type: "likert_5", required: true },
  { id: "q19", text: "Adequate resources are allocated to safety", category: "management_commitment", response_type: "likert_5", required: true },
  { id: "q20", text: "Safety goals are clearly communicated", category: "management_commitment", response_type: "likert_5", required: true },
  { id: "q21", text: "Management is visibly involved in safety activities", category: "management_commitment", response_type: "likert_5", required: true },
  { id: "q22", text: "I feel personally responsible for safety in my role", category: "safety_engagement", response_type: "likert_5", required: true },
  { id: "q23", text: "I actively look for hazards during my daily work", category: "safety_engagement", response_type: "likert_5", required: true },
  { id: "q24", text: "I participate in safety meetings and discussions", category: "safety_engagement", response_type: "likert_5", required: true },
  { id: "q25", text: "I would stop an operation if I believed it was unsafe", category: "safety_engagement", response_type: "likert_5", required: true },
  { id: "q26", text: "What is the single most important thing our organization could do to improve safety?", category: "open_text", response_type: "open_text", required: false },
  { id: "q27", text: "Is there anything else you would like to share about our safety culture?", category: "open_text", response_type: "open_text", required: false },
];

function scoreColor(score) {
  if (score >= 4) return GREEN;
  if (score >= 3) return YELLOW;
  if (score >= 2) return AMBER;
  return RED;
}

function scoreColorBg(score) {
  if (score >= 4.5) return `${GREEN}44`;
  if (score >= 4.0) return `${GREEN}22`;
  if (score >= 3.5) return `${YELLOW}22`;
  if (score >= 3.0) return `${YELLOW}15`;
  if (score >= 2.5) return `${AMBER}22`;
  if (score >= 2.0) return `${AMBER}15`;
  return `${RED}22`;
}

// ── Gauge component ──
function Gauge({ value, max, label, color, size = 120 }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const r = size / 2 - 10;
  const endX = size / 2 + r * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const endY = size / 2 - r * Math.sin(Math.PI - (angle * Math.PI) / 180) + 10;
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path d={`M 10 ${size / 2 + 10} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none" stroke={BORDER} strokeWidth="8" strokeLinecap="round" />
        {pct > 0 && (
          <path d={`M 10 ${size / 2 + 10} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none" stroke={color || CYAN} strokeWidth="8" strokeLinecap="round" />
        )}
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={WHITE} fontSize="22" fontWeight="800" fontFamily="Georgia,serif">
          {typeof value === "number" ? value.toFixed(1) : value}
        </text>
      </svg>
      <div style={{ fontSize: 9, color: MUTED, marginTop: -4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// ── Survey Form (respondent view) ──
function SurveyForm({ survey, onSubmit, onCancel }) {
  const questions = survey.questions || [];
  const [answers, setAnswers] = useState({});
  const [currentDim, setCurrentDim] = useState(0);

  const dims = useMemo(() => {
    const groups = {};
    questions.forEach(q => {
      const cat = q.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(q);
    });
    return Object.entries(groups);
  }, [questions]);

  const totalRequired = questions.filter(q => q.required).length;
  const answeredRequired = questions.filter(q => q.required && answers[q.id] !== undefined && answers[q.id] !== "").length;
  const progress = totalRequired > 0 ? Math.round(answeredRequired / totalRequired * 100) : 0;

  const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }));

  const handleSubmit = () => {
    const missing = questions.filter(q => q.required && (answers[q.id] === undefined || answers[q.id] === ""));
    if (missing.length > 0) return;
    onSubmit(Object.entries(answers).map(([question_id, value]) => ({ question_id, value })));
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{survey.title}</div>
          {survey.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{survey.description}</div>}
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Back</button>}
      </div>

      {survey.is_anonymous && (
        <div style={{ padding: "10px 14px", background: `${GREEN}11`, border: `1px solid ${GREEN}33`, borderRadius: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>Your responses are anonymous. Management cannot see who submitted which answers.</div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: MUTED }}>Progress</span>
          <span style={{ fontSize: 10, color: WHITE, fontWeight: 600 }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: NEAR_BLACK, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? GREEN : CYAN, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Dimension tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {dims.map(([cat, qs], i) => {
          const dimAnswered = qs.filter(q => answers[q.id] !== undefined && answers[q.id] !== "").length;
          const dimDone = dimAnswered === qs.length;
          return (
            <button key={cat} onClick={() => setCurrentDim(i)}
              style={{ padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: i === currentDim ? WHITE : "transparent",
                color: i === currentDim ? BLACK : dimDone ? GREEN : MUTED,
                border: `1px solid ${i === currentDim ? WHITE : dimDone ? GREEN + "44" : BORDER}` }}>
              {DIMENSIONS[cat] || cat} {dimDone ? "\u2713" : `${dimAnswered}/${qs.length}`}
            </button>
          );
        })}
      </div>

      {/* Questions */}
      {dims[currentDim] && dims[currentDim][1].map((q, qi) => (
        <div key={q.id} style={{ ...card, padding: "16px 18px", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: WHITE, fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}>
            <span style={{ color: MUTED, marginRight: 6 }}>{questions.indexOf(q) + 1}.</span>
            {q.text}
            {q.required && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
          </div>

          {q.response_type === "likert_5" && (
            <div style={{ display: "flex", gap: 4 }}>
              {[1,2,3,4,5].map(v => (
                <button key={v} onClick={() => setAnswer(q.id, v)}
                  style={{ flex: 1, padding: "10px 4px", borderRadius: 6, fontSize: 10, cursor: "pointer", textAlign: "center",
                    background: answers[q.id] === v ? `${CYAN}33` : NEAR_BLACK,
                    color: answers[q.id] === v ? CYAN : MUTED,
                    border: `1px solid ${answers[q.id] === v ? CYAN : BORDER}`,
                    fontWeight: answers[q.id] === v ? 700 : 400 }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{v}</div>
                  <div style={{ fontSize: 8, lineHeight: 1.2 }}>{LIKERT_LABELS[v - 1]}</div>
                </button>
              ))}
            </div>
          )}

          {q.response_type === "yes_no" && (
            <div style={{ display: "flex", gap: 8 }}>
              {["Yes", "No"].map(v => (
                <button key={v} onClick={() => setAnswer(q.id, v)}
                  style={{ flex: 1, padding: "12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: answers[q.id] === v ? `${CYAN}33` : NEAR_BLACK,
                    color: answers[q.id] === v ? CYAN : MUTED,
                    border: `1px solid ${answers[q.id] === v ? CYAN : BORDER}` }}>
                  {v}
                </button>
              ))}
            </div>
          )}

          {q.response_type === "open_text" && (
            <textarea style={{ ...inp, resize: "vertical", fontFamily: "inherit", minHeight: 80 }}
              placeholder="Your response..." value={answers[q.id] || ""}
              onChange={e => setAnswer(q.id, e.target.value)} />
          )}
        </div>
      ))}

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={() => setCurrentDim(Math.max(0, currentDim - 1))} disabled={currentDim === 0}
          style={{ padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: currentDim === 0 ? "default" : "pointer",
            background: "transparent", color: currentDim === 0 ? MUTED : OFF_WHITE, border: `1px solid ${currentDim === 0 ? BORDER : "#3A3A3A"}` }}>
          Previous
        </button>
        {currentDim < dims.length - 1 ? (
          <button onClick={() => setCurrentDim(currentDim + 1)}
            style={{ padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: CYAN, color: BLACK, border: "none" }}>
            Next Section
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={progress < 100}
            style={{ padding: "8px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: progress < 100 ? "default" : "pointer",
              background: progress < 100 ? MUTED : WHITE, color: BLACK, border: "none", opacity: progress < 100 ? 0.5 : 1 }}>
            Submit Survey
          </button>
        )}
      </div>
    </div>
  );
}

// ── Calculate results from responses ──
function calculateResults(survey, responses, totalOrgMembers) {
  const questions = survey.questions || [];
  const likertQs = questions.filter(q => q.response_type === "likert_5");
  const dimScores = {};

  Object.keys(DIMENSIONS).forEach(dim => {
    const dimQs = likertQs.filter(q => q.category === dim);
    if (dimQs.length === 0) { dimScores[dim] = 0; return; }
    let total = 0, count = 0;
    responses.forEach(r => {
      const ans = r.answers || [];
      dimQs.forEach(q => {
        const a = ans.find(a => a.question_id === q.id);
        if (a && typeof a.value === "number") { total += a.value; count++; }
      });
    });
    dimScores[dim] = count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
  });

  const allScores = Object.values(dimScores).filter(v => v > 0);
  const overall = allScores.length > 0 ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)) : 0;
  const responseRate = totalOrgMembers > 0 ? parseFloat((responses.length / totalOrgMembers * 100).toFixed(1)) : 0;

  return {
    overall_score: overall,
    dimension_scores: dimScores,
    response_rate: responseRate,
    total_responses: responses.length,
  };
}

// ── Results Dashboard ──
function ResultsDashboard({ survey, results, allResults, responses, onExportPdf }) {
  if (!results) return <div style={{ textAlign: "center", padding: "40px 0", color: MUTED }}>No results calculated yet.</div>;

  const dimScores = results.dimension_scores || {};
  const radarData = Object.entries(DIMENSIONS).map(([key, label]) => ({
    dimension: label, score: dimScores[key] || 0, fullMark: 5,
  }));

  // Question-level scores
  const questionScores = useMemo(() => {
    const questions = survey.questions || [];
    return questions.filter(q => q.response_type === "likert_5").map(q => {
      let total = 0, count = 0;
      (responses || []).forEach(r => {
        const a = (r.answers || []).find(a => a.question_id === q.id);
        if (a && typeof a.value === "number") { total += a.value; count++; }
      });
      return { ...q, avg: count > 0 ? parseFloat((total / count).toFixed(2)) : 0, count };
    });
  }, [survey, responses]);

  // Open text responses
  const openTexts = useMemo(() => {
    const questions = (survey.questions || []).filter(q => q.response_type === "open_text");
    return questions.map(q => ({
      ...q,
      texts: (responses || []).map(r => {
        const a = (r.answers || []).find(a => a.question_id === q.id);
        return a?.value;
      }).filter(t => t && t.trim()),
    }));
  }, [survey, responses]);

  // Comparison data across surveys
  const comparisonData = useMemo(() => {
    if (!allResults || allResults.length < 2) return null;
    return Object.entries(DIMENSIONS).map(([key, label]) => {
      const entry = { dimension: label };
      allResults.forEach((r, i) => {
        entry[`survey_${i}`] = r.dimension_scores?.[key] || 0;
      });
      return entry;
    });
  }, [allResults]);

  const COMPARE_COLORS = [CYAN, GREEN, YELLOW, AMBER, RED];

  return (
    <div>
      {/* Top gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }} className="stat-grid">
        <div style={{ ...card, padding: "16px", textAlign: "center" }}>
          <Gauge value={results.overall_score || 0} max={5} label="Safety Culture Index" color={scoreColor(results.overall_score)} size={140} />
        </div>
        <div style={{ ...card, padding: "16px", textAlign: "center" }}>
          <Gauge value={results.response_rate || 0} max={100} label="Response Rate %" color={results.response_rate >= 70 ? GREEN : results.response_rate >= 50 ? YELLOW : RED} size={140} />
        </div>
        <div style={{ ...card, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif", marginTop: 16 }}>{results.total_responses}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>Total Responses</div>
        </div>
      </div>

      {/* Radar chart */}
      <div style={{ ...card, padding: "20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Culture Dimension Scores</div>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={BORDER} />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: MUTED, fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: MUTED, fontSize: 9 }} />
            <Radar name="Score" dataKey="score" stroke={CYAN} fill={CYAN} fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          {Object.entries(DIMENSIONS).map(([key, label]) => (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(dimScores[key] || 0) }}>{(dimScores[key] || 0).toFixed(1)}</div>
              <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison chart */}
      {comparisonData && (
        <div style={{ ...card, padding: "20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Survey Comparison Over Time</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="dimension" tick={{ fill: MUTED, fontSize: 9 }} />
              <YAxis domain={[0, 5]} tick={{ fill: MUTED, fontSize: 9 }} />
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11 }} />
              {allResults.map((r, i) => (
                <Bar key={i} dataKey={`survey_${i}`} name={`Survey ${allResults.length - i}`} fill={COMPARE_COLORS[i % COMPARE_COLORS.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Question heatmap */}
      <div style={{ ...card, padding: "20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Question-Level Heatmap</div>
        {Object.entries(DIMENSIONS).map(([dimKey, dimLabel]) => {
          const dimQs = questionScores.filter(q => q.category === dimKey);
          if (dimQs.length === 0) return null;
          return (
            <div key={dimKey} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: OFF_WHITE, marginBottom: 6 }}>{dimLabel}</div>
              {dimQs.map(q => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", marginBottom: 2, borderRadius: 4, background: scoreColorBg(q.avg) }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(q.avg), minWidth: 32, textAlign: "center" }}>{q.avg.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: OFF_WHITE, flex: 1 }}>{q.text}</span>
                  <span style={{ fontSize: 9, color: MUTED }}>{q.count} resp.</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Open text responses */}
      {openTexts.some(q => q.texts.length > 0) && (
        <div style={{ ...card, padding: "20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Open Text Responses</div>
          {openTexts.map(q => (
            <div key={q.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>{q.text}</div>
              {q.texts.map((t, i) => (
                <div key={i} style={{ padding: "8px 12px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 4, fontSize: 11, color: OFF_WHITE, lineHeight: 1.5, borderLeft: `3px solid ${CYAN}33` }}>
                  {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      <button onClick={onExportPdf}
        style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: WHITE, color: BLACK, border: "none" }}>
        Export PDF Report
      </button>
    </div>
  );
}

// ── Main Component ──
export default function SafetyCultureSurvey({
  profile, session, orgProfiles,
  surveys, onCreateSurvey, onUpdateSurvey, onDeleteSurvey,
  onFetchResponses, onSubmitResponse, onCheckUserResponse,
  onFetchResults, onUpsertResults,
}) {
  const [view, setView] = useState("list"); // list, create, edit, take, results, submitted
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [results, setResults] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [editQuestions, setEditQuestions] = useState([]);
  const [editForm, setEditForm] = useState({ title: "", description: "", is_anonymous: true, start_date: "", end_date: "", template_type: "standard" });
  const [userResponded, setUserResponded] = useState({});

  const isAdmin = ["admin", "safety_manager", "accountable_exec"].includes(profile?.role);
  const activeSurveys = (surveys || []).filter(s => s.status === "active");

  // Check which active surveys the user has already responded to
  useEffect(() => {
    if (!session?.user?.id || !activeSurveys.length) return;
    activeSurveys.forEach(async (s) => {
      if (userResponded[s.id] !== undefined) return;
      const { data } = await onCheckUserResponse(s.id, session.user.id);
      setUserResponded(prev => ({ ...prev, [s.id]: !!data }));
    });
  }, [surveys, session]);

  const handleCreateNew = (type) => {
    const q = type === "standard" ? [...STANDARD_QUESTIONS] : [];
    setEditQuestions(q);
    setEditForm({ title: type === "standard" ? "Safety Culture Survey" : "", description: type === "standard" ? "Annual safety culture assessment aligned with Part 5 SMS requirements" : "", is_anonymous: true, start_date: "", end_date: "", template_type: type });
    setView("create");
  };

  const handleSave = async (asDraft) => {
    if (!editForm.title.trim()) return;
    const data = {
      ...editForm,
      questions: editQuestions,
      status: asDraft ? "draft" : "active",
      created_by: profile?.id,
    };
    if (selectedSurvey) {
      await onUpdateSurvey(selectedSurvey.id, data);
    } else {
      await onCreateSurvey(data);
    }
    setView("list");
    setSelectedSurvey(null);
  };

  const handleLaunch = async (survey) => {
    await onUpdateSurvey(survey.id, { status: "active", start_date: new Date().toISOString().split("T")[0] });
  };

  const handleClose = async (survey) => {
    await onUpdateSurvey(survey.id, { status: "closed", end_date: new Date().toISOString().split("T")[0] });
    // Calculate and store results
    const { data: resp } = await onFetchResponses(survey.id);
    const totalMembers = (orgProfiles || []).length;
    const calculated = calculateResults(survey, resp || [], totalMembers);
    await onUpsertResults(survey.id, calculated);
  };

  const handleTakeSurvey = (survey) => {
    setSelectedSurvey(survey);
    setView("take");
  };

  const handleSubmitResponse = async (answers) => {
    await onSubmitResponse({
      survey_id: selectedSurvey.id,
      respondent_id: selectedSurvey.is_anonymous ? null : session?.user?.id,
      respondent_role: profile?.role || "unknown",
      answers,
    });
    setUserResponded(prev => ({ ...prev, [selectedSurvey.id]: true }));
    setView("submitted");
  };

  const handleViewResults = async (survey) => {
    setSelectedSurvey(survey);
    const { data: resp } = await onFetchResponses(survey.id);
    setResponses(resp || []);
    const { data: res } = await onFetchResults(survey.id);
    setResults(res);
    // Load all results for comparison
    const closedSurveys = (surveys || []).filter(s => s.status === "closed");
    const allRes = [];
    for (const s of closedSurveys) {
      const { data: r } = await onFetchResults(s.id);
      if (r) allRes.push(r);
    }
    setAllResults(allRes);
    setView("results");
  };

  const handleEdit = (survey) => {
    setSelectedSurvey(survey);
    setEditForm({ title: survey.title, description: survey.description || "", is_anonymous: survey.is_anonymous, start_date: survey.start_date || "", end_date: survey.end_date || "", template_type: survey.template_type });
    setEditQuestions(survey.questions || []);
    setView("edit");
  };

  const handleExportPdf = async () => {
    if (!selectedSurvey || !results) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 50;
    let y = 50;

    const checkPage = (needed) => { if (y + needed > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 50; } };

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Safety Culture Survey Report", W / 2, y, { align: "center" });
    y += 20;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(selectedSurvey.title, W / 2, y, { align: "center" });
    y += 30;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Overall Results", margin, y); y += 18;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Safety Culture Index: ${results.overall_score?.toFixed(1)} / 5.0`, margin + 10, y); y += 14;
    doc.text(`Response Rate: ${results.response_rate?.toFixed(0)}%`, margin + 10, y); y += 14;
    doc.text(`Total Responses: ${results.total_responses}`, margin + 10, y); y += 20;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Dimension Scores", margin, y); y += 18;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    Object.entries(DIMENSIONS).forEach(([key, label]) => {
      checkPage(14);
      const score = results.dimension_scores?.[key] || 0;
      doc.text(`${label}: ${score.toFixed(1)} / 5.0`, margin + 10, y); y += 14;
    });
    y += 10;

    // Question scores
    checkPage(40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Question-Level Scores", margin, y); y += 18;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const questions = (selectedSurvey.questions || []).filter(q => q.response_type === "likert_5");
    questions.forEach(q => {
      let total = 0, count = 0;
      (responses || []).forEach(r => {
        const a = (r.answers || []).find(a => a.question_id === q.id);
        if (a && typeof a.value === "number") { total += a.value; count++; }
      });
      const avg = count > 0 ? (total / count).toFixed(1) : "N/A";
      checkPage(14);
      doc.text(`[${avg}] ${q.text}`, margin + 10, y, { maxWidth: W - margin * 2 - 20 });
      y += 14;
    });
    y += 10;

    // Open text
    const openQs = (selectedSurvey.questions || []).filter(q => q.response_type === "open_text");
    openQs.forEach(q => {
      checkPage(30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(q.text, margin, y, { maxWidth: W - margin * 2 }); y += 16;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      (responses || []).forEach(r => {
        const a = (r.answers || []).find(a => a.question_id === q.id);
        if (a?.value && a.value.trim()) {
          checkPage(14);
          doc.text(`- ${a.value}`, margin + 10, y, { maxWidth: W - margin * 2 - 20 });
          y += 14;
        }
      });
      y += 8;
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated by PreflightSMS on ${new Date().toLocaleDateString()}`, W / 2, doc.internal.pageSize.getHeight() - 30, { align: "center" });

    doc.save(`Safety_Culture_Report_${selectedSurvey.title.replace(/\s+/g, "_")}.pdf`);
  };

  // ── Submitted confirmation ──
  if (view === "submitted") {
    return (
      <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2713"}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Thank You!</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 24 }}>Your survey response has been submitted{selectedSurvey?.is_anonymous ? " anonymously" : ""}. Your feedback helps improve our safety culture.</div>
        <button onClick={() => { setView("list"); setSelectedSurvey(null); }}
          style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: WHITE, color: BLACK, border: "none" }}>
          Back to Surveys
        </button>
      </div>
    );
  }

  // ── Take survey ──
  if (view === "take" && selectedSurvey) {
    return <SurveyForm survey={selectedSurvey} onSubmit={handleSubmitResponse} onCancel={() => { setView("list"); setSelectedSurvey(null); }} />;
  }

  // ── View results ──
  if (view === "results" && selectedSurvey) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>{selectedSurvey.title} — Results</div>
            <div style={{ fontSize: 11, color: MUTED }}>{results?.total_responses || 0} responses collected</div>
          </div>
          <button onClick={() => { setView("list"); setSelectedSurvey(null); }}
            style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>
            Back
          </button>
        </div>
        <ResultsDashboard survey={selectedSurvey} results={results} allResults={allResults} responses={responses} onExportPdf={handleExportPdf} />
      </div>
    );
  }

  // ── Create/Edit form ──
  if (view === "create" || view === "edit") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>{view === "edit" ? "Edit Survey" : "New Survey"}</div>
          <button onClick={() => { setView("list"); setSelectedSurvey(null); }}
            style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Survey Title *</label>
          <input style={inp} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" style={inp} value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" style={inp} value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Anonymous</label>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => setEditForm(f => ({ ...f, is_anonymous: v }))}
                  style={{ flex: 1, padding: "8px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: editForm.is_anonymous === v ? `${CYAN}33` : NEAR_BLACK,
                    color: editForm.is_anonymous === v ? CYAN : MUTED,
                    border: `1px solid ${editForm.is_anonymous === v ? CYAN : BORDER}` }}>
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Questions ({editQuestions.length})</div>
        {editQuestions.map((q, i) => (
          <div key={q.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: MUTED, minWidth: 20, paddingTop: 2 }}>{i + 1}.</span>
            <div style={{ flex: 1 }}>
              <input style={{ ...inp, padding: "6px 8px", fontSize: 11 }} value={q.text}
                onChange={e => setEditQuestions(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <select style={{ ...inp, width: "auto", padding: "4px 8px", fontSize: 9 }} value={q.category}
                  onChange={e => setEditQuestions(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                  {Object.entries(DIMENSIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  <option value="open_text">Open Text</option>
                </select>
                <select style={{ ...inp, width: "auto", padding: "4px 8px", fontSize: 9 }} value={q.response_type}
                  onChange={e => setEditQuestions(prev => prev.map((x, j) => j === i ? { ...x, response_type: e.target.value } : x))}>
                  <option value="likert_5">Likert 1-5</option>
                  <option value="yes_no">Yes/No</option>
                  <option value="open_text">Open Text</option>
                </select>
              </div>
            </div>
            <button onClick={() => setEditQuestions(prev => prev.filter((_, j) => j !== i))}
              style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", paddingTop: 4 }}>X</button>
          </div>
        ))}
        <button onClick={() => setEditQuestions(prev => [...prev, { id: `q_custom_${Date.now()}`, text: "", category: "reporting_culture", response_type: "likert_5", required: true }])}
          style={{ marginTop: 6, fontSize: 10, color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
          + Add Question
        </button>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={() => handleSave(true)}
            style={{ flex: 1, padding: "12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent", color: OFF_WHITE, border: `1px solid ${BORDER}` }}>
            Save as Draft
          </button>
          <button onClick={() => handleSave(false)} disabled={!editForm.title.trim()}
            style={{ flex: 1, padding: "12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: WHITE, color: BLACK, border: "none", opacity: !editForm.title.trim() ? 0.4 : 1 }}>
            Save &amp; Launch
          </button>
        </div>
      </div>
    );
  }

  // ── Survey List ──
  return (
    <div>
      {/* Active surveys for respondents */}
      {activeSurveys.filter(s => !userResponded[s.id]).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Surveys Awaiting Your Response</div>
          {activeSurveys.filter(s => !userResponded[s.id]).map(s => (
            <div key={s.id} style={{ ...card, padding: "14px 18px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{s.title}</div>
                {s.description && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{s.description}</div>}
                {s.is_anonymous && <div style={{ fontSize: 9, color: GREEN, marginTop: 4 }}>Anonymous survey</div>}
              </div>
              <button onClick={() => handleTakeSurvey(s)}
                style={{ padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: WHITE, color: BLACK, border: "none", whiteSpace: "nowrap" }}>
                Take Survey
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed surveys */}
      {activeSurveys.filter(s => userResponded[s.id]).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {activeSurveys.filter(s => userResponded[s.id]).map(s => (
            <div key={s.id} style={{ ...card, padding: "14px 18px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{s.title}</div>
                <div style={{ fontSize: 10, color: GREEN, marginTop: 2 }}>{"\u2713"} Response submitted</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin section */}
      {isAdmin && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5 }}>Survey Management</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => handleCreateNew("standard")}
                style={{ padding: "8px 14px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", background: WHITE, color: BLACK, border: "none" }}>
                + Standard Template
              </button>
              <button onClick={() => handleCreateNew("custom")}
                style={{ padding: "8px 14px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: "transparent", color: OFF_WHITE, border: `1px solid ${BORDER}` }}>
                + Custom Survey
              </button>
            </div>
          </div>

          {(surveys || []).length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 14, color: OFF_WHITE, fontWeight: 600, marginBottom: 4 }}>No Surveys Yet</div>
              <div style={{ fontSize: 11, color: MUTED }}>Create your first safety culture survey using the standard template or build a custom one.</div>
            </div>
          )}

          {(surveys || []).map(s => {
            const st = s.status === "active" ? { label: "Active", color: GREEN } : s.status === "closed" ? { label: "Closed", color: MUTED } : { label: "Draft", color: YELLOW };
            return (
              <div key={s.id} style={{ ...card, padding: "14px 18px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{s.title}</span>
                      <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}33`, fontWeight: 600 }}>{st.label}</span>
                      {s.template_type === "standard" && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${CYAN}15`, color: CYAN }}>Standard</span>}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                      {s.questions?.length || 0} questions
                      {s.start_date && ` \u00B7 ${s.start_date}`}
                      {s.end_date && ` to ${s.end_date}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {s.status === "draft" && (
                      <>
                        <button onClick={() => handleEdit(s)} style={{ fontSize: 10, color: CYAN, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Edit</button>
                        <button onClick={() => handleLaunch(s)} style={{ fontSize: 10, color: GREEN, background: `${GREEN}15`, border: `1px solid ${GREEN}33`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>Launch</button>
                      </>
                    )}
                    {s.status === "active" && (
                      <button onClick={() => handleClose(s)} style={{ fontSize: 10, color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}33`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>Close Survey</button>
                    )}
                    {s.status === "closed" && (
                      <button onClick={() => handleViewResults(s)} style={{ fontSize: 10, color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>View Results</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
