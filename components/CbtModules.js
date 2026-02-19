import { useState, useEffect, useMemo, useCallback } from "react";

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323", SUBTLE = "#555555";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE", AMBER = "#F59E0B";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const btn = { padding: "8px 14px", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer", border: "none", fontFamily: "inherit" };
const btnPrimary = { ...btn, background: WHITE, color: BLACK };
const btnGhost = { ...btn, background: "transparent", color: MUTED, border: `1px solid ${BORDER}` };

const CATEGORIES = [
  { id: "sms", label: "SMS" }, { id: "initial", label: "Initial" }, { id: "recurrent", label: "Recurrent" },
  { id: "aircraft_specific", label: "Aircraft" }, { id: "emergency", label: "Emergency" }, { id: "hazmat", label: "Hazmat" },
  { id: "security", label: "Security" }, { id: "crew_resource", label: "CRM" }, { id: "company", label: "Company" },
];

// ── COURSE BUILDER (Admin) ─────────────────────────────────────
function CourseForm({ course, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: course?.title || "", description: course?.description || "",
    category: course?.category || "sms", passingScore: course?.passing_score || 80,
    estimatedMinutes: course?.estimated_minutes || 30, requiredFor: course?.required_for || ["pilot"],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRole = r => set("requiredFor", form.requiredFor.includes(r) ? form.requiredFor.filter(x => x !== r) : [...form.requiredFor, r]);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{course ? "Edit Course" : "New Course"}</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.91–5.97 — Safety promotion training</div>
        </div>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Course Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. SMS Initial Training" style={inp} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="What this course covers..." style={{ ...inp, resize: "vertical" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Pass Score (%)</label>
          <input type="number" min={0} max={100} value={form.passingScore} onChange={e => set("passingScore", parseInt(e.target.value) || 80)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Est. Minutes</label>
          <input type="number" min={1} value={form.estimatedMinutes} onChange={e => set("estimatedMinutes", parseInt(e.target.value) || 30)} style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Required For</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["pilot", "safety_manager", "chief_pilot", "dispatcher", "admin"].map(r => (
            <button key={r} onClick={() => toggleRole(r)}
              style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: form.requiredFor.includes(r) ? `${CYAN}22` : "transparent",
                color: form.requiredFor.includes(r) ? CYAN : MUTED,
                border: `1px solid ${form.requiredFor.includes(r) ? CYAN : BORDER}` }}>
              {r.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => { if (form.title.trim()) onSave(form); }} disabled={!form.title.trim()}
        style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13, opacity: !form.title.trim() ? 0.4 : 1 }}>
        {course ? "Save Changes" : "Create Course"}
      </button>
    </div>
  );
}

