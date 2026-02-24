import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock recharts — components that wrap children render a div; leaf nodes return null
vi.mock("recharts", () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

import DashboardCharts from "../../components/DashboardCharts";

// ResizeObserver is used by recharts / ResponsiveContainer in some envs
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// ── helpers to build relative dates ────────────────────────────
function daysAgoISO(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ── test data factories ────────────────────────────────────────
function makeRecords(overrides = []) {
  // Default: two FRAT records within last 30 days
  const defaults = [
    { timestamp: daysAgoISO(2), score: 12, factors: ["wx_ice", "plt_fatigue"], aircraft: "N12345", pilot: "John Doe" },
    { timestamp: daysAgoISO(10), score: 35, factors: ["wx_vis", "ops_time_pressure"], aircraft: "N67890", pilot: "Jane Smith" },
  ];
  return overrides.length ? overrides : defaults;
}

function makeFlights(overrides = []) {
  const defaults = [
    { timestamp: daysAgoISO(1), status: "ACTIVE" },
    { timestamp: daysAgoISO(5), status: "COMPLETED" },
    { timestamp: daysAgoISO(15), status: "PENDING_APPROVAL" },
  ];
  return overrides.length ? overrides : defaults;
}

function makeReports(overrides = []) {
  const defaults = [
    { created_at: daysAgoISO(3), status: "new", category: "weather" },
    { created_at: daysAgoISO(8), status: "investigating", category: "maintenance" },
    { created_at: daysAgoISO(45), status: "closed", category: "weather" },
  ];
  return overrides.length ? overrides : defaults;
}

function makeHazards(overrides = []) {
  const defaults = [
    { status: "open", risk_score: 5 },
    { status: "mitigating", risk_score: 12 },
    { status: "closed", risk_score: 3 },
  ];
  return overrides.length ? overrides : defaults;
}

function makeActions(overrides = []) {
  const defaults = [
    { status: "open", due_date: daysAgoISO(-10), title: "Install warning placard", created_at: daysAgoISO(30), updated_at: daysAgoISO(0) },
    { status: "completed", due_date: daysAgoISO(5), title: "Update SOP", created_at: daysAgoISO(60), updated_at: daysAgoISO(10) },
  ];
  return overrides.length ? overrides : defaults;
}

function renderCharts(propOverrides = {}) {
  const props = {
    records: makeRecords(),
    flights: makeFlights(),
    reports: makeReports(),
    hazards: makeHazards(),
    actions: makeActions(),
    view: "overview",
    ...propOverrides,
  };
  return render(<DashboardCharts {...props} />);
}

// ════════════════════════════════════════════════════════════════
// VIEW ROUTING
// ════════════════════════════════════════════════════════════════
describe("DashboardCharts — view routing", () => {
  it('renders OverviewDashboard when view="overview"', () => {
    renderCharts({ view: "overview" });
    expect(screen.getByText("SMS Compliance Health")).toBeInTheDocument();
  });

  it('renders FRATAnalytics when view="frat"', () => {
    renderCharts({ view: "frat" });
    // FRATAnalytics has time range buttons
    expect(screen.getByText("7 Days")).toBeInTheDocument();
    expect(screen.getByText("30 Days")).toBeInTheDocument();
  });

  it('renders SafetyMetrics when view="safety"', () => {
    renderCharts({ view: "safety" });
    expect(screen.getByText("Safety Reports")).toBeInTheDocument();
    expect(screen.getByText("Avg Closure Time")).toBeInTheDocument();
  });

  it("falls back to FRATAnalytics when view is undefined", () => {
    renderCharts({ view: undefined });
    // Should see FRATAnalytics time range selector
    expect(screen.getByText("30 Days")).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════
// OVERVIEW DASHBOARD
// ════════════════════════════════════════════════════════════════
describe("OverviewDashboard", () => {
  it("shows the compliance health banner with a percentage", () => {
    renderCharts({ view: "overview" });
    expect(screen.getByText("SMS Compliance Health")).toBeInTheDocument();
    // Compliance percentage is rendered (number followed by %)
    const pctEl = screen.getByText(/%$/);
    expect(pctEl).toBeInTheDocument();
  });

  it("shows KPI cards with correct labels", () => {
    renderCharts({ view: "overview" });
    expect(screen.getByText("FRATs (30d)")).toBeInTheDocument();
    expect(screen.getByText("Avg Risk Score")).toBeInTheDocument();
    expect(screen.getByText("Active Flights")).toBeInTheDocument();
    expect(screen.getByText("Open Items")).toBeInTheDocument();
  });

  it("computes 100% compliance when there are no issues", () => {
    renderCharts({
      view: "overview",
      records: makeRecords(),
      flights: [],
      reports: [],
      hazards: [],
      actions: [],
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("compliance drops when there are overdue actions", () => {
    const overdueActions = [
      { status: "open", due_date: daysAgoISO(5), title: "Overdue 1", created_at: daysAgoISO(30), updated_at: daysAgoISO(0) },
      { status: "open", due_date: daysAgoISO(3), title: "Overdue 2", created_at: daysAgoISO(20), updated_at: daysAgoISO(0) },
    ];
    renderCharts({
      view: "overview",
      actions: overdueActions,
      hazards: [],
      reports: [],
    });
    // 2 overdue actions => compliance = 100 - 20 = 80
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows open items by type section with correct labels", () => {
    renderCharts({ view: "overview" });
    expect(screen.getByText("Open Items by Type")).toBeInTheDocument();
    expect(screen.getByText("Safety Reports")).toBeInTheDocument();
    expect(screen.getByText("Investigations")).toBeInTheDocument();
    expect(screen.getByText("Corrective Actions")).toBeInTheDocument();
  });

  it("displays overdue text in compliance banner", () => {
    const overdueAction = [
      { status: "open", due_date: daysAgoISO(5), title: "Late task", created_at: daysAgoISO(30), updated_at: daysAgoISO(0) },
    ];
    renderCharts({ view: "overview", actions: overdueAction });
    expect(screen.getByText(/1 overdue action/)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════
// FRAT ANALYTICS
// ════════════════════════════════════════════════════════════════
describe("FRATAnalytics", () => {
  it("renders time range buttons (7d, 30d, 90d, 1 Year)", () => {
    renderCharts({ view: "frat" });
    expect(screen.getByText("7 Days")).toBeInTheDocument();
    expect(screen.getByText("30 Days")).toBeInTheDocument();
    expect(screen.getByText("90 Days")).toBeInTheDocument();
    expect(screen.getByText("1 Year")).toBeInTheDocument();
  });

  it("KPI row shows assessments, avg score, max score, high/critical", () => {
    renderCharts({ view: "frat" });
    expect(screen.getByText("Assessments")).toBeInTheDocument();
    // "Avg Score" can appear both in the KPI card and the pilot table header
    expect(screen.getAllByText("Avg Score").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Max Score")).toBeInTheDocument();
    expect(screen.getByText("High/Critical")).toBeInTheDocument();
  });

  it("shows empty state when records is empty", () => {
    renderCharts({ view: "frat", records: [] });
    expect(screen.getByText("No data for selected period")).toBeInTheDocument();
  });

  it("shows top risk factors list", () => {
    renderCharts({ view: "frat" });
    // At least one of the factor labels from our test data should appear
    expect(screen.getByText("Top Risk Factors")).toBeInTheDocument();
    // "Known/forecast icing" is the label for wx_ice
    expect(screen.getByText("Known/forecast icing")).toBeInTheDocument();
  });

  it("renders by pilot table when multiple pilots exist", () => {
    renderCharts({ view: "frat" });
    // Our test data has John Doe and Jane Smith
    expect(screen.getByText("By Pilot")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("does not render by pilot table when only one pilot exists", () => {
    const singlePilotRecords = [
      { timestamp: daysAgoISO(2), score: 12, factors: ["wx_ice"], aircraft: "N12345", pilot: "Solo Pilot" },
    ];
    renderCharts({ view: "frat", records: singlePilotRecords });
    expect(screen.queryByText("By Pilot")).not.toBeInTheDocument();
  });

  it("clicking a time range button re-filters data", () => {
    // Record that is 50 days old — inside 90d but outside 30d
    const records = [
      { timestamp: daysAgoISO(2), score: 10, factors: ["wx_ice"], aircraft: "N111", pilot: "Pilot A" },
      { timestamp: daysAgoISO(50), score: 40, factors: ["ops_time_pressure"], aircraft: "N222", pilot: "Pilot B" },
    ];
    renderCharts({ view: "frat", records });

    // Default 30d — only 1 record in range, so only 1 pilot => no "By Pilot" table
    expect(screen.queryByText("By Pilot")).not.toBeInTheDocument();

    // Switch to 90 days — now both records visible => 2 pilots => table appears
    fireEvent.click(screen.getByText("90 Days"));
    expect(screen.getByText("By Pilot")).toBeInTheDocument();
    expect(screen.getByText("Pilot A")).toBeInTheDocument();
    expect(screen.getByText("Pilot B")).toBeInTheDocument();
  });

  it("shows correct KPI values for a single known record", () => {
    const records = [
      { timestamp: daysAgoISO(1), score: 20, factors: ["wx_ice", "plt_fatigue"], aircraft: "N111", pilot: "Test Pilot" },
    ];
    renderCharts({ view: "frat", records });
    // Assessments = 1
    expect(screen.getByText("1")).toBeInTheDocument();
    // Avg Score = 20.0
    expect(screen.getByText("20.0")).toBeInTheDocument();
    // Max Score = 20
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════
// SAFETY METRICS
// ════════════════════════════════════════════════════════════════
describe("SafetyMetrics", () => {
  it("shows KPI cards with correct labels", () => {
    renderCharts({ view: "safety" });
    expect(screen.getByText("Safety Reports")).toBeInTheDocument();
    expect(screen.getByText("Open Investigations")).toBeInTheDocument();
    expect(screen.getByText("Corrective Actions")).toBeInTheDocument();
    expect(screen.getByText("Avg Closure Time")).toBeInTheDocument();
  });

  it("shows overdue actions list when overdue actions exist", () => {
    const overdueActions = [
      { status: "open", due_date: daysAgoISO(10), title: "Fix landing gear", created_at: daysAgoISO(40), updated_at: daysAgoISO(0) },
    ];
    renderCharts({ view: "safety", actions: overdueActions });
    expect(screen.getByText(/Overdue Actions/)).toBeInTheDocument();
    expect(screen.getByText("Fix landing gear")).toBeInTheDocument();
    expect(screen.getByText(/days overdue/)).toBeInTheDocument();
  });

  it("shows action status breakdown when no actions are overdue", () => {
    const noOverdueActions = [
      { status: "completed", due_date: daysAgoISO(-5), title: "Done task", created_at: daysAgoISO(30), updated_at: daysAgoISO(2) },
      { status: "open", due_date: daysAgoISO(-10), title: "Future task", created_at: daysAgoISO(5), updated_at: daysAgoISO(0) },
    ];
    renderCharts({ view: "safety", actions: noOverdueActions });
    expect(screen.getByText("Action Status")).toBeInTheDocument();
  });

  it("displays correct total report count", () => {
    const reports = [
      { created_at: daysAgoISO(1), status: "new", category: "weather" },
      { created_at: daysAgoISO(5), status: "closed", category: "ops" },
      { created_at: daysAgoISO(10), status: "investigating", category: "maintenance" },
    ];
    renderCharts({ view: "safety", reports });
    // totalReports = 3, shown in the Safety Reports StatCard value
    // "3" may appear in multiple places, so verify at least one instance exists
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders avg closure time for completed actions", () => {
    const actions = [
      { status: "completed", due_date: daysAgoISO(5), title: "Closed A", created_at: daysAgoISO(20), updated_at: daysAgoISO(5) },
    ];
    renderCharts({ view: "safety", actions });
    // 15 days closure time => "15d"
    expect(screen.getByText("15d")).toBeInTheDocument();
    expect(screen.getByText("For completed actions")).toBeInTheDocument();
  });

  it('displays dash for avg closure time when no actions are completed', () => {
    const actions = [
      { status: "open", due_date: daysAgoISO(-5), title: "Still open", created_at: daysAgoISO(10), updated_at: daysAgoISO(0) },
    ];
    renderCharts({ view: "safety", actions });
    // No completed actions => shows dash
    const dashEl = screen.getAllByText("\u2014");
    expect(dashEl.length).toBeGreaterThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (getRiskColor, getRiskLabel)
// These are not exported, so we test them indirectly through rendering
// ════════════════════════════════════════════════════════════════
describe("getRiskColor / getRiskLabel — indirect tests via rendered output", () => {
  it("low score (<= 15) renders green-colored avg score", () => {
    const records = [
      { timestamp: daysAgoISO(1), score: 10, factors: [], aircraft: "N111", pilot: "P1" },
    ];
    const { container } = renderCharts({ view: "frat", records });
    // Avg Score card value should be green (#4ADE80)
    const avgScoreValue = screen.getByText("10.0");
    expect(avgScoreValue).toHaveStyle({ color: "#4ADE80" });
  });

  it("high score (31-45) renders amber-colored avg score", () => {
    const records = [
      { timestamp: daysAgoISO(1), score: 40, factors: [], aircraft: "N111", pilot: "P1" },
    ];
    renderCharts({ view: "frat", records });
    const avgScoreValue = screen.getByText("40.0");
    expect(avgScoreValue).toHaveStyle({ color: "#F59E0B" });
  });

  it("critical score (> 45) renders red-colored avg score", () => {
    const records = [
      { timestamp: daysAgoISO(1), score: 50, factors: [], aircraft: "N111", pilot: "P1" },
    ];
    renderCharts({ view: "frat", records });
    const avgScoreValue = screen.getByText("50.0");
    expect(avgScoreValue).toHaveStyle({ color: "#EF4444" });
  });
});

// ════════════════════════════════════════════════════════════════
// NULL / UNDEFINED PROPS
// ════════════════════════════════════════════════════════════════
describe("Handles null/undefined props gracefully", () => {
  it("renders without crashing when all data props are undefined", () => {
    const { container } = render(
      <DashboardCharts records={undefined} flights={undefined} reports={undefined} hazards={undefined} actions={undefined} view="overview" />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText("SMS Compliance Health")).toBeInTheDocument();
  });

  it("renders without crashing when all data props are null", () => {
    const { container } = render(
      <DashboardCharts records={null} flights={null} reports={null} hazards={null} actions={null} view="frat" />
    );
    expect(container).toBeTruthy();
    // Empty records => empty state
    expect(screen.getByText("No data for selected period")).toBeInTheDocument();
  });

  it("renders overview with empty arrays", () => {
    const { container } = render(
      <DashboardCharts records={[]} flights={[]} reports={[]} hazards={[]} actions={[]} view="overview" />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("No overdue actions")).toBeInTheDocument();
  });
});
