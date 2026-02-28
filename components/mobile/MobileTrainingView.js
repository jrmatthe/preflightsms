import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const BLACK = "#000000";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };

const CATEGORIES = [
  { id: "sms", label: "SMS" }, { id: "initial", label: "Initial" }, { id: "recurrent", label: "Recurrent" },
  { id: "aircraft_specific", label: "Aircraft" }, { id: "emergency", label: "Emergency" }, { id: "hazmat", label: "Hazmat" },
  { id: "security", label: "Security" }, { id: "crew_resource", label: "CRM" }, { id: "company", label: "Company" },
  { id: "other", label: "Other" },
];

function getEmbedUrl(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

// ── SKELETON ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...cardStyle, padding: 16, marginBottom: 10 }}>
      <style>{`@keyframes mtvPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      <div style={{ height: 14, width: "60%", background: BORDER, borderRadius: 4, marginBottom: 10, animation: "mtvPulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 10, width: "40%", background: BORDER, borderRadius: 4, marginBottom: 12, animation: "mtvPulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 6, width: "100%", background: BORDER, borderRadius: 3, animation: "mtvPulse 1.5s ease-in-out infinite" }} />
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────
function EmptyState({ title, subtitle, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${CYAN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {icon}
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>{subtitle}</div>
    </div>
  );
}

// ── BACK HEADER ───────────────────────────────────────────────
function BackHeader({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: WHITE, fontSize: 20, padding: 4,
        cursor: "pointer", display: "flex", alignItems: "center", minWidth: 44, minHeight: 44,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: WHITE }}>{title}</div>
      {right}
    </div>
  );
}

// ── SEGMENTED CONTROL ─────────────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: "flex", background: BLACK, borderRadius: 10, padding: 3,
      border: `1px solid ${BORDER}`,
    }}>
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 600,
          border: "none", cursor: "pointer", fontFamily: "inherit",
          background: value === opt.id ? CARD : "transparent",
          color: value === opt.id ? WHITE : MUTED,
          transition: "all 0.2s",
        }}>
          {opt.label}
          {opt.badge > 0 && (
            <span style={{
              display: "inline-block", marginLeft: 6, padding: "1px 6px", borderRadius: 8,
              fontSize: 14, fontWeight: 700,
              background: opt.badgeColor === "red" ? `${RED}22` : `${AMBER}22`,
              color: opt.badgeColor === "red" ? RED : AMBER,
            }}>{opt.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────
function ProgressBar({ pct, height = 6, color }) {
  const c = color || (pct >= 100 ? GREEN : CYAN);
  return (
    <div style={{ width: "100%", height, borderRadius: height / 2, background: `${WHITE}08`, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: height / 2, background: c, transition: "width 0.4s ease" }} />
    </div>
  );
}

// ── COURSE CARD ───────────────────────────────────────────────
function CourseCard({ course, lessons, progress, enrollment, trainingStatus, profile, onTap }) {
  const lessonCount = (lessons || []).length;
  const completedCount = (lessons || []).filter(l =>
    (progress || []).find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")
  ).length;
  const pct = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;
  const isComplete = lessonCount > 0 && completedCount === lessonCount;
  const catLabel = CATEGORIES.find(c => c.id === course.category)?.label || course.category;

  let statusBadge = null;
  if (trainingStatus === "expired") {
    statusBadge = { label: "Expired", bg: `${RED}16`, color: RED, border: `${RED}30` };
  } else if (trainingStatus === "expiring") {
    statusBadge = { label: "Expiring Soon", bg: `${AMBER}16`, color: AMBER, border: `${AMBER}30` };
  } else if (trainingStatus === "not_completed") {
    statusBadge = { label: "Required", bg: `${YELLOW}16`, color: YELLOW, border: `${YELLOW}30` };
  } else if (isComplete) {
    statusBadge = { label: "Complete", bg: `${GREEN}16`, color: GREEN, border: `${GREEN}30` };
  }

  return (
    <button onClick={onTap} style={{
      ...cardStyle, padding: 16, width: "100%", textAlign: "left", cursor: "pointer",
      display: "block", fontFamily: "inherit", marginBottom: 10,
      borderLeft: `3px solid ${isComplete ? GREEN : trainingStatus === "expired" ? RED : trainingStatus === "expiring" ? AMBER : BORDER}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 4, lineHeight: 1.3 }}>{course.title}</div>
          <div style={{ fontSize: 14, color: MUTED }}>
            {catLabel} {course.estimated_minutes ? `\u00B7 ${course.estimated_minutes} min` : ""}
          </div>
        </div>
        {statusBadge && (
          <span style={{
            padding: "3px 8px", borderRadius: 8, fontSize: 14, fontWeight: 600, flexShrink: 0,
            background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
          }}>{statusBadge.label}</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar pct={pct} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: isComplete ? GREEN : MUTED, flexShrink: 0 }}>
          {completedCount}/{lessonCount}
        </span>
      </div>
    </button>
  );
}

