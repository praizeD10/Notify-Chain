import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { ActivityFeed } from './components/ActivityFeed';
import { DeliveryHeatmap } from './components/DeliveryHeatmap';
import { MobileNavDrawer, NAV_ITEMS, type Tab } from './components/MobileNavDrawer';
import { NotificationTimelineView } from './components/NotificationTimelineView';
import { RetryStatisticsPanel } from './components/RetryStatisticsPanel';
import { SyncStatus } from './components/SyncStatus';
import { ThemeToggle } from './components/ThemeToggle';
import { UserActivityTimeline } from './components/UserActivityTimeline';
import { ToastProvider } from './context/ToastContext';
import { useTheme } from './hooks/useTheme';
import { ChannelDetailsPage } from './pages/ChannelDetailsPage';
import { EventExplorerPage } from './pages/EventExplorerPage';
import { ExportHistoryPage } from './pages/ExportHistoryPage';
import { NotificationPreferencesPage } from './pages/NotificationPreferencesPage';
import { NotificationSearchPage } from './pages/NotificationSearchPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { WebhookDashboardPage } from './pages/WebhookDashboardPage';
import { useEventStore } from './store/eventStore';
import type { BlockchainEvent } from './types/event';

export function App() {
  const [tab, setTab] = useState<Tab>('explorer');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const events = useEventStore((state) => state.events);
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    if (tabs.length === 0) return;

    const current = tabs.findIndex((element) => element === document.activeElement);
    if (current < 0) return;

    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      next = (current + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      next = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      next = tabs.length - 1;
    }

    if (next !== current) {
      tabs[next].focus();
      setTab(NAV_ITEMS[next].id);
    }
  }, []);

  return (
    <ToastProvider>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="app">
        <header className="app__header" role="banner">
          <div className="app__header-inner">
            <button
              type="button"
              className="app__hamburger"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <span className="app__hamburger-bar" aria-hidden="true" />
              <span className="app__hamburger-bar" aria-hidden="true" />
              <span className="app__hamburger-bar" aria-hidden="true" />
            </button>

            <span className="app__brand">NotifyChain</span>

            <div className="app__theme-bar">
              <SyncStatus />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </header>

        <nav className="app-tabs" aria-label="Main navigation">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Dashboard sections"
            className="app-tabs__list"
            onKeyDown={handleTabKeyDown}
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                className={`app-tabs__btn${tab === item.id ? ' app-tabs__btn--active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <MobileNavDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeTab={tab}
          onSelectTab={setTab}
        />

        <main id="main-content" className="app__content" tabIndex={-1}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              role="tabpanel"
              id={`panel-${item.id}`}
              aria-labelledby={`tab-${item.id}`}
              hidden={tab !== item.id}
              className="app__panel"
            >
              {tab === item.id && renderPanel(item.id, events)}
            </div>
          ))}
        </main>
      </div>
    </ToastProvider>
  );
}

function renderPanel(tab: Tab, events: BlockchainEvent[]) {
  switch (tab) {
    case 'explorer':
      return (
        <>
          <EventExplorerPage />
          <DeliveryHeatmap events={events} />
        </>
      );
    case 'timeline':
      return <NotificationTimelineView />;
    case 'activity':
      return <ActivityFeed />;
    case 'user-activity':
      return <UserActivityTimeline />;
    case 'retry-stats':
      return <RetryStatisticsPanel />;
    case 'webhooks':
      return <WebhookDashboardPage />;
    case 'export-history':
      return <ExportHistoryPage />;
    case 'search':
      return <NotificationSearchPage />;
    case 'preferences':
      return <NotificationPreferencesPage />;
    case 'templates':
      return <TemplatesPage />;
    case 'channels':
      return <ChannelDetailsPage />;
    default:
      return null;
  }
}