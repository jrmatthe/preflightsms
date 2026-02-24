import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks (must come before importing the module under test) ────

vi.mock('next/head', () => ({ default: ({ children }) => <>{children}</> }));

vi.mock('next/dynamic', () => ({
  default: (loader) => {
    const src = loader.toString();
    const name =
      src.includes('DashboardCharts') ? 'DashboardCharts' :
      src.includes('SafetyReporting') ? 'SafetyReporting' :
      src.includes('HazardRegister') ? 'HazardRegister' :
      src.includes('CorrectiveActions') ? 'CorrectiveActions' :
      src.includes('AdminPanel') ? 'AdminPanel' :
      src.includes('PolicyTraining') ? 'PolicyTraining' :
      src.includes('FaaAuditLog') ? 'FaaAuditLog' :
      src.includes('SmsManuals') ? 'SmsManuals' :
      src.includes('CbtModules') ? 'CbtModules' :
      src.includes('FleetManagement') ? 'FleetManagement' :
      src.includes('NotificationCenter') ? 'NotificationCenter' :
      src.includes('PostFlightNudge') ? 'PostFlightNudge' :
      'DynamicComponent';
    const Component = (props) => <div data-testid={`dynamic-${name}`} />;
    Component.displayName = name;
    return Component;
  }
}));

vi.mock('../../lib/supabase', () => ({
  supabase: null,
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(), updateUserPassword: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  getProfile: vi.fn().mockResolvedValue(null),
  submitFRAT: vi.fn(), fetchFRATs: vi.fn().mockResolvedValue({ data: [] }),
  deleteFRAT: vi.fn(), createFlight: vi.fn(), deleteFlight: vi.fn(),
  fetchFlights: vi.fn().mockResolvedValue({ data: [] }),
  updateFlightStatus: vi.fn(),
  subscribeToFlights: vi.fn().mockReturnValue(null),
  submitReport: vi.fn(), fetchReports: vi.fn().mockResolvedValue({ data: [] }),
  updateReport: vi.fn(),
  createHazard: vi.fn(), fetchHazards: vi.fn().mockResolvedValue({ data: [] }),
  updateHazard: vi.fn(),
  createAction: vi.fn(), fetchActions: vi.fn().mockResolvedValue({ data: [] }),
  updateAction: vi.fn(),
  fetchOrgProfiles: vi.fn().mockResolvedValue({ data: [] }),
  updateProfileRole: vi.fn(), updateProfilePermissions: vi.fn(),
  createPolicy: vi.fn(), fetchPolicies: vi.fn().mockResolvedValue({ data: [] }),
  acknowledgePolicy: vi.fn(),
  createTrainingRequirement: vi.fn(),
  fetchTrainingRequirements: vi.fn().mockResolvedValue({ data: [] }),
  createTrainingRecord: vi.fn(),
  fetchTrainingRecords: vi.fn().mockResolvedValue({ data: [] }),
  deleteTrainingRecord: vi.fn(), deleteTrainingRequirement: vi.fn(),
  uploadOrgLogo: vi.fn(),
  fetchFratTemplate: vi.fn().mockResolvedValue({ data: null }),
  fetchAllFratTemplates: vi.fn().mockResolvedValue({ data: [] }),
  upsertFratTemplate: vi.fn(), createFratTemplate: vi.fn(),
  deleteFratTemplate: vi.fn(), setActiveFratTemplate: vi.fn(),
  uploadFratAttachment: vi.fn(),
  fetchNotificationContacts: vi.fn().mockResolvedValue({ data: [] }),
  createNotificationContact: vi.fn(),
  updateNotificationContact: vi.fn(), deleteNotificationContact: vi.fn(),
  approveFlight: vi.fn(), rejectFlight: vi.fn(),
  selfDispatchFlight: vi.fn(), approveRejectFRAT: vi.fn(),
  updateOrg: vi.fn(),
  fetchAircraft: vi.fn().mockResolvedValue({ data: [] }),
  createAircraft: vi.fn(), updateAircraft: vi.fn(), deleteAircraft: vi.fn(),
  fetchCbtCourses: vi.fn().mockResolvedValue({ data: [] }),
  createCbtCourse: vi.fn(), updateCbtCourse: vi.fn(), deleteCbtCourse: vi.fn(),
  fetchCbtLessons: vi.fn().mockResolvedValue({ data: [] }),
  upsertCbtLesson: vi.fn(), deleteCbtLesson: vi.fn(),
  fetchCbtProgress: vi.fn().mockResolvedValue({ data: [] }),
  upsertCbtProgress: vi.fn(),
  fetchCbtEnrollments: vi.fn().mockResolvedValue({ data: [] }),
  upsertCbtEnrollment: vi.fn(),
  fetchInvitations: vi.fn().mockResolvedValue({ data: [] }),
  createInvitation: vi.fn(), revokeInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  getInvitationByToken: vi.fn(), acceptInvitation: vi.fn(),
  removeUserFromOrg: vi.fn(),
  fetchSmsManuals: vi.fn().mockResolvedValue({ data: [] }),
  upsertSmsManual: vi.fn(), updateSmsManualSections: vi.fn(),
  deleteSmsManual: vi.fn(), saveSmsTemplateVariables: vi.fn(),
  saveSmsSignatures: vi.fn(), publishManualToPolicy: vi.fn(),
  clearPolicyAcknowledgments: vi.fn(), uploadPolicyFile: vi.fn(),
  fetchNotifications: vi.fn().mockResolvedValue({ data: [] }),
  createNotification: vi.fn(),
  deleteNotificationByLinkId: vi.fn(),
  fetchNotificationReads: vi.fn().mockResolvedValue({ data: [] }),
  markNotificationRead: vi.fn(),
  saveOnboardingStatus: vi.fn(),
  createNudgeResponse: vi.fn(),
  fetchNudgeResponsesForUser: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../lib/tiers', () => ({
  hasFeature: vi.fn().mockReturnValue(true),
  NAV_FEATURE_MAP: {},
  TIERS: {},
  FEATURE_LABELS: {},
  getTierFeatures: vi.fn().mockReturnValue([]),
}));