// ── COMPLIANCE ITEM ───────────────────────────────────────────
function ComplianceItem({ record, requirement, onTap }) {
  const now = new Date();
  let status = "current";
  let statusColor = GREEN;
  let statusLabel = "Current";
  let daysText = "";

  if (record.expiry_date) {
    const exp = new Date(record.expiry_date);
    if (exp < now) {
      status = "expired";
      statusColor = RED;
      statusLabel = "Expired";
      const daysAgo = Math.ceil((now - exp) / (1000 * 60 * 60 * 24));
      daysText = `${daysAgo}d overdue`;
    } else {
      const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 30) {
        status = "expiring";
        statusColor = AMBER;
        statusLabel = "Expiring";
        daysText = `${daysLeft}d left`;
      } else {
        daysText = `${daysLeft}d left`;
      }
    }
  } else {
    statusLabel = "No Expiry";
  }

  return (
    <button onClick={onTap} style={{
      ...cardStyle, padding: 14, width: "100%", textAlign: "left", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", marginBottom: 8,
    }}>
      {/* Status dot */}
      <div style={{
        width: 10, height: 10, borderRadius: 5, flexShrink: 0,
        background: statusColor,
        boxShadow: `0 0 6px ${statusColor}44`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {record.title}
        </div>
        <div style={{ fontSize: 14, color: MUTED }}>
          {record.completed_date ? `Completed ${new Date(record.completed_date).toLocaleDateString()}` : "Not completed"}
          {daysText && ` \u00B7 ${daysText}`}
        </div>
      </div>
      <span style={{
        padding: "3px 8px", borderRadius: 8, fontSize: 14, fontWeight: 600, flexShrink: 0,
        background: `${statusColor}16`, color: statusColor, border: `1px solid ${statusColor}30`,
      }}>{statusLabel}</span>
    </button>
  );
}

// ── LESSON STEPPER ────────────────────────────────────────────
function LessonStepper({ lessons, progress, profile, onStartLesson }) {
  return (
    <div style={{ padding: "0 16px" }}>
      {lessons.map((lesson, i) => {
        const myProgress = (progress || []).find(p => p.lesson_id === lesson.id && p.user_id === profile?.id);
        const isComplete = myProgress?.status === "completed";
        const isLast = i === lessons.length - 1;
        const hasQuiz = (lesson.quiz_questions || []).length > 0;

        return (
          <div key={lesson.id} style={{ display: "flex", gap: 14 }}>
            {/* Timeline */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                background: isComplete ? `${GREEN}22` : BLACK,
                border: `2px solid ${isComplete ? GREEN : BORDER}`,
              }}>
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <span style={{ color: MUTED, fontSize: 14, fontWeight: 700 }}>{i + 1}</span>
                )}
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, minHeight: 20, background: isComplete ? `${GREEN}44` : BORDER }} />
              )}
            </div>

            {/* Content */}
            <button onClick={() => onStartLesson(lesson)} style={{
              flex: 1, ...cardStyle, padding: 14, marginBottom: isLast ? 0 : 10, textAlign: "left",
              cursor: "pointer", fontFamily: "inherit", display: "block", width: "100%",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 4 }}>{lesson.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: MUTED }}>
                {(lesson.content_blocks || []).length > 0 && (
                  <span>{(lesson.content_blocks || []).length} section{(lesson.content_blocks || []).length !== 1 ? "s" : ""}</span>
                )}
                {hasQuiz && <span>{"\u00B7"} {(lesson.quiz_questions || []).length} quiz Q{(lesson.quiz_questions || []).length !== 1 ? "s" : ""}</span>}
                {myProgress?.quiz_score != null && (
                  <span style={{ color: myProgress.quiz_score >= 80 ? GREEN : RED }}>{"\u00B7"} Score: {myProgress.quiz_score}%</span>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── LESSON CONTENT VIEW ──────────────────────────────────────
function LessonContentView({ lesson, course, progress, onComplete, onBack, onStartQuiz }) {
  const alreadyCompleted = progress?.status === "completed";
  const hasQuiz = (lesson.quiz_questions || []).length > 0;

  const handleMarkComplete = () => {
    onComplete({ quizScore: null, quizAnswers: null });
  };

  return (
    <div>
      <BackHeader title={lesson.title} onBack={onBack} />

      <div style={{ padding: 16 }}>
        {/* Course breadcrumb */}
        <div style={{ fontSize: 14, color: CYAN, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
          {course?.title}
        </div>

        {/* Content blocks */}
        {(lesson.content_blocks || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: MUTED, fontSize: 14 }}>This lesson has no content yet.</div>
        ) : (
          (lesson.content_blocks || []).map((bl, i) => {
            if (bl.type === "heading") {
              return (
                <h2 key={i} style={{
                  fontSize: 18, fontWeight: 700, color: WHITE, margin: "28px 0 10px",
                  paddingBottom: 8, borderBottom: `1px solid ${BORDER}`,
                }}>{bl.content}</h2>
              );
            }
            if (bl.type === "callout") {
              return (
                <div key={i} style={{
                  padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}22`,
                  borderRadius: 10, marginBottom: 14, borderLeft: `3px solid ${CYAN}`,
                }}>
                  <div style={{ fontSize: 15, color: OFF_WHITE, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{bl.content}</div>
                </div>
              );
            }
            if (bl.type === "video") {
              const embedUrl = getEmbedUrl(bl.content);
              if (embedUrl) {
                return (
                  <div key={i} style={{
                    position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 16,
                    borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}`,
                  }}>
                    <iframe src={embedUrl} style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none",
                    }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                );
              }
              return (
                <div key={i} style={{
                  padding: 16, background: BLACK, border: `1px solid ${BORDER}`, borderRadius: 10,
                  marginBottom: 14, textAlign: "center",
                }}>
                  <div style={{ fontSize: 14, color: MUTED }}>Invalid video URL</div>
                </div>
              );
            }
            // text
            return (
              <p key={i} style={{
                fontSize: 15, color: OFF_WHITE, lineHeight: 1.8, marginBottom: 14, whiteSpace: "pre-wrap",
              }}>{bl.content}</p>
            );
          })
        )}

        {/* Bottom action */}
        <div style={{ marginTop: 32, paddingBottom: 24 }}>
          {alreadyCompleted ? (
            <div style={{ textAlign: "center", padding: 16 }}>
              <div style={{ color: GREEN, fontSize: 15, fontWeight: 700 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 6 }}><path d="M20 6L9 17l-5-5"/></svg>
                Lesson completed
              </div>
              {progress?.quiz_score != null && (
                <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>Quiz score: {progress.quiz_score}%</div>
              )}
            </div>
          ) : hasQuiz ? (
            <button onClick={onStartQuiz} style={{
              width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 600,
              background: WHITE, color: BLACK, border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              Take Quiz ({(lesson.quiz_questions || []).length} question{(lesson.quiz_questions || []).length !== 1 ? "s" : ""})
            </button>
          ) : (
            <button onClick={handleMarkComplete} style={{
              width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 600,
              background: WHITE, color: BLACK, border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              Mark as Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── QUIZ VIEW (one question per screen) ──────────────────────
function QuizView({ lesson, course, onComplete, onBack }) {
  const questions = lesson.quiz_questions || [];
  const total = questions.length;
  const passingScore = course?.passing_score || 80;

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const q = questions[currentQ];
  const selected = answers[currentQ];
  const isCorrect = selected === q?.correct;
  const allAnswered = Object.keys(answers).length === total;

  const score = useMemo(() => {
    if (!showResults) return 0;
    const correct = questions.filter((q, i) => answers[i] === q.correct).length;
    return Math.round((correct / total) * 100);
  }, [showResults, answers, questions, total]);

  const passed = score >= passingScore;
  const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;

  const handleSelect = (optIndex) => {
    if (showFeedback) return;
    setAnswers(prev => ({ ...prev, [currentQ]: optIndex }));
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    if (currentQ < total - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRetake = () => {
    setCurrentQ(0);
    setAnswers({});
    setShowFeedback(false);
    setShowResults(false);
  };

  const handleFinish = () => {
    onComplete({ quizScore: score, quizAnswers: answers });
  };

  // Results screen
  if (showResults) {
    return (
      <div>
        <BackHeader title="Quiz Results" onBack={onBack} />
        <div style={{ padding: 24, textAlign: "center" }}>
          {/* Score circle */}
          <div style={{
            width: 120, height: 120, borderRadius: 60, margin: "24px auto",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            border: `4px solid ${passed ? GREEN : RED}`,
            background: `${passed ? GREEN : RED}08`,
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: passed ? GREEN : RED }}>{score}%</div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: passed ? GREEN : RED, marginBottom: 6 }}>
            {passed ? "Passed!" : "Not Passed"}
          </div>
          <div style={{ fontSize: 15, color: MUTED, marginBottom: 8 }}>
            {correctCount} of {total} correct
          </div>
          <div style={{ fontSize: 14, color: MUTED, marginBottom: 32 }}>
            {passed ? "Great work! This lesson is now complete." : `You need ${passingScore}% to pass. Review the material and try again.`}
          </div>

          {/* Question summary */}
          <div style={{ textAlign: "left", marginBottom: 32 }}>
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const correct = userAnswer === q.correct;
              return (
                <div key={i} style={{ ...cardStyle, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: correct ? `${GREEN}22` : `${RED}22`,
                    }}>
                      {correct ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 4 }}>Q{i + 1}. {q.question}</div>
                      {!correct && (
                        <div style={{ fontSize: 14, color: MUTED }}>
                          Your answer: {q.options[userAnswer]} {"\u00B7"} Correct: {q.options[q.correct]}
                        </div>
                      )}
                    </div>
                  </div>
                  {q.explanation && (
                    <div style={{
                      marginTop: 8, padding: "8px 10px", background: `${CYAN}08`, borderRadius: 6,
                      fontSize: 14, color: MUTED, lineHeight: 1.5,
                    }}>{q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>

          {passed ? (
            <button onClick={handleFinish} style={{
              width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 600,
              background: GREEN, color: BLACK, border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              Continue
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onBack} style={{
                flex: 1, padding: "16px 0", borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: "inherit",
              }}>
                Review Lesson
              </button>
              <button onClick={handleRetake} style={{
                flex: 1, padding: "16px 0", borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: WHITE, color: BLACK, border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
                Retake Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Question screen
  return (
    <div>
      <BackHeader title={`Question ${currentQ + 1} of ${total}`} onBack={onBack} />

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, padding: "12px 16px", justifyContent: "center" }}>
        {questions.map((_, i) => {
          const answered = answers[i] !== undefined;
          const isCurrent = i === currentQ;
          return (
            <div key={i} style={{
              height: 4, borderRadius: 2, flex: 1, maxWidth: 40,
              background: isCurrent ? WHITE : answered ? (answers[i] === questions[i].correct ? GREEN : RED) : `${WHITE}22`,
              transition: "all 0.3s",
            }} />
          );
        })}
      </div>

      <div style={{ padding: "16px 16px 24px" }}>
        {/* Question */}
        <div style={{ fontSize: 18, fontWeight: 600, color: WHITE, marginBottom: 24, lineHeight: 1.4 }}>
          {q.question}
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {q.options.map((opt, oi) => {
            const isSelected = selected === oi;
            const optCorrect = showFeedback && q.correct === oi;
            const optWrong = showFeedback && isSelected && !optCorrect;

            let borderColor = BORDER;
            let bg = "transparent";
            if (showFeedback) {
              if (optCorrect) { borderColor = GREEN; bg = `${GREEN}12`; }
              else if (optWrong) { borderColor = RED; bg = `${RED}12`; }
            } else if (isSelected) {
              borderColor = WHITE; bg = `${WHITE}06`;
            }

            return (
              <button key={oi} onClick={() => handleSelect(oi)} disabled={showFeedback} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 14px", borderRadius: 12,
                background: bg, border: `1.5px solid ${borderColor}`, cursor: showFeedback ? "default" : "pointer",
                textAlign: "left", fontFamily: "inherit", transition: "all 0.2s", minHeight: 52,
              }}>
                {/* Radio */}
                <div style={{
                  width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                  border: `2px solid ${showFeedback ? (optCorrect ? GREEN : optWrong ? RED : BORDER) : isSelected ? WHITE : BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {(isSelected || optCorrect) && (
                    <div style={{
                      width: 12, height: 12, borderRadius: 6,
                      background: optCorrect ? GREEN : optWrong ? RED : WHITE,
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: 15, color: optCorrect ? GREEN : optWrong ? RED : OFF_WHITE, flex: 1,
                }}>{opt}</span>
                {showFeedback && optCorrect && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                )}
                {showFeedback && optWrong && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation (shown after answer) */}
        {showFeedback && q.explanation && (
          <div style={{
            padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}22`,
            borderRadius: 10, marginBottom: 24, borderLeft: `3px solid ${CYAN}`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: CYAN, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Explanation</div>
            <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.6 }}>{q.explanation}</div>
          </div>
        )}

        {/* Next button */}
        {showFeedback && (
          <button onClick={handleNext} style={{
            width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 600,
            background: WHITE, color: BLACK, border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
            {currentQ < total - 1 ? "Next Question" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── COURSE DETAIL VIEW ───────────────────────────────────────
function CourseDetailView({ course, lessons, progress, enrollment, profile, onStartLesson, onBack }) {
  const lessonCount = (lessons || []).length;
  const completedCount = (lessons || []).filter(l =>
    (progress || []).find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")
  ).length;
  const pct = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;
  const isComplete = lessonCount > 0 && completedCount === lessonCount;
  const catLabel = CATEGORIES.find(c => c.id === course.category)?.label || course.category;

  return (
    <div>
      <BackHeader title="Course" onBack={onBack} />

      <div style={{ padding: 16 }}>
        {/* Course header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 700, textTransform: "uppercase",
              background: `${GREEN}22`, color: GREEN,
            }}>Published</span>
            <span style={{ fontSize: 14, color: MUTED }}>{catLabel} {course.estimated_minutes ? `\u00B7 ${course.estimated_minutes} min` : ""}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: WHITE, lineHeight: 1.3, marginBottom: 8 }}>{course.title}</div>
          {course.description && (
            <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>{course.description}</div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          <div style={{ ...cardStyle, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{lessonCount}</div>
            <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>Lessons</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: isComplete ? GREEN : CYAN }}>{completedCount}/{lessonCount}</div>
            <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>Progress</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{course.passing_score || 80}%</div>
            <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>To Pass</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 14, color: MUTED }}>Overall Progress</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: isComplete ? GREEN : WHITE }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} height={8} />
        </div>

        {/* Certificate */}
        {isComplete && enrollment?.certificate_number && (
          <div style={{
            ...cardStyle, padding: 16, marginBottom: 24, textAlign: "center",
            borderColor: `${GREEN}44`, background: `${GREEN}06`,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
              <circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: GREEN, marginBottom: 2 }}>Course Complete</div>
            <div style={{ fontSize: 14, color: MUTED }}>Certificate: {enrollment.certificate_number}</div>
          </div>
        )}

        {/* Lesson list as stepper */}
        <div style={{ fontSize: 14, fontWeight: 600, color: OFF_WHITE, marginBottom: 12 }}>Lessons</div>
        {lessonCount === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 14 }}>No lessons available yet.</div>
        ) : (
          <LessonStepper lessons={lessons} progress={progress} profile={profile} onStartLesson={onStartLesson} />
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function MobileTrainingView({
  courses, lessonsMap, progress, enrollments,
  trainingRequirements, trainingRecords,
  profile, session,
  onUpdateProgress, onUpdateEnrollment, onLogTraining, onRefresh,
}) {
  // Navigation: home | course | lesson | quiz
  const [view, setView] = useState("home");
  const [segment, setSegment] = useState("courses"); // courses | compliance
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollRef = useRef(null);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = async (e) => {
    if (!onRefresh) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    const atTop = scrollRef.current ? scrollRef.current.scrollTop <= 0 : true;
    if (diff > 80 && atTop && view === "home") {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  // Published courses only (non-admins)
  const publishedCourses = useMemo(() => {
    return (courses || []).filter(c => c.status === "published");
  }, [courses]);

  // Per-course training status for current user
  const courseTrainingStatusMap = useMemo(() => {
    const now = new Date();
    const map = {};
    for (const course of publishedCourses) {
      const req = (trainingRequirements || []).find(r => r.title === course.title);
      if (!req) continue;
      const myRecord = (trainingRecords || [])
        .filter(r => r.user_id === profile?.id && r.requirement_id === req.id)
        .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""))[0];
      if (!myRecord) { map[course.id] = "not_completed"; continue; }
      if (!myRecord.expiry_date) continue;
      const exp = new Date(myRecord.expiry_date);
      if (exp < now) map[course.id] = "expired";
      else if ((exp - now) / (1000 * 60 * 60 * 24) < 30) map[course.id] = "expiring";
    }
    return map;
  }, [publishedCourses, trainingRequirements, trainingRecords, profile]);

  // My compliance records
  const myRecords = useMemo(() => {
    return (trainingRecords || []).filter(r => r.user_id === profile?.id);
  }, [trainingRecords, profile]);

  // Compliance stats
  const complianceStats = useMemo(() => {
    const now = new Date();
    let current = 0, expiring = 0, expired = 0;
    myRecords.forEach(r => {
      if (!r.expiry_date) { current++; return; }
      const exp = new Date(r.expiry_date);
      if (exp < now) expired++;
      else {
        const daysLeft = (exp - now) / (1000 * 60 * 60 * 24);
        if (daysLeft < 30) expiring++;
        else current++;
      }
    });
    return { current, expiring, expired };
  }, [myRecords]);

  // Sort compliance: expired first, then expiring, then current
  const sortedRecords = useMemo(() => {
    const now = new Date();
    return [...myRecords].sort((a, b) => {
      const getUrgency = (r) => {
        if (!r.expiry_date) return 3; // no expiry = least urgent
        const exp = new Date(r.expiry_date);
        if (exp < now) return 0; // expired = most urgent
        const days = (exp - now) / (1000 * 60 * 60 * 24);
        if (days < 30) return 1; // expiring
        return 2; // current
      };
      return getUrgency(a) - getUrgency(b);
    });
  }, [myRecords]);

  // ── HANDLERS ──────────────────────────────────────────────
  const openCourse = (course) => {
    setSelectedCourse(course);
    setView("course");
  };

  const openLesson = (lesson) => {
    setSelectedLesson(lesson);
    setView("lesson");

    // Mark progress as in_progress if not already started
    if (onUpdateProgress && selectedCourse) {
      const existing = (progress || []).find(p => p.lesson_id === lesson.id && p.user_id === profile?.id);
      if (!existing || existing.status === "not_started") {
        onUpdateProgress(selectedCourse.id, lesson.id, {
          status: "in_progress",
          startedAt: new Date().toISOString(),
        });
      }
    }
  };

  const startQuiz = () => {
    setView("quiz");
  };

  const handleLessonComplete = useCallback(async (result) => {
    if (!onUpdateProgress || !selectedCourse || !selectedLesson) return;

    // Update lesson progress
    await onUpdateProgress(selectedCourse.id, selectedLesson.id, {
      status: "completed",
      quizScore: result.quizScore,
      quizAnswers: result.quizAnswers,
      completedAt: new Date().toISOString(),
    });

    // Check if all lessons in course are now completed
    const courseLessons = (lessonsMap || {})[selectedCourse.id] || [];
    const updatedProgress = [...(progress || [])];
    // Add the just-completed lesson to the check
    const alreadyTracked = updatedProgress.find(p => p.lesson_id === selectedLesson.id && p.user_id === profile?.id);
    if (alreadyTracked) {
      alreadyTracked.status = "completed";
    } else {
      updatedProgress.push({ lesson_id: selectedLesson.id, user_id: profile?.id, status: "completed" });
    }

    const allDone = courseLessons.every(l =>
      updatedProgress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")
    );

    if (allDone && onUpdateEnrollment) {
      const certNum = `CBT-${Date.now().toString(36).toUpperCase()}`;
      await onUpdateEnrollment(selectedCourse.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        certificateNumber: certNum,
      });

      // Auto-log training record if matching requirement
      if (onLogTraining) {
        const matchingReq = (trainingRequirements || []).find(r => r.title === selectedCourse.title);
        const completedDate = new Date().toISOString().slice(0, 10);
        const isDuplicate = matchingReq && (trainingRecords || []).some(r =>
          r.user_id === profile?.id && r.requirement_id === matchingReq?.id && r.completed_date === completedDate
        );
        if (!isDuplicate) {
          let expiryDate = null;
          if (matchingReq && matchingReq.frequency_months > 0) {
            const exp = new Date();
            exp.setMonth(exp.getMonth() + matchingReq.frequency_months);
            expiryDate = exp.toISOString().slice(0, 10);
          }
          await onLogTraining({
            title: selectedCourse.title,
            completedDate,
            requirementId: matchingReq?.id || null,
            expiryDate,
            instructor: "Computer-Based Training",
            notes: `Certificate: ${certNum}`,
          });
        }
      }
    } else if (onUpdateEnrollment) {
      await onUpdateEnrollment(selectedCourse.id, { status: "in_progress" });
    }

    // Refresh data then go back to course detail
    if (onRefresh) await onRefresh();
    setView("course");
  }, [selectedCourse, selectedLesson, lessonsMap, progress, profile, onUpdateProgress, onUpdateEnrollment, onLogTraining, trainingRequirements, trainingRecords, onRefresh]);

  // ── RENDER ────────────────────────────────────────────────

  // Quiz view
  if (view === "quiz" && selectedLesson && selectedCourse) {
    return (
      <QuizView
        lesson={selectedLesson}
        course={selectedCourse}
        onComplete={handleLessonComplete}
        onBack={() => setView("lesson")}
      />
    );
  }

  // Lesson content view
  if (view === "lesson" && selectedLesson && selectedCourse) {
    const myProgress = (progress || []).find(p => p.lesson_id === selectedLesson.id && p.user_id === profile?.id);
    return (
      <LessonContentView
        lesson={selectedLesson}
        course={selectedCourse}
        progress={myProgress}
        onComplete={handleLessonComplete}
        onBack={() => setView("course")}
        onStartQuiz={startQuiz}
      />
    );
  }

  // Course detail view
  if (view === "course" && selectedCourse) {
    const courseLessons = ((lessonsMap || {})[selectedCourse.id] || [])
      .slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const myEnrollment = (enrollments || []).find(e => e.course_id === selectedCourse.id && e.user_id === profile?.id);

    return (
      <CourseDetailView
        course={selectedCourse}
        lessons={courseLessons}
        progress={progress}
        enrollment={myEnrollment}
        profile={profile}
        onStartLesson={openLesson}
        onBack={() => { setSelectedCourse(null); setView("home"); }}
      />
    );
  }

  // Training home
  const loading = !courses;
  const segmentOptions = [
    { id: "courses", label: "Courses" },
    { id: "compliance", label: "My Compliance",
      badge: complianceStats.expired + complianceStats.expiring,
      badgeColor: complianceStats.expired > 0 ? "red" : "amber",
    },
  ];

  return (
    <div ref={scrollRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div style={{ textAlign: "center", padding: "12px 0", color: CYAN, fontSize: 14 }}>
          Refreshing...
        </div>
      )}

      <div style={{ padding: 16 }}>
        {/* Segment control */}
        <SegmentedControl options={segmentOptions} value={segment} onChange={setSegment} />

        {/* Compliance summary banner (shown in both segments if issues exist) */}
        {(complianceStats.expired > 0 || complianceStats.expiring > 0) && (
          <div style={{
            ...cardStyle, padding: 14, marginTop: 14,
            borderColor: complianceStats.expired > 0 ? `${RED}44` : `${AMBER}44`,
            background: complianceStats.expired > 0 ? `${RED}06` : `${AMBER}06`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={complianceStats.expired > 0 ? RED : AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
                  {complianceStats.expired > 0 ? `${complianceStats.expired} expired` : ""}
                  {complianceStats.expired > 0 && complianceStats.expiring > 0 ? ", " : ""}
                  {complianceStats.expiring > 0 ? `${complianceStats.expiring} expiring soon` : ""}
                </div>
                <div style={{ fontSize: 14, color: MUTED }}>
                  {segment === "courses" ? "Tap My Compliance to see details" : "Complete required courses to stay current"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : segment === "courses" ? (
            // COURSES LIST
            publishedCourses.length === 0 ? (
              <EmptyState
                title="No Courses Available"
                subtitle="Training courses will appear here when your organization publishes them."
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>}
              />
            ) : (
              publishedCourses.map(course => {
                const courseLessons = (lessonsMap || {})[course.id] || [];
                const myEnrollment = (enrollments || []).find(e => e.course_id === course.id && e.user_id === profile?.id);
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    lessons={courseLessons}
                    progress={progress}
                    enrollment={myEnrollment}
                    trainingStatus={courseTrainingStatusMap[course.id]}
                    profile={profile}
                    onTap={() => openCourse(course)}
                  />
                );
              })
            )
          ) : (
            // MY COMPLIANCE LIST
            sortedRecords.length === 0 ? (
              <EmptyState
                title="No Training Records"
                subtitle="Complete courses to build your training history and track compliance."
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
              />
            ) : (
              <>
                {/* Stats pills */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Current", count: complianceStats.current, color: GREEN },
                    { label: "Expiring", count: complianceStats.expiring, color: AMBER },
                    { label: "Expired", count: complianceStats.expired, color: RED },
                  ].map(s => (
                    <div key={s.label} style={{
                      ...cardStyle, flex: 1, padding: "10px 8px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.count > 0 ? s.color : MUTED }}>{s.count}</div>
                      <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {sortedRecords.map(record => {
                  const req = (trainingRequirements || []).find(r => r.id === record.requirement_id);
                  return (
                    <ComplianceItem
                      key={record.id}
                      record={record}
                      requirement={req}
                      onTap={() => {
                        // Try to navigate to matching course
                        const matchingCourse = publishedCourses.find(c => c.title === record.title);
                        if (matchingCourse) openCourse(matchingCourse);
                      }}
                    />
                  );
                })}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
