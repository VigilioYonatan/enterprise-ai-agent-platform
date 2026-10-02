import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plug,
  ScrollText,
  ShieldCheck,
  Sun,
  Workflow,
  Wrench,
  X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

const AgentDetailPage = lazy(() =>
  import('../features/agents/agent-detail').then((m) => ({
    default: m.AgentDetailPage,
  })),
);
const AgentsPage = lazy(() =>
  import('../features/agents/agents').then((m) => ({ default: m.AgentsPage })),
);
const ApprovalDetailPage = lazy(() =>
  import('../features/approvals/approvals').then((m) => ({
    default: m.ApprovalDetailPage,
  })),
);
const ApprovalsPage = lazy(() =>
  import('../features/approvals/approvals').then((m) => ({
    default: m.ApprovalsPage,
  })),
);
const AuditPage = lazy(() =>
  import('../features/audit/audit').then((m) => ({ default: m.AuditPage })),
);
const Dashboard = lazy(() =>
  import('../features/dashboard/dashboard').then((m) => ({
    default: m.Dashboard,
  })),
);
const EvaluationsPage = lazy(() =>
  import('../features/evaluations/evaluations').then((m) => ({
    default: m.EvaluationsPage,
  })),
);
const IntegrationsPage = lazy(() =>
  import('../features/integrations/integrations').then((m) => ({
    default: m.IntegrationsPage,
  })),
);
const KnowledgePage = lazy(() =>
  import('../features/knowledge/knowledge').then((m) => ({
    default: m.KnowledgePage,
  })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/notifications').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const RunDetailPage = lazy(() =>
  import('../features/runs/runs').then((m) => ({ default: m.RunDetailPage })),
);
const RunsPage = lazy(() =>
  import('../features/runs/runs').then((m) => ({ default: m.RunsPage })),
);
const MembersPage = lazy(() =>
  import('../features/settings/members').then((m) => ({
    default: m.MembersPage,
  })),
);
const ToolsPage = lazy(() =>
  import('../features/tools/tools').then((m) => ({ default: m.ToolsPage })),
);
const UsagePage = lazy(() =>
  import('../features/usage/usage').then((m) => ({ default: m.UsagePage })),
);
const WorkflowEditor = lazy(() =>
  import('../features/workflows/workflows').then((m) => ({
    default: m.WorkflowEditor,
  })),
);
const WorkflowsPage = lazy(() =>
  import('../features/workflows/workflows').then((m) => ({
    default: m.WorkflowsPage,
  })),
);

import { BrandLogo } from '../libs/brand-logo';
import { Button, ErrorState } from '../libs/ui';
import { auth } from '../services/auth/oidc-client';
import { useAuth } from './auth-context';
import { ErrorBoundary } from './error-boundary';
import { useWorkspace } from './workspace-context';

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    void auth
      .signinRedirectCallback()
      .then(() => navigate('/app', { replace: true }))
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Sign-in failed'),
      );
  }, [navigate]);
  return (
    <main className="p-8" role="status">
      {error ? <p role="alert">{error}</p> : 'Finishing secure sign-in…'}
    </main>
  );
}

function Home() {
  const { user, login } = useAuth();
  useEffect(() => {
    document.title = 'AgentOps — Enterprise AI Workflows';
  }, []);
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-start justify-center px-6">
      <div className="flex items-center gap-3">
        <BrandLogo sizePixels={36} />
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
          AGENTOPS / SELF-HOSTED
        </p>
      </div>
      <h1 className="mt-6 max-w-3xl text-5xl font-extrabold tracking-tight md:text-7xl">
        Agent workflows you can trust.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-foreground-muted">
        Build, publish and execute AI agents with durable checkpoints, auditable
        approvals and an isolated enterprise workspace.
      </p>
      <div className="mt-8">
        {user ? (
          <Link className="btn btn-primary" to="/app">
            Open console
          </Link>
        ) : (
          <Button onClick={() => void login()}>Sign in / Register</Button>
        )}
      </div>
      <p className="mt-6 text-sm text-foreground-muted">
        Identity and password recovery are hosted by Keycloak. No AWS or
        proprietary platform dependency.
      </p>
    </main>
  );
}