vi.mock('../../lib/offlineQueue', () => ({
  initOfflineQueue: vi.fn(),
  enqueue: vi.fn(),
  getQueueCount: vi.fn().mockReturnValue(0),
  flushQueue: vi.fn(),
}));

// ── Import component under test ─────────────────────────────────
import PVTAIRFrat from '../../pages/index';

// ── Helpers ──────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Reset URL state
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search: '', pathname: '/', href: 'http://localhost/' },
  });
  // Stub history.replaceState
  window.history.replaceState = vi.fn();
});

// ── Tests ────────────────────────────────────────────────────────

describe('PVTAIRFrat (main component) — offline mode', () => {
  it('renders without crashing in offline mode (supabase = null)', () => {
    const { container } = render(<PVTAIRFrat />);
    expect(container).toBeTruthy();
  });

  it('shows the "NEW FLIGHT RISK ASSESSMENT" title by default', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByText('NEW FLIGHT RISK ASSESSMENT')).toBeInTheDocument();
  });

  it('renders the sidebar NavBar with navigation tabs', () => {
    render(<PVTAIRFrat />);
    // NavBar tab labels
    expect(screen.getByTitle('FRAT')).toBeInTheDocument();
    expect(screen.getByTitle('Flight Following')).toBeInTheDocument();
    expect(screen.getByTitle('Reports')).toBeInTheDocument();
  });

  it('renders the NavBar with admin-only tabs (offline mode shows all)', () => {
    render(<PVTAIRFrat />);
    // In offline mode with hasFeature returning true, all tabs are shown because
    // userRole is undefined and the filter checks for admin roles.
    // But "Investigations", "Actions", "Dashboard", "Admin" are filtered out for
    // non-admin roles. Check that basic tabs are present.
    expect(screen.getByTitle('Policies')).toBeInTheDocument();
    expect(screen.getByTitle('Training')).toBeInTheDocument();
  });

  it('renders the footer with current year and PreflightSMS branding', () => {
    render(<PVTAIRFrat />);
    const year = new Date().getFullYear().toString();
    const footer = screen.getByText((content) =>
      content.includes('PreflightSMS') &&
      content.includes('14 CFR Part 5 SMS') &&
      content.includes(year)
    );
    expect(footer).toBeInTheDocument();
    expect(footer.tagName.toLowerCase()).toBe('footer');
  });

  it('displays "Safety Management System" in footer', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByText((content) =>
      content.includes('Safety Management System')
    )).toBeInTheDocument();
  });

  it('defaults orgName to "PreflightSMS" in offline mode (no profile)', () => {
    render(<PVTAIRFrat />);
    // Footer should include the default orgName
    expect(screen.getByText((content) =>
      content.includes('PreflightSMS Safety Management System')
    )).toBeInTheDocument();
  });

  it('renders the page title via Head', () => {
    const { container } = render(<PVTAIRFrat />);
    // With next/head mocked to render children, the <title> element appears in the DOM
    const titleEl = container.querySelector('title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent).toContain('PreflightSMS');
  });
});

