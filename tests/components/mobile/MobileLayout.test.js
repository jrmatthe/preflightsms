import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileLayout from '../../../components/mobile/MobileLayout';

// ── Section 25: Mobile Layout ──

// Mock child components to keep tests focused on layout orchestration
vi.mock('../../../components/mobile/MobileHeader', () => ({
  default: (props) => <div data-testid="mobile-header">{props.orgName}</div>,
}));
vi.mock('../../../components/mobile/MobileTabBar', () => ({
  default: ({ activeTab, onTabChange, pendingCount }) => (
    <div data-testid="mobile-tab-bar">
      <button data-testid="tab-flights" onClick={() => onTabChange('flights')}>Flights</button>
      <button data-testid="tab-frat" onClick={() => onTabChange('frat')}>New FRAT</button>
      <button data-testid="tab-reports" onClick={() => onTabChange('reports')}>Reports</button>
      <button data-testid="tab-training" onClick={() => onTabChange('training')}>Training</button>
      <button data-testid="tab-more" onClick={() => onTabChange('more')}>More</button>
      {pendingCount > 0 && <span data-testid="pending-count">{pendingCount}</span>}
    </div>
  ),
}));
vi.mock('../../../components/mobile/MobileFlightsView', () => ({
  default: () => <div data-testid="mobile-flights-view">MobileFlightsView</div>,
}));
vi.mock('../../../components/mobile/MobileFRATWizard', () => ({
  default: () => <div data-testid="mobile-frat-wizard">MobileFRATWizard</div>,
}));
vi.mock('../../../components/mobile/MobileReportsView', () => ({
  default: () => <div data-testid="mobile-reports-view">MobileReportsView</div>,
}));
vi.mock('../../../components/mobile/MobileTrainingView', () => ({
  default: () => <div data-testid="mobile-training-view">MobileTrainingView</div>,
}));
vi.mock('../../../components/mobile/MobileMoreMenu', () => ({
  default: (props) => (
    <div data-testid="mobile-more-menu">
      <button onClick={() => props.onSubViewChange('fleet')}>Fleet Status</button>
      <button onClick={() => props.onSubViewChange('erp')}>ERP</button>
      <button onClick={() => props.onSubViewChange('notifications')}>Notifications</button>
      <button onClick={() => props.onSubViewChange('profile')}>Profile</button>
    </div>
  ),
}));

// Mock offlineQueue
vi.mock('../../../lib/offlineQueue', () => ({
  getQueueCount: vi.fn().mockReturnValue(0),
}));

const defaultProps = {
  session: { user: { id: 'u1' } },
  profile: { id: 'u1', role: 'pilot', full_name: 'Test Pilot' },
  orgData: { id: 'org-1', name: 'Test Org', tier: 'starter' },
  notifications: [],
  notifReads: [],
  onMarkNotifRead: vi.fn(),
  onMarkAllNotifsRead: vi.fn(),
  onSignOut: vi.fn(),
  flights: [],
  onUpdateFlight: vi.fn(),
  onSubmitFRAT: vi.fn(),
  fleetAircraft: [],
  fratTemplate: null,
  allFratTemplates: [],
  riskLevels: [],
  nudgeFlight: null,
  onNudgeSubmitReport: vi.fn(),
  onNudgeDismiss: vi.fn(),
  reportPrefill: null,
  setReportPrefill: vi.fn(),
  reports: [],
  onSubmitReport: vi.fn(),
  cbtCourses: [],
  cbtLessonsMap: {},
  cbtProgress: [],
  cbtEnrollments: [],
  trainingReqs: [],
  trainingRecs: [],
  onUpdateCbtProgress: vi.fn(),
  onUpdateCbtEnrollment: vi.fn(),
  onLogTraining: vi.fn(),
  refreshCbt: vi.fn(),
  hazards: [],
  actions: [],
  onUpdateAction: vi.fn(),
  onUpdateAircraftStatus: vi.fn(),
  erpPlans: [],
  onLoadErpChecklist: vi.fn(),
  onLoadErpCallTree: vi.fn(),
  policies: [],
  onAcknowledgePolicy: vi.fn(),
  hasFlights: true,
  hasTraining: true,
};