const navItems = [
  { path: '/app', label: 'Overview', icon: LayoutDashboard },
  { path: '/app/agents', label: 'Agents', icon: Bot },
  { path: '/app/workflows', label: 'Workflows', icon: Workflow },
  { path: '/app/runs', label: 'Runs', icon: Activity },
  { path: '/app/approvals', label: 'Approvals', icon: ShieldCheck },
  { path: '/app/notifications', label: 'Notifications', icon: Bell },
  { path: '/app/tools', label: 'Tools', icon: Wrench },
  { path: '/app/integrations', label: 'Integrations', icon: Plug },
  { path: '/app/knowledge', label: 'Knowledge', icon: BookOpen },
  { path: '/app/evaluations', label: 'Evaluations', icon: ChartNoAxesCombined },
  { path: '/app/usage', label: 'Usage', icon: ChartNoAxesCombined },
  { path: '/app/audit', label: 'Audit', icon: ScrollText },
  { path: '/app/settings/members', label: 'Members', icon: ShieldCheck },
];

function Layout() {
  const { user, logout } = useAuth();
  const { org, orgs, setOrg, error } = useWorkspace();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = window.localStorage.getItem('agentops-theme');
    return (
      saved === 'dark' ||
      (saved !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    window.localStorage.setItem('agentops-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const activeItem = [...navItems]
      .reverse()
      .find((item) =>
        item.path === '/app'
          ? location.pathname === '/app'
          : location.pathname.startsWith(item.path),
      );
    document.title = activeItem
      ? `AgentOps — ${activeItem.label}`
      : 'AgentOps Console';
  }, [location.pathname]);

  useEffect(() => {
    if (!menu) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [menu]);

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3"
      >
        Skip to content
      </a>
      <aside
        id="primary-sidebar"
        className={`${menu ? 'block' : 'hidden'} border-b border-border-ui bg-surface lg:block lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="sticky top-0 p-5">
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
              to="/app"
            >
              <BrandLogo sizePixels={28} /> AgentOps
            </Link>
            <button
              type="button"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg lg:hidden"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            >
              <X />
            </button>
          </div>
          <label
            className="mt-7 block text-xs font-bold uppercase tracking-wider text-foreground-muted"
            htmlFor="org-select"
          >
            Workspace
          </label>
          <select
            id="org-select"
            className="field"
            value={org?.id ?? ''}
            onChange={(e) => setOrg(e.target.value)}
          >
            <option value="">Select organization</option>
            {orgs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {error && (
            <div className="mt-3">
              <ErrorState error={error} />
            </div>
          )}
          <nav
            aria-label="Primary navigation"
            className="mt-7 flex flex-col gap-1"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                end={item.path === '/app'}
                to={item.path}
                onClick={() => setMenu(false)}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm ${
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                      : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
                  }`
                }
              >
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-10 border-t border-border-ui pt-4">
            <div className="mb-3 truncate text-xs text-foreground-muted">
              {user?.profile.email}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDark((value) => !value)}
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}{' '}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void logout()}
              >
                <LogOut size={15} /> Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border-ui bg-surface px-5 py-3 lg:px-10">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={menu}
            aria-controls="primary-sidebar"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg lg:hidden"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <p className="text-sm text-foreground-muted">
            Enterprise AI / {org?.name ?? 'Select workspace'}
          </p>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Self-hosted
          </span>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1600px] p-5 lg:p-10"
        >
          <ErrorBoundary key={location.pathname}>
            <Suspense
              fallback={
                <div
                  role="status"
                  aria-live="polite"
                  className="p-8 text-center text-sm text-foreground-muted"
                >
                  Loading view...
                </div>
              }
            >
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="agents/:id" element={<AgentDetailPage />} />
                <Route path="workflows" element={<WorkflowsPage />} />
                <Route
                  path="workflows/:id/editor"
                  element={<WorkflowEditor />}
                />
                <Route path="runs" element={<RunsPage />} />
                <Route path="runs/:id" element={<RunDetailPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="approvals/:id" element={<ApprovalDetailPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="usage" element={<UsagePage />} />
                <Route path="evaluations" element={<EvaluationsPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="tools" element={<ToolsPage />} />
                <Route path="settings/members" element={<MembersPage />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function Protected() {
  const { user, loading, login } = useAuth();
  if (loading) {
    return (
      <main className="p-8" role="status">
        Checking your session…
      </main>
    );
  }
  if (!user) {
    return (
      <main className="p-8">
        <p className="mb-4">Please sign in to continue.</p>
        <Button onClick={() => void login()}>Sign in</Button>
      </main>
    );
  }
  return <Layout />;
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/app/*" element={<Protected />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