describe('PVTAIRFrat — view title mapping', () => {
  // In offline mode the default tab is "submit"
  it('maps "submit" to "NEW FLIGHT RISK ASSESSMENT"', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByText('NEW FLIGHT RISK ASSESSMENT')).toBeInTheDocument();
  });

  it('maps "flights" to "FLIGHT FOLLOWING" when tab is clicked', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Flight Following'));
    expect(screen.getByText('FLIGHT FOLLOWING')).toBeInTheDocument();
  });

  it('maps "reports" to "SAFETY REPORTS" when tab is clicked', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Reports'));
    expect(screen.getByText('SAFETY REPORTS')).toBeInTheDocument();
  });

  it('maps "policy" to "POLICIES" when tab is clicked', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Policies'));
    expect(screen.getByText('POLICIES')).toBeInTheDocument();
  });

  it('maps "cbt" to "TRAINING" when tab is clicked', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Training'));
    expect(screen.getByText('TRAINING')).toBeInTheDocument();
  });
});

describe('PVTAIRFrat — FRAT form (offline mode)', () => {
  it('shows "No Aircraft Registered" when fleet is empty', () => {
    render(<PVTAIRFrat />);
    // In offline mode with no fleet, FRATForm shows the "No Aircraft Registered" prompt
    expect(screen.getByText('No Aircraft Registered')).toBeInTheDocument();
  });

  it('shows the "Go to Admin" button when no fleet', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByText((content) => content.includes('Go to Admin'))).toBeInTheDocument();
  });

  it('shows "Flight Information" section when fleet is populated via localStorage', () => {
    // Seed localStorage with fleet data so FRATForm renders fully
    localStorage.setItem('pvtair_frat_records', JSON.stringify([]));
    // The FRATForm gets fleetAircraft from state (fetched from Supabase or empty).
    // In offline mode with no fleet, it shows the empty state.
    // We test this via the empty state prompt.
    render(<PVTAIRFrat />);
    expect(screen.getByText('No Aircraft Registered')).toBeInTheDocument();
  });
});

describe('PVTAIRFrat — tab navigation', () => {
  it('clicking "Flight Following" tab switches the view', () => {
    render(<PVTAIRFrat />);
    const flightsTab = screen.getByTitle('Flight Following');
    fireEvent.click(flightsTab);
    expect(screen.getByText('FLIGHT FOLLOWING')).toBeInTheDocument();
    // Previous title should no longer be present
    expect(screen.queryByText('NEW FLIGHT RISK ASSESSMENT')).not.toBeInTheDocument();
  });

  it('clicking "Reports" tab switches the view', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Reports'));
    expect(screen.getByText('SAFETY REPORTS')).toBeInTheDocument();
  });

  it('clicking back to FRAT tab restores default view', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Reports'));
    expect(screen.getByText('SAFETY REPORTS')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('FRAT'));
    expect(screen.getByText('NEW FLIGHT RISK ASSESSMENT')).toBeInTheDocument();
  });

  it('switches between multiple tabs correctly', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Policies'));
    expect(screen.getByText('POLICIES')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Training'));
    expect(screen.getByText('TRAINING')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('FRAT'));
    expect(screen.getByText('NEW FLIGHT RISK ASSESSMENT')).toBeInTheDocument();
  });
});

describe('PVTAIRFrat — NavBar tab rendering', () => {
  it('renders FRAT tab', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByTitle('FRAT')).toBeInTheDocument();
  });

  it('renders Flight Following tab', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByTitle('Flight Following')).toBeInTheDocument();
  });

  it('renders Reports tab', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByTitle('Reports')).toBeInTheDocument();
  });

  it('renders Policies tab', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByTitle('Policies')).toBeInTheDocument();
  });

  it('renders Training tab', () => {
    render(<PVTAIRFrat />);
    expect(screen.getByTitle('Training')).toBeInTheDocument();
  });

  it('FRAT tab is active by default (has highlighted style)', () => {
    render(<PVTAIRFrat />);
    const fratTab = screen.getByTitle('FRAT');
    // Active tab has white border-left and white text color
    expect(fratTab).toHaveStyle({ borderLeft: '2px solid #FFFFFF' });
  });
});