// ── LESSON EDITOR ──────────────────────────────────────────────
function LessonEditor({ lesson, onSave, onCancel }) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [blocks, setBlocks] = useState(lesson?.content_blocks || []);
  const [questions, setQuestions] = useState(lesson?.quiz_questions || []);

  const addBlock = (type) => setBlocks(b => [...b, { type, content: "" }]);
  const updateBlock = (i, content) => setBlocks(b => b.map((bl, j) => j === i ? { ...bl, content } : bl));
  const removeBlock = (i) => setBlocks(b => b.filter((_, j) => j !== i));

  const addQuestion = () => setQuestions(q => [...q, { question: "", options: ["", "", "", ""], correct: 0, explanation: "" }]);
  const updateQuestion = (i, updates) => setQuestions(q => q.map((qu, j) => j === i ? { ...qu, ...updates } : qu));
  const removeQuestion = (i) => setQuestions(q => q.filter((_, j) => j !== i));

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{lesson ? "Edit Lesson" : "New Lesson"}</div>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Lesson Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to SMS" style={inp} />
      </div>

      {/* Content blocks */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Content</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[["heading", "H"], ["text", "¶"], ["callout", "!"]].map(([type, label]) => (
              <button key={type} onClick={() => addBlock(type)}
                style={{ ...btnGhost, padding: "3px 8px", fontSize: 10 }}>+ {label}</button>
            ))}
          </div>
        </div>
        {blocks.length === 0 && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12, ...card }}>No content yet. Add a heading, paragraph, or callout.</div>}
        {blocks.map((bl, i) => (
          <div key={i} style={{ marginBottom: 8, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: SUBTLE, textTransform: "uppercase", fontWeight: 700 }}>{bl.type}</span>
              <button onClick={() => removeBlock(i)} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}>✕</button>
            </div>
            {bl.type === "heading" ? (
              <input value={bl.content} onChange={e => updateBlock(i, e.target.value)} placeholder="Section heading" style={inp} />
            ) : (
              <textarea value={bl.content} onChange={e => updateBlock(i, e.target.value)} rows={bl.type === "callout" ? 2 : 4}
                placeholder={bl.type === "callout" ? "Key takeaway or important note..." : "Lesson content..."} style={{ ...inp, resize: "vertical" }} />
            )}
          </div>
        ))}
      </div>

      {/* Quiz questions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Quiz Questions (optional)</label>
          <button onClick={addQuestion} style={{ ...btnGhost, padding: "3px 8px", fontSize: 10 }}>+ Question</button>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: OFF_WHITE }}>Q{qi + 1}</span>
              <button onClick={() => removeQuestion(qi)} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
            </div>
            <input value={q.question} onChange={e => updateQuestion(qi, { question: e.target.value })} placeholder="Question text..." style={{ ...inp, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => updateQuestion(qi, { correct: oi })}
                    style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${q.correct === oi ? GREEN : BORDER}`,
                      background: q.correct === oi ? GREEN : "transparent", cursor: "pointer", flexShrink: 0 }} />
                  <input value={opt} onChange={e => {
                    const newOpts = [...q.options]; newOpts[oi] = e.target.value;
                    updateQuestion(qi, { options: newOpts });
                  }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
                </div>
              ))}
            </div>
            <input value={q.explanation || ""} onChange={e => updateQuestion(qi, { explanation: e.target.value })}
              placeholder="Explanation (shown after answer)" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
          </div>
        ))}
      </div>

      <button onClick={() => { if (title.trim()) onSave({ id: lesson?.id, title, contentBlocks: blocks, quizQuestions: questions, sortOrder: lesson?.sort_order ?? 0 }); }}
        disabled={!title.trim()} style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13, opacity: !title.trim() ? 0.4 : 1 }}>
        {lesson ? "Save Lesson" : "Add Lesson"}
      </button>
    </div>
  );
}

// ── LESSON VIEWER (Learner taking a lesson) ────────────────────
function LessonViewer({ lesson, course, progress, onComplete, onBack }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const quizzes = lesson.quiz_questions || [];
  const hasQuiz = quizzes.length > 0;
  const totalQs = quizzes.length;
  const score = useMemo(() => {
    if (!submitted || totalQs === 0) return 0;
    const correct = quizzes.filter((q, i) => answers[i] === q.correct).length;
    return Math.round((correct / totalQs) * 100);
  }, [submitted, answers, quizzes, totalQs]);
  const passed = score >= (course?.passing_score || 80);
  const alreadyCompleted = progress?.status === "completed";

  const handleSubmitQuiz = () => {
    setSubmitted(true);
    if (!hasQuiz || (score >= (course?.passing_score || 80))) {
      // Will be called after state updates via effect
    }
  };

  useEffect(() => {
    if (submitted && (passed || !hasQuiz)) {
      onComplete({ quizScore: hasQuiz ? score : null, quizAnswers: hasQuiz ? answers : null });
    }
  }, [submitted, passed]);

  const handleMarkComplete = () => {
    onComplete({ quizScore: null, quizAnswers: null });
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <button onClick={onBack} style={{ ...btnGhost, marginBottom: 16, fontSize: 11 }}>← Back to course</button>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: CYAN, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{course?.title}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: WHITE, margin: 0, fontFamily: "Georgia,serif" }}>{lesson.title}</h1>
      </div>

      {/* Content */}
      {!showQuiz && (
        <div style={{ marginBottom: 32 }}>
          {(lesson.content_blocks || []).map((bl, i) => {
            if (bl.type === "heading") return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: "24px 0 8px", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>{bl.content}</h2>;
            if (bl.type === "callout") return (
              <div key={i} style={{ padding: "12px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}22`, borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.6 }}>{bl.content}</div>
              </div>
            );
            return <p key={i} style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.7, marginBottom: 12 }}>{bl.content}</p>;
          })}

          {(lesson.content_blocks || []).length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: MUTED }}>This lesson has no content yet.</div>
          )}

          <div style={{ marginTop: 24 }}>
            {hasQuiz && !alreadyCompleted ? (
              <button onClick={() => setShowQuiz(true)} style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13 }}>
                Take Quiz ({totalQs} question{totalQs !== 1 ? "s" : ""}) →
              </button>
            ) : !alreadyCompleted ? (
              <button onClick={handleMarkComplete} style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13 }}>
                Mark as Complete ✓
              </button>
            ) : (
              <div style={{ textAlign: "center", padding: 16, color: GREEN, fontSize: 13, fontWeight: 700 }}>✓ Lesson completed</div>
            )}
          </div>
        </div>
      )}

      {/* Quiz */}
      {showQuiz && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Quiz — {totalQs} question{totalQs !== 1 ? "s" : ""} · {course?.passing_score || 80}% to pass</div>
          {quizzes.map((q, qi) => (
            <div key={qi} style={{ ...card, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, marginBottom: 10 }}>{qi + 1}. {q.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrect = submitted && q.correct === oi;
                  const isWrong = submitted && selected && !isCorrect;
                  let borderColor = selected ? WHITE : BORDER;
                  if (submitted) borderColor = isCorrect ? GREEN : isWrong ? RED : BORDER;
                  return (
                    <button key={oi} onClick={() => { if (!submitted) setAnswers(a => ({ ...a, [qi]: oi })); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6,
                        background: selected ? "rgba(255,255,255,0.04)" : "transparent",
                        border: `1px solid ${borderColor}`, cursor: submitted ? "default" : "pointer", textAlign: "left" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {(selected || isCorrect) && <div style={{ width: 10, height: 10, borderRadius: 5, background: isCorrect ? GREEN : isWrong ? RED : WHITE }} />}
                      </div>
                      <span style={{ fontSize: 12, color: isCorrect ? GREEN : isWrong ? RED : OFF_WHITE }}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: `${CYAN}08`, borderRadius: 4, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button onClick={handleSubmitQuiz} disabled={Object.keys(answers).length < totalQs}
              style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13, opacity: Object.keys(answers).length < totalQs ? 0.4 : 1, marginTop: 8 }}>
              Submit Answers
            </button>
          ) : (
            <div style={{ ...card, padding: "20px 24px", textAlign: "center", marginTop: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: passed ? GREEN : RED, fontFamily: "Georgia,serif" }}>{score}%</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: passed ? GREEN : RED, marginBottom: 4 }}>{passed ? "Passed!" : "Not Passed"}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{passed ? "This lesson is complete." : `You need ${course?.passing_score || 80}% to pass. Review the material and try again.`}</div>
              {!passed && (
                <button onClick={() => { setAnswers({}); setSubmitted(false); setShowQuiz(false); }}
                  style={{ ...btnGhost, marginTop: 12 }}>Review Lesson</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COURSE DETAIL VIEW ─────────────────────────────────────────
function CourseDetail({ course, lessons, progress, enrollments, orgProfiles, profile, isAdmin,
  onStartLesson, onEditCourse, onEditLesson, onNewLesson, onDeleteLesson, onPublish, onBack }) {
  const myEnrollment = enrollments.find(e => e.course_id === course.id && e.user_id === profile?.id);
  const lessonCount = lessons.length;
  const completedCount = lessons.filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")).length;
  const isComplete = lessonCount > 0 && completedCount === lessonCount;

  // Admin: enrollment stats
  const totalUsers = orgProfiles.length;
  const enrolledUsers = enrollments.filter(e => e.course_id === course.id).length;
  const completedUsers = enrollments.filter(e => e.course_id === course.id && e.status === "completed").length;

  return (
    <div style={{ maxWidth: 800 }}>
      <button onClick={onBack} style={{ ...btnGhost, marginBottom: 16, fontSize: 11 }}>← All Courses</button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
              background: course.status === "published" ? `${GREEN}22` : `${YELLOW}22`,
              color: course.status === "published" ? GREEN : YELLOW }}>{course.status}</span>
            <span style={{ fontSize: 10, color: MUTED }}>{CATEGORIES.find(c => c.id === course.category)?.label || course.category} · {course.estimated_minutes} min</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: WHITE, margin: "0 0 4px", fontFamily: "Georgia,serif" }}>{course.title}</h1>
          {course.description && <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{course.description}</p>}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {course.status === "draft" && lessonCount > 0 && (
              <button onClick={onPublish} style={{ ...btn, background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44` }}>Publish</button>
            )}
            <button onClick={onEditCourse} style={btnGhost}>Edit</button>
            <button onClick={onNewLesson} style={btnPrimary}>+ Lesson</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 8, marginBottom: 20 }} className="stat-grid">
        <div style={{ ...card, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{lessonCount}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Lessons</div>
        </div>
        <div style={{ ...card, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: isComplete ? GREEN : CYAN, fontFamily: "Georgia,serif" }}>{completedCount}/{lessonCount}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>My Progress</div>
        </div>
        <div style={{ ...card, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{course.passing_score}%</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Pass Score</div>
        </div>
        {isAdmin && (
          <div style={{ ...card, padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{completedUsers}/{totalUsers}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Completed</div>
          </div>
        )}
      </div>

      {/* Lesson list */}
      {lessons.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: MUTED }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
          <div style={{ fontSize: 13 }}>No lessons yet.{isAdmin ? " Add one to get started." : ""}</div>
        </div>
      ) : lessons.map((l, i) => {
        const myProgress = progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id);
        const isLessonComplete = myProgress?.status === "completed";
        const hasQuiz = (l.quiz_questions || []).length > 0;
        return (
          <div key={l.id} style={{ ...card, padding: "14px 18px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12,
            borderLeft: `3px solid ${isLessonComplete ? GREEN : BORDER}`, cursor: "pointer", transition: "all 0.15s" }}
            onClick={() => onStartLesson(l)}>
            <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: isLessonComplete ? `${GREEN}22` : NEAR_BLACK, border: `1px solid ${isLessonComplete ? GREEN : BORDER}`, flexShrink: 0 }}>
              {isLessonComplete ? <span style={{ color: GREEN, fontSize: 14 }}>✓</span> : <span style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{l.title}</div>
              <div style={{ fontSize: 10, color: MUTED }}>
                {(l.content_blocks || []).length} block{(l.content_blocks || []).length !== 1 ? "s" : ""}
                {hasQuiz && ` · ${(l.quiz_questions || []).length} quiz question${(l.quiz_questions || []).length !== 1 ? "s" : ""}`}
                {myProgress?.quiz_score != null && ` · Score: ${myProgress.quiz_score}%`}
              </div>
            </div>
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); onEditLesson(l); }} style={{ ...btnGhost, padding: "4px 10px", fontSize: 10 }}>Edit</button>
            )}
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); if (confirm("Delete this lesson?")) onDeleteLesson(l.id); }} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            )}
          </div>
        );
      })}

      {/* Admin: user progress table */}
      {isAdmin && orgProfiles.length > 0 && lessons.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: OFF_WHITE, marginBottom: 8 }}>Team Progress</div>
          <div style={{ ...card, overflow: "hidden" }}>
            {orgProfiles.map(u => {
              const userLessonsComplete = lessons.filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === u.id && p.status === "completed")).length;
              const pct = lessonCount > 0 ? Math.round((userLessonsComplete / lessonCount) * 100) : 0;
              return (
                <div key={u.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 10, fontWeight: 700 }}>
                    {(u.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{u.full_name}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{userLessonsComplete}/{lessonCount} lessons</div>
                  </div>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: NEAR_BLACK, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : CYAN, borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pct === 100 ? GREEN : MUTED, width: 36, textAlign: "right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN CBT COMPONENT ─────────────────────────────────────────
export default function CbtModules({
  profile, session, orgProfiles,
  courses, lessons: allLessonsMap, progress, enrollments,
  onCreateCourse, onUpdateCourse, onDeleteCourse,
  onSaveLesson, onDeleteLesson,
  onUpdateProgress, onUpdateEnrollment,
  onPublishCourse, onRefresh,
}) {
  const [view, setView] = useState("catalog"); // catalog, course_detail, lesson, new_course, edit_course, new_lesson, edit_lesson
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const isAdmin = profile?.role === "admin" || profile?.role === "safety_manager";
  const publishedCourses = courses.filter(c => c.status === "published" || isAdmin);

  const openCourse = (c) => { setSelectedCourse(c); setView("course_detail"); };
  const openLesson = (l) => { setSelectedLesson(l); setView("lesson"); };

  const handleCompleteLesson = async (result) => {
    if (!selectedCourse || !selectedLesson) return;
    await onUpdateProgress(selectedCourse.id, selectedLesson.id, {
      status: "completed",
      quizScore: result.quizScore,
      quizAnswers: result.quizAnswers,
      completedAt: new Date().toISOString(),
    });
    // Check if all lessons in course are now complete
    const courseLessons = allLessonsMap[selectedCourse.id] || [];
    const updatedProgress = [...progress, { course_id: selectedCourse.id, lesson_id: selectedLesson.id, user_id: profile.id, status: "completed" }];
    const allDone = courseLessons.every(l =>
      updatedProgress.find(p => p.lesson_id === l.id && p.user_id === profile.id && p.status === "completed")
    );
    if (allDone) {
      const certNum = `CBT-${Date.now().toString(36).toUpperCase()}`;
      await onUpdateEnrollment(selectedCourse.id, { status: "completed", completedAt: new Date().toISOString(), certificateNumber: certNum });
    } else {
      await onUpdateEnrollment(selectedCourse.id, { status: "in_progress" });
    }
    onRefresh();
  };

  // Catalog view
  if (view === "catalog") {
    // Stats
    const totalCourses = publishedCourses.length;
    const myCompleted = enrollments.filter(e => e.user_id === profile?.id && e.status === "completed").length;
    const myInProgress = enrollments.filter(e => e.user_id === profile?.id && e.status === "in_progress").length;

    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>CBT Modules</div>
            <div style={{ fontSize: 11, color: MUTED }}>§5.91–5.97 — Computer-based training and safety promotion</div>
          </div>
          {isAdmin && <button onClick={() => setView("new_course")} style={btnPrimary}>+ New Course</button>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }} className="stat-grid">
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{totalCourses}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Courses</div>
          </div>
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{myCompleted}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Completed</div>
          </div>
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: CYAN, fontFamily: "Georgia,serif" }}>{myInProgress}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>In Progress</div>
          </div>
        </div>

        {publishedCourses.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 14 }}>No courses available yet.</div>
            {isAdmin && <div style={{ fontSize: 12, marginTop: 4 }}>Create one to get started.</div>}
          </div>
        ) : publishedCourses.map(c => {
          const courseLessons = c.lessons || [];
          const myEnrollment = enrollments.find(e => e.course_id === c.id && e.user_id === profile?.id);
          const myLessonsComplete = courseLessons.filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")).length;
          const pct = courseLessons.length > 0 ? Math.round((myLessonsComplete / courseLessons.length) * 100) : 0;
          const cat = CATEGORIES.find(ca => ca.id === c.category);
          const statusColor = myEnrollment?.status === "completed" ? GREEN : myEnrollment?.status === "in_progress" ? CYAN : MUTED;

          return (
            <div key={c.id} onClick={() => openCourse(c)}
              style={{ ...card, padding: "16px 20px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s" }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: NEAR_BLACK, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>📖</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{c.title}</span>
                  {c.status === "draft" && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: `${YELLOW}22`, color: YELLOW }}>DRAFT</span>}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  {cat?.label || c.category} · {courseLessons.length} lesson{courseLessons.length !== 1 ? "s" : ""} · {c.estimated_minutes} min
                  {c.required_for?.length > 0 && ` · Required: ${c.required_for.join(", ")}`}
                </div>
                {courseLessons.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, maxWidth: 200, height: 4, borderRadius: 2, background: NEAR_BLACK, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : CYAN, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>{pct}%</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 16, color: MUTED }}>→</span>
            </div>
          );
        })}
      </div>
    );
  }

  // New/Edit course
  if (view === "new_course" || view === "edit_course") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <CourseForm course={view === "edit_course" ? selectedCourse : null}
          onSave={async (form) => {
            if (view === "edit_course" && selectedCourse) {
              await onUpdateCourse(selectedCourse.id, { title: form.title, description: form.description, category: form.category, passing_score: form.passingScore, estimated_minutes: form.estimatedMinutes, required_for: form.requiredFor });
            } else {
              await onCreateCourse(form);
            }
            onRefresh();
            setView("catalog");
          }}
          onCancel={() => setView(selectedCourse ? "course_detail" : "catalog")} />
      </div>
    );
  }

  // New/Edit lesson
  if (view === "new_lesson" || view === "edit_lesson") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <LessonEditor lesson={view === "edit_lesson" ? selectedLesson : null}
          onSave={async (lessonData) => {
            const sortOrder = view === "new_lesson" ? (allLessonsMap[selectedCourse.id]?.length || 0) : lessonData.sortOrder;
            await onSaveLesson(selectedCourse.id, { ...lessonData, sortOrder });
            onRefresh();
            setView("course_detail");
          }}
          onCancel={() => setView("course_detail")} />
      </div>
    );
  }

  // Course detail
  if (view === "course_detail" && selectedCourse) {
    const courseLessons = allLessonsMap[selectedCourse.id] || [];
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <CourseDetail course={selectedCourse} lessons={courseLessons} progress={progress} enrollments={enrollments}
          orgProfiles={orgProfiles} profile={profile} isAdmin={isAdmin}
          onStartLesson={openLesson} onEditCourse={() => setView("edit_course")}
          onEditLesson={l => { setSelectedLesson(l); setView("edit_lesson"); }}
          onNewLesson={() => setView("new_lesson")}
          onDeleteLesson={async (id) => { await onDeleteLesson(id); onRefresh(); }}
          onPublish={async () => { await onUpdateCourse(selectedCourse.id, { status: "published" }); onRefresh(); setSelectedCourse(prev => ({ ...prev, status: "published" })); }}
          onBack={() => { setView("catalog"); setSelectedCourse(null); }} />
      </div>
    );
  }

  // Lesson viewer
  if (view === "lesson" && selectedLesson && selectedCourse) {
    const myProgress = progress.find(p => p.lesson_id === selectedLesson.id && p.user_id === profile?.id);
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <LessonViewer lesson={selectedLesson} course={selectedCourse} progress={myProgress}
          onComplete={handleCompleteLesson}
          onBack={() => setView("course_detail")} />
      </div>
    );
  }

  return null;
}
