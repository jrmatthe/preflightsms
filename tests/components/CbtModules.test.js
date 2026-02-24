import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CbtModules from "../../components/CbtModules";

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                    */
/* ------------------------------------------------------------------ */

const adminProfile = { id: "u1", role: "admin", full_name: "Admin User" };
const pilotProfile = { id: "u2", role: "pilot", full_name: "Pilot User" };
const safetyMgrProfile = { id: "u3", role: "safety_manager", full_name: "Safety Mgr" };

const session = { user: { id: "u1" } };

const orgProfiles = [
  { id: "u1", full_name: "Admin User" },
  { id: "u2", full_name: "Pilot User" },
  { id: "u3", full_name: "Safety Mgr" },
];

const mockLesson1 = {
  id: "l1", title: "Lesson One", sort_order: 0,
  content_blocks: [{ type: "text", content: "Hello world" }],
  quiz_questions: [{ question: "Q1?", options: ["A", "B", "C", "D"], correct: 0, explanation: "Because A" }],
};

const mockLesson2 = {
  id: "l2", title: "Lesson Two", sort_order: 1,
  content_blocks: [{ type: "heading", content: "Heading" }],
  quiz_questions: [],
};

const mockCourse1 = {
  id: "c1", title: "SMS Foundations", description: "Learn SMS basics", category: "sms",
  status: "published", passing_score: 80, estimated_minutes: 30,
  required_for: ["pilot"], lessons: [{ id: "l1" }, { id: "l2" }],
};

const mockCourse2 = {
  id: "c2", title: "Emergency Procedures", description: "Emergency training", category: "emergency",
  status: "published", passing_score: 80, estimated_minutes: 45,
  required_for: ["pilot", "admin"], lessons: [{ id: "l3" }],
};

const mockDraftCourse = {
  id: "c3", title: "Draft Course", description: "Still drafting", category: "security",
  status: "draft", passing_score: 70, estimated_minutes: 15,
  required_for: ["pilot"], lessons: [],
};

const mockEnrollmentInProgress = { course_id: "c1", user_id: "u1", status: "in_progress" };
const mockEnrollmentCompleted = { course_id: "c2", user_id: "u1", status: "completed" };

const mockRequirement1 = {
  id: "r1", title: "SMS Training", description: "SMS basics", category: "sms",
  required_for: ["pilot"], frequency_months: 12,
};

const mockRequirement2 = {
  id: "r2", title: "Initial Safety", description: "One-time safety", category: "initial",
  required_for: ["pilot", "admin"], frequency_months: 0,
};

const now = new Date();
const futureDate = new Date(now);
futureDate.setMonth(futureDate.getMonth() + 6);
const soonDate = new Date(now);
soonDate.setDate(soonDate.getDate() + 15);
const pastDate = new Date(now);
pastDate.setMonth(pastDate.getMonth() - 2);

const mockRecordCurrent = {
  id: "tr1", title: "SMS Training", user_id: "u1", completed_date: "2025-01-15",
  expiry_date: futureDate.toISOString().slice(0, 10), instructor: "John",
  requirement_id: "r1", user: { full_name: "Admin User" },
};

const mockRecordExpiring = {
  id: "tr2", title: "Emergency Training", user_id: "u1", completed_date: "2025-01-15",
  expiry_date: soonDate.toISOString().slice(0, 10), instructor: "Jane",
  requirement_id: "r2", user: { full_name: "Admin User" },
};

const mockRecordExpired = {
  id: "tr3", title: "Hazmat Training", user_id: "u1", completed_date: "2024-06-15",
  expiry_date: pastDate.toISOString().slice(0, 10), instructor: "Bob",
  requirement_id: "r1", user: { full_name: "Admin User" },
};

const mockRecordOtherUser = {
  id: "tr4", title: "Pilot Training", user_id: "u2", completed_date: "2025-03-01",
  expiry_date: futureDate.toISOString().slice(0, 10), instructor: "Sam",
  requirement_id: "r1", user: { full_name: "Pilot User" },
};

/* ------------------------------------------------------------------ */
/*  Helper render                                                      */
/* ------------------------------------------------------------------ */