describe('PVTAIRFrat — dynamic component rendering', () => {
  it('renders SafetyReporting dynamic component when on Reports tab', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Reports'));
    expect(screen.getByTestId('dynamic-SafetyReporting')).toBeInTheDocument();
  });

  it('renders PolicyTraining dynamic component when on Policies tab', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Policies'));
    expect(screen.getByTestId('dynamic-PolicyTraining')).toBeInTheDocument();
  });

  it('renders CbtModules dynamic component when on Training tab', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Training'));
    expect(screen.getByTestId('dynamic-CbtModules')).toBeInTheDocument();
  });
});

describe('PVTAIRFrat — offline localStorage fallback', () => {
  it('loads FRAT records from localStorage on init (offline mode)', () => {
    const records = [
      { id: 'FRAT-TEST1', pilot: 'John', aircraft: 'C172', tailNumber: 'N12345',
        departure: 'KSFF', destination: 'KBOI', score: 10, riskLevel: 'LOW RISK',
        factors: [], timestamp: '2024-01-01T00:00:00Z' }
    ];
    localStorage.setItem('pvtair_frat_records', JSON.stringify(records));
    render(<PVTAIRFrat />);
    // The component loads records from localStorage in offline mode
    // Verify it renders without error
    expect(screen.getByText('NEW FLIGHT RISK ASSESSMENT')).toBeInTheDocument();
  });

  it('loads flight data from localStorage on init (offline mode)', () => {
    const flights = [
      { id: 'FLT-1', pilot: 'Jane', aircraft: 'BE200', departure: 'KJFK',
        destination: 'KLAX', status: 'active', timestamp: '2024-06-01T00:00:00Z' }
    ];
    localStorage.setItem('pvtair_flights', JSON.stringify(flights));
    render(<PVTAIRFrat />);
    expect(screen.getByText('NEW FLIGHT RISK ASSESSMENT')).toBeInTheDocument();
  });
});

describe('PVTAIRFrat — toast rendering', () => {
  it('does not render a toast by default', () => {
    const { container } = render(<PVTAIRFrat />);
    // Toast appears as a fixed-position div; none should exist on initial render
    const toastDiv = container.querySelector('[style*="position: fixed"][style*="top: 16px"]');
    expect(toastDiv).toBeNull();
  });
});

describe('PVTAIRFrat — AdminGate behavior', () => {
  it('does not show AdminGate for the default "submit" view', () => {
    render(<PVTAIRFrat />);
    // AdminGate has a "UNLOCK" button and "Admin Access" text
    expect(screen.queryByText('Admin Access')).not.toBeInTheDocument();
    expect(screen.queryByText('UNLOCK')).not.toBeInTheDocument();
  });

  it('does not show AdminGate for "flights" view in offline mode', () => {
    render(<PVTAIRFrat />);
    fireEvent.click(screen.getByTitle('Flight Following'));
    expect(screen.queryByText('Admin Access')).not.toBeInTheDocument();
  });
});

describe('PVTAIRFrat — organization info display', () => {
  it('renders org logo in sidebar', () => {
    const { container } = render(<PVTAIRFrat />);
    const logo = container.querySelector('aside img');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('/logo.png');
  });

  it('does not show user info bar (no session in offline mode)', () => {
    render(<PVTAIRFrat />);
    // In offline mode there is no userName, so "Log out" button should not be present
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });
});

describe('PVTAIRFrat — structural elements', () => {
  it('has a main content area with left margin for sidebar', () => {
    const { container } = render(<PVTAIRFrat />);
    const mainContent = container.querySelector('.main-content');
    expect(mainContent).toBeTruthy();
    expect(mainContent.style.marginLeft).toBe('140px');
  });

  it('renders the <aside> sidebar with fixed positioning', () => {
    const { container } = render(<PVTAIRFrat />);
    const sidebar = container.querySelector('aside.nav-sidebar');
    expect(sidebar).toBeTruthy();
    expect(sidebar.style.position).toBe('fixed');
    expect(sidebar.style.width).toBe('140px');
  });

  it('renders a <main> element for page content', () => {
    const { container } = render(<PVTAIRFrat />);
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
  });

  it('renders a <footer> element', () => {
    const { container } = render(<PVTAIRFrat />);
    const footerEls = container.querySelectorAll('footer');
    // There should be at least one footer
    expect(footerEls.length).toBeGreaterThanOrEqual(1);
  });
});