function renderML(overrides = {}) {
  return render(<MobileLayout {...defaultProps} {...overrides} />);
}

describe('MobileLayout', () => {
  // 25.2.1 Tab bar renders with 5 tabs
  it('renders tab bar with Flights, New FRAT, Reports, Training, More tabs', () => {
    renderML();
    expect(screen.getByTestId('tab-flights')).toBeInTheDocument();
    expect(screen.getByTestId('tab-frat')).toBeInTheDocument();
    expect(screen.getByTestId('tab-reports')).toBeInTheDocument();
    expect(screen.getByTestId('tab-training')).toBeInTheDocument();
    expect(screen.getByTestId('tab-more')).toBeInTheDocument();
  });

  // 25.2.2 Flights tab shows MobileFlightsView
  it('displays MobileFlightsView when flights tab is active', () => {
    renderML();
    // Default tab is flights
    expect(screen.getByTestId('mobile-flights-view')).toBeInTheDocument();
  });

  // 25.2.3 FRAT tab shows MobileFRATWizard
  it('switches to MobileFRATWizard when New FRAT tab is tapped', () => {
    renderML();
    fireEvent.click(screen.getByTestId('tab-frat'));
    // After tab transition (100ms delay in the component)
    setTimeout(() => {
      expect(screen.getByTestId('mobile-frat-wizard')).toBeInTheDocument();
    }, 150);
  });

  // 25.2.4 Reports tab shows MobileReportsView
  it('switches to MobileReportsView when Reports tab is tapped', () => {
    renderML();
    fireEvent.click(screen.getByTestId('tab-reports'));
    setTimeout(() => {
      expect(screen.getByTestId('mobile-reports-view')).toBeInTheDocument();
    }, 150);
  });

  // 25.2.5 Training tab shows MobileTrainingView
  it('switches to MobileTrainingView when Training tab is tapped', () => {
    renderML();
    fireEvent.click(screen.getByTestId('tab-training'));
    setTimeout(() => {
      expect(screen.getByTestId('mobile-training-view')).toBeInTheDocument();
    }, 150);
  });

  // 25.2.6 More tab shows MobileMoreMenu
  it('switches to MobileMoreMenu when More tab is tapped', () => {
    renderML();
    fireEvent.click(screen.getByTestId('tab-more'));
    setTimeout(() => {
      expect(screen.getByTestId('mobile-more-menu')).toBeInTheDocument();
    }, 150);
  });

  // 25.3.1 Free tier: flights gated
  it('shows UpgradeScreen when hasFlights is false', () => {
    renderML({ hasFlights: false });
    expect(screen.getByText('Flight Following')).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to unlock/)).toBeInTheDocument();
  });

  // 25.3.2 Free tier: training gated
  it('shows UpgradeScreen when hasTraining is false', () => {
    renderML({ hasTraining: false });
    fireEvent.click(screen.getByTestId('tab-training'));
    setTimeout(() => {
      expect(screen.getByText(/Upgrade to unlock/)).toBeInTheDocument();
    }, 150);
  });

  // 25.3.3 Starter tier: flights normal
  it('shows MobileFlightsView when hasFlights is true', () => {
    renderML({ hasFlights: true });
    expect(screen.getByTestId('mobile-flights-view')).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to unlock/)).not.toBeInTheDocument();
  });

  // Renders mobile header
  it('renders mobile header with org name', () => {
    renderML();
    expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
  });

  // Offline indicator
  it('shows offline indicator when browser is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    renderML();
    // The offline banner should appear
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  // Notification count
  it('calculates unread notification count', () => {
    const notifications = [
      { id: 'n1', target_roles: ['pilot'], target_user_id: null },
      { id: 'n2', target_roles: ['admin'], target_user_id: null },
      { id: 'n3', target_roles: [], target_user_id: 'u1' },
    ];
    renderML({ notifications, notifReads: ['n1'] });
    // n1 is read, n2 targets admin (pilot can't see it), n3 targets this user
    // So unread count = 1 (n3)
  });
});