function renderCbt(props = {}) {
  const defaults = {
    profile: adminProfile,
    session,
    orgProfiles,
    courses: [mockCourse1, mockCourse2],
    lessons: { c1: [mockLesson1, mockLesson2], c2: [] },
    progress: [],
    enrollments: [mockEnrollmentInProgress],
    onCreateCourse: vi.fn(),
    onUpdateCourse: vi.fn(),
    onDeleteCourse: vi.fn(),
    onSaveLesson: vi.fn(),
    onDeleteLesson: vi.fn(),
    onUpdateProgress: vi.fn(),
    onUpdateEnrollment: vi.fn(),
    onPublishCourse: vi.fn(),
    onRefresh: vi.fn(),
    trainingRequirements: [mockRequirement1, mockRequirement2],
    trainingRecords: [mockRecordCurrent],
    onCreateRequirement: vi.fn(),
    onLogTraining: vi.fn(),
    onDeleteTrainingRecord: vi.fn(),
    onDeleteRequirement: vi.fn(),
    onInitTraining: vi.fn(),
    tourTab: null,
  };

  const merged = { ...defaults, ...props };
  const { container } = render(<CbtModules {...merged} />);
  return { container, ...merged };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("CbtModules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /* ── 1. Rendering & Tabs ─────────────────────────────────────── */

  describe("Rendering & Tabs", () => {
    it("renders the CBT Courses tab by default", () => {
      renderCbt();
      // "CBT Courses" appears as both heading and tab button
      expect(screen.getAllByText("CBT Courses").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("SMS Foundations")).toBeTruthy();
    });

    it("shows all four tabs for admin users", () => {
      renderCbt({ profile: adminProfile });
      expect(screen.getAllByText("CBT Courses").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Training Records").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Requirements").length).toBeGreaterThanOrEqual(1);
      // Compliance only appears as a tab for admin
      expect(screen.getByText("Compliance")).toBeTruthy();
    });

    it("hides Compliance tab for non-admin (pilot) users", () => {
      renderCbt({ profile: pilotProfile });
      expect(screen.getAllByText("CBT Courses").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Training Records").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Requirements").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Compliance")).toBeNull();
    });

    it("switches to Training Records tab on click", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByText("§5.91–5.97 — Safety promotion and training")).toBeTruthy();
      expect(screen.getByPlaceholderText("Search records...")).toBeTruthy();
    });

    it("switches to Requirements tab on click", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      expect(screen.getByText("Training Requirements")).toBeTruthy();
      expect(screen.getByPlaceholderText("Search requirements...")).toBeTruthy();
    });

    it("tourTab prop forces the active tab", () => {
      renderCbt({ tourTab: "records" });
      expect(screen.getByText("§5.91–5.97 — Safety promotion and training")).toBeTruthy();
    });
  });

  /* ── 2. CBT Courses tab ──────────────────────────────────────── */

  describe("CBT Courses tab", () => {
    it("displays stats grid with courses, completed, in progress counts", () => {
      renderCbt({ enrollments: [mockEnrollmentInProgress, mockEnrollmentCompleted] });
      expect(screen.getByText("Courses")).toBeTruthy();
      expect(screen.getByText("Completed")).toBeTruthy();
      expect(screen.getByText("In Progress")).toBeTruthy();
    });

    it("shows search input and sort select", () => {
      renderCbt();
      expect(screen.getByPlaceholderText("Search courses...")).toBeTruthy();
      expect(screen.getByText("Title A-Z")).toBeTruthy();
    });

    it("filters courses by search text", () => {
      renderCbt();
      const input = screen.getByPlaceholderText("Search courses...");
      fireEvent.change(input, { target: { value: "Emergency" } });
      expect(screen.getByText("Emergency Procedures")).toBeTruthy();
      expect(screen.queryByText("SMS Foundations")).toBeNull();
    });

    it("filters courses by category button", () => {
      renderCbt();
      // Click the Emergency category button
      const emergencyBtn = screen.getByText(/Emergency \(/);
      fireEvent.click(emergencyBtn);
      expect(screen.getByText("Emergency Procedures")).toBeTruthy();
      expect(screen.queryByText("SMS Foundations")).toBeNull();
    });

    it("shows empty state when no courses exist", () => {
      renderCbt({ courses: [] });
      expect(screen.getByText("No courses available yet.")).toBeTruthy();
    });

    it("shows DRAFT badge for draft courses (admin)", () => {
      renderCbt({ courses: [mockDraftCourse] });
      expect(screen.getByText("DRAFT")).toBeTruthy();
    });

    it("admin sees + New Course button", () => {
      renderCbt({ profile: adminProfile });
      expect(screen.getByText("+ New Course")).toBeTruthy();
    });

    it("pilot does NOT see + New Course button", () => {
      renderCbt({ profile: pilotProfile });
      expect(screen.queryByText("+ New Course")).toBeNull();
    });

    it("admin can delete a course with confirmation", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const { onDeleteCourse } = renderCbt({ profile: adminProfile });
      // Find the delete button (✕) — it's on each course card for admins
      const deleteButtons = screen.getAllByText("✕");
      fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalled();
      expect(onDeleteCourse).toHaveBeenCalled();
    });

    it("admin sees init card when no training requirements exist", () => {
      renderCbt({ profile: adminProfile, trainingRequirements: [] });
      expect(screen.getByText("Initialize Part 5 Training Program")).toBeTruthy();
    });

    it("pilot does NOT see init card when no training requirements exist", () => {
      renderCbt({ profile: pilotProfile, trainingRequirements: [] });
      expect(screen.queryByText("Initialize Part 5 Training Program")).toBeNull();
    });

    it("calls onInitTraining when Initialize button clicked", async () => {
      const onInitTraining = vi.fn().mockResolvedValue();
      renderCbt({ profile: adminProfile, trainingRequirements: [], onInitTraining });
      fireEvent.click(screen.getByText("Initialize Part 5 Training Program"));
      await waitFor(() => expect(onInitTraining).toHaveBeenCalled());
    });

    it("shows Show 25 more pagination button when >25 courses", () => {
      const manyCourses = Array.from({ length: 30 }, (_, i) => ({
        ...mockCourse1, id: `c${i}`, title: `Course ${i}`,
      }));
      renderCbt({ courses: manyCourses });
      expect(screen.getByText(/Show 25 more/)).toBeTruthy();
    });

    it("clicking Show 25 more loads additional courses", () => {
      const manyCourses = Array.from({ length: 30 }, (_, i) => ({
        ...mockCourse1, id: `c${i}`, title: `Course ${String(i).padStart(2, "0")}`,
      }));
      renderCbt({ courses: manyCourses });
      fireEvent.click(screen.getByText(/Show 25 more/));
      // After clicking, all 30 courses should be visible
      expect(screen.getByText("Course 29")).toBeTruthy();
    });
  });

  /* ── 3. Expired/Expiring training banners ────────────────────── */

  describe("Expired/Expiring training banners", () => {
    it("shows expired training banner when user has expired records", () => {
      renderCbt({ trainingRecords: [mockRecordExpired] });
      expect(screen.getByText(/You have 1 expired training record/)).toBeTruthy();
    });

    it("shows expiring training banner when user has expiring records (no expired)", () => {
      renderCbt({ trainingRecords: [mockRecordExpiring] });
      expect(screen.getByText(/expiring within 30 days/)).toBeTruthy();
    });

    it("does NOT show expiring banner when there are also expired records", () => {
      renderCbt({ trainingRecords: [mockRecordExpired, mockRecordExpiring] });
      // Expired banner shows, but expiring-only banner does not
      expect(screen.getByText(/expired training record/)).toBeTruthy();
      expect(screen.queryByText(/expiring within 30 days/)).toBeNull();
    });
  });

  /* ── 4. Training Records tab ─────────────────────────────────── */

  describe("Training Records tab", () => {
    it("shows training records stats (Current, Expiring Soon, Expired)", () => {
      renderCbt({ trainingRecords: [mockRecordCurrent, mockRecordExpiring, mockRecordExpired] });
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByText("Current")).toBeTruthy();
      expect(screen.getByText("Expiring Soon")).toBeTruthy();
      expect(screen.getByText("Expired")).toBeTruthy();
    });

    it("shows search input and sort select on records tab", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByPlaceholderText("Search records...")).toBeTruthy();
      expect(screen.getByText("Newest first")).toBeTruthy();
    });

    it("shows filter tabs with counts (All/Current/Expiring/Expired)", () => {
      renderCbt({ trainingRecords: [mockRecordCurrent, mockRecordExpiring, mockRecordExpired] });
      fireEvent.click(screen.getByText("Training Records"));
      // All three records visible for admin
      expect(screen.getByText(/All \(3\)/)).toBeTruthy();
    });

    it("filters records by Expired filter", () => {
      renderCbt({ trainingRecords: [mockRecordCurrent, mockRecordExpired] });
      fireEvent.click(screen.getByText("Training Records"));
      // Click the Expired filter
      const expiredBtn = screen.getByText(/Expired \(/);
      fireEvent.click(expiredBtn);
      expect(screen.getByText("Hazmat Training")).toBeTruthy();
      expect(screen.queryByText("SMS Training")).toBeNull();
    });

    it("shows record cards with status labels", () => {
      renderCbt({ trainingRecords: [mockRecordCurrent] });
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByText("CURRENT")).toBeTruthy();
    });

    it("admin sees all org records; pilot sees only own records", () => {
      // Admin sees all 4 records
      const allRecords = [mockRecordCurrent, mockRecordOtherUser];
      renderCbt({ profile: adminProfile, trainingRecords: allRecords });
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByText("SMS Training")).toBeTruthy();
      expect(screen.getByText("Pilot Training")).toBeTruthy();
    });

    it("pilot sees only own records", () => {
      const allRecords = [mockRecordCurrent, mockRecordOtherUser];
      renderCbt({ profile: pilotProfile, trainingRecords: allRecords });
      fireEvent.click(screen.getByText("Training Records"));
      // Pilot u2 should only see tr4 (their own record)
      expect(screen.getByText("Pilot Training")).toBeTruthy();
      expect(screen.queryByText(/SMS Training/)).toBeNull();
    });

    it("admin can delete a training record with confirmation", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const { onDeleteTrainingRecord } = renderCbt({ trainingRecords: [mockRecordCurrent] });
      fireEvent.click(screen.getByText("Training Records"));
      const deleteBtn = screen.getByText("✕");
      fireEvent.click(deleteBtn);
      expect(window.confirm).toHaveBeenCalledWith("Delete this training record?");
      expect(onDeleteTrainingRecord).toHaveBeenCalledWith("tr1");
    });

    it("shows empty state when no records exist", () => {
      renderCbt({ trainingRecords: [] });
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByText("No training records yet")).toBeTruthy();
    });

    it("shows + Log Training button", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      expect(screen.getByText("+ Log Training")).toBeTruthy();
    });

    it("searches records by text", () => {
      renderCbt({ trainingRecords: [mockRecordCurrent, mockRecordExpired] });
      fireEvent.click(screen.getByText("Training Records"));
      const input = screen.getByPlaceholderText("Search records...");
      fireEvent.change(input, { target: { value: "Hazmat" } });
      expect(screen.getByText("Hazmat Training")).toBeTruthy();
      expect(screen.queryByText(/^SMS Training$/)).toBeNull();
    });
  });

  /* ── 5. Requirements tab ─────────────────────────────────────── */

  describe("Requirements tab", () => {
    it("shows requirement cards with frequency info", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      expect(screen.getByText("SMS Training")).toBeTruthy();
      expect(screen.getByText(/Every 12 months/)).toBeTruthy();
    });

    it("shows filter tabs for All/Initial/Recurrent with counts", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      expect(screen.getByText(/All \(2\)/)).toBeTruthy();
      expect(screen.getByText(/Recurrent \(1\)/)).toBeTruthy();
      expect(screen.getByText(/Initial \(1\)/)).toBeTruthy();
    });

    it("filters requirements by Recurrent filter", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      fireEvent.click(screen.getByText(/Recurrent \(/));
      expect(screen.getByText("SMS Training")).toBeTruthy();
      expect(screen.queryByText("Initial Safety")).toBeNull();
    });

    it("searches requirements by text", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      const input = screen.getByPlaceholderText("Search requirements...");
      fireEvent.change(input, { target: { value: "Initial" } });
      expect(screen.getByText("Initial Safety")).toBeTruthy();
      expect(screen.queryByText(/^SMS Training$/)).toBeNull();
    });

    it("admin can delete a requirement with confirmation", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const { onDeleteRequirement } = renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      const deleteButtons = screen.getAllByText("✕");
      fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalledWith("Delete this requirement?");
      expect(onDeleteRequirement).toHaveBeenCalled();
    });

    it("shows empty state when no requirements exist", () => {
      renderCbt({ trainingRequirements: [] });
      fireEvent.click(screen.getByText("Requirements"));
      expect(screen.getByText("No training requirements defined yet")).toBeTruthy();
    });

    it("shows + Requirement button", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      expect(screen.getByText("+ Requirement")).toBeTruthy();
    });
  });

  /* ── 6. Compliance tab (admin-only) ──────────────────────────── */

  describe("Compliance tab", () => {
    it("renders compliance matrix with user names and requirement headers", () => {
      renderCbt({
        profile: adminProfile,
        trainingRecords: [mockRecordCurrent],
      });
      fireEvent.click(screen.getByText("Compliance"));
      expect(screen.getByText("Training Compliance")).toBeTruthy();
      expect(screen.getByText("Admin User")).toBeTruthy();
      expect(screen.getByText("Pilot User")).toBeTruthy();
    });

    it("shows compliant count message", () => {
      renderCbt({ profile: adminProfile, trainingRecords: [] });
      fireEvent.click(screen.getByText("Compliance"));
      expect(screen.getByText(/of 3/)).toBeTruthy();
      expect(screen.getByText("users fully compliant")).toBeTruthy();
    });

    it("shows empty state when no requirements or users", () => {
      renderCbt({ profile: adminProfile, trainingRequirements: [], orgProfiles: [] });
      fireEvent.click(screen.getByText("Compliance"));
      expect(screen.getByText("No training requirements or users found")).toBeTruthy();
    });

    it("shows legend with status dot labels", () => {
      renderCbt({ profile: adminProfile });
      fireEvent.click(screen.getByText("Compliance"));
      expect(screen.getByText("Current")).toBeTruthy();
      expect(screen.getByText("Expiring")).toBeTruthy();
      // "Expired" text appears in legend
      expect(screen.getByText("Expired")).toBeTruthy();
      expect(screen.getByText("Not completed")).toBeTruthy();
    });
  });

  /* ── 7. Training Form (Log Training) ─────────────────────────── */

  describe("Training Form", () => {
    it("opens Training Form when + Log Training is clicked", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      fireEvent.click(screen.getByText("+ Log Training"));
      // "Log Training" appears as both form heading and submit button
      expect(screen.getAllByText("Log Training").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByPlaceholderText("e.g. Initial SMS Awareness Training")).toBeTruthy();
    });

    it("Training Form has a requirement select when requirements exist", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      fireEvent.click(screen.getByText("+ Log Training"));
      expect(screen.getByText("Custom / one-off training")).toBeTruthy();
    });

    it("Training Form submit button is disabled without title", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      fireEvent.click(screen.getByText("+ Log Training"));
      // The "Log Training" submit button should exist but be disabled
      const submitButtons = screen.getAllByText("Log Training");
      // The submit button is the last one (a button, not the heading)
      const submitBtn = submitButtons[submitButtons.length - 1];
      expect(submitBtn).toBeDisabled();
    });

    it("Training Form submits with valid title and date", () => {
      const { onLogTraining } = renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      fireEvent.click(screen.getByText("+ Log Training"));

      const titleInput = screen.getByPlaceholderText("e.g. Initial SMS Awareness Training");
      fireEvent.change(titleInput, { target: { value: "My Training" } });

      const submitButtons = screen.getAllByText("Log Training");
      const submitBtn = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitBtn);
      expect(onLogTraining).toHaveBeenCalled();
    });

    it("Training Form cancel returns to records list", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Training Records"));
      fireEvent.click(screen.getByText("+ Log Training"));
      expect(screen.getByText("§5.91 — Safety promotion: competency and training")).toBeTruthy();
      fireEvent.click(screen.getByText("Cancel"));
      // Should be back on the records list
      expect(screen.getByPlaceholderText("Search records...")).toBeTruthy();
    });
  });

  /* ── 8. Requirement Form ─────────────────────────────────────── */

  describe("Requirement Form", () => {
    it("opens Requirement Form when + Requirement is clicked", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      fireEvent.click(screen.getByText("+ Requirement"));
      expect(screen.getByText("New Training Requirement")).toBeTruthy();
    });

    it("Requirement Form submit is disabled without title", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      fireEvent.click(screen.getByText("+ Requirement"));
      expect(screen.getByText("Create Requirement")).toBeDisabled();
    });

    it("Requirement Form submits with valid title", () => {
      const { onCreateRequirement } = renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      fireEvent.click(screen.getByText("+ Requirement"));

      const titleInput = screen.getByPlaceholderText("e.g. Annual SMS Recurrent Training");
      fireEvent.change(titleInput, { target: { value: "New Req" } });

      fireEvent.click(screen.getByText("Create Requirement"));
      expect(onCreateRequirement).toHaveBeenCalled();
    });

    it("Requirement Form cancel returns to requirements list", () => {
      renderCbt();
      fireEvent.click(screen.getByText("Requirements"));
      fireEvent.click(screen.getByText("+ Requirement"));
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.getByPlaceholderText("Search requirements...")).toBeTruthy();
    });
  });

  /* ── 9. Course Detail navigation ─────────────────────────────── */

  describe("Course Detail", () => {
    it("opens course detail when a course card is clicked", () => {
      renderCbt();
      fireEvent.click(screen.getByText("SMS Foundations"));
      // Should see the course detail view
      expect(screen.getByText("Lesson One")).toBeTruthy();
      expect(screen.getByText("Lesson Two")).toBeTruthy();
      expect(screen.getByText("Lessons")).toBeTruthy();
    });

    it("shows back button on course detail that returns to catalog", () => {
      renderCbt();
      fireEvent.click(screen.getByText("SMS Foundations"));
      const backBtn = screen.getByText("← All Courses");
      fireEvent.click(backBtn);
      // Back on catalog
      expect(screen.getByPlaceholderText("Search courses...")).toBeTruthy();
    });

    it("admin sees Edit, + Lesson buttons on course detail", () => {
      renderCbt({ profile: adminProfile });
      fireEvent.click(screen.getByText("SMS Foundations"));
      // "Edit" appears for the course itself and for each lesson (admin)
      expect(screen.getAllByText("Edit").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("+ Lesson")).toBeTruthy();
    });

    it("pilot does NOT see Edit or + Lesson buttons on course detail", () => {
      renderCbt({ profile: pilotProfile, courses: [mockCourse1] });
      fireEvent.click(screen.getByText("SMS Foundations"));
      expect(screen.queryByText("+ Lesson")).toBeNull();
    });
  });

  /* ── 10. Course Form (New Course) ────────────────────────────── */

  describe("Course Form", () => {
    it("opens course form when + New Course is clicked", () => {
      renderCbt({ profile: adminProfile });
      fireEvent.click(screen.getByText("+ New Course"));
      expect(screen.getByText("New Course")).toBeTruthy();
      expect(screen.getByPlaceholderText("e.g. SMS Initial Training")).toBeTruthy();
    });

    it("course form submit is disabled without title", () => {
      renderCbt({ profile: adminProfile });
      fireEvent.click(screen.getByText("+ New Course"));
      expect(screen.getByText("Create Course")).toBeDisabled();
    });

    it("course form cancel returns to catalog", () => {
      renderCbt({ profile: adminProfile });
      fireEvent.click(screen.getByText("+ New Course"));
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.getByPlaceholderText("Search courses...")).toBeTruthy();
    });
  });
});
