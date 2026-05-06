import React, { useMemo, useState } from "react";
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import { MapView } from "./components/MapView";
import { OrdersPanel } from "./components/OrdersPanel";
import { AgentsPanel } from "./components/AgentsPanel";
import { AssignmentLog } from "./components/AssignmentLog";
import { MetricsPanel } from "./components/MetricsPanel";
import { ControlsPanel } from "./components/ControlsPanel";
import { Button } from "./components/ui/Button";

function DashboardInner() {
  const { running, simNowMs, orders, agents, assignmentLog, metrics, pendingCount, weights, start, stop, reset, setWeights, manualAssign } =
    useDashboard();

  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);

  const manualAssignDisabled = useMemo(() => {
    if (!selectedOrderId || !selectedAgentId) return true;
    const order = orders.find((o) => o.order_id === selectedOrderId);
    const agent = agents.find((a) => a.agent_id === selectedAgentId);
    if (!order || !agent) return true;
    if (order.status !== "unassigned") return true;
    if (order.createdAtMs > simNowMs) return true;
    if (agent.tasks.length >= 2) return true;
    return false;
  }, [selectedOrderId, selectedAgentId, orders, agents, simNowMs]);

  const canManuallyAssign = !manualAssignDisabled;
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/70 dark:bg-slate-950/60 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold tracking-tight">Delivery Assignment Operations Dashboard</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Real-time streaming + scoring-based dispatch (mock backend)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={running ? "secondary" : "primary"}
              onClick={() => (running ? stop() : start())}
              title={running ? "Stop streaming" : "Start streaming"}
            >
              {running ? "Stop" : "Start"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
            <Button variant="ghost" onClick={toggleDarkMode} title="Toggle dark mode">
              {darkMode ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <MapView agents={agents} orders={orders} />
          </div>
          <div>
            <MetricsPanel metrics={metrics} agents={agents} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OrdersPanel
                orders={orders}
                simNowMs={simNowMs}
                selectedOrderId={selectedOrderId}
                onSelectOrder={(id) => setSelectedOrderId(id)}
              />
              <AgentsPanel
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={(id) => setSelectedAgentId(id)}
              />
            </div>
          </div>
          <div className="space-y-4">
            <ControlsPanel
              running={running}
              pendingCount={pendingCount}
              weights={weights}
              onStart={start}
              onStop={stop}
              onReset={reset}
              onChangeWeights={(w) => setWeights(w)}
            />

            <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 shadow-soft ring-1 ring-slate-200/70 dark:ring-slate-800/60 p-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Manual Assign (Testing)</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                Select an <span className="font-medium">Unassigned Order</span> and an <span className="font-medium">Available Agent</span>, then assign.
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">Order</span>
                  <span className="font-semibold tabular-nums">{selectedOrderId ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">Agent</span>
                  <span className="font-semibold tabular-nums">{selectedAgentId ?? "—"}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={manualAssignDisabled}
                  onClick={() => {
                    if (!selectedOrderId || !selectedAgentId) return;
                    const ok = manualAssign(selectedOrderId, selectedAgentId);
                    if (ok) setSelectedOrderId(undefined);
                  }}
                >
                  Assign
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedOrderId(undefined);
                    setSelectedAgentId(undefined);
                  }}
                >
                  Clear
                </Button>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-3">
                Note: manual assignment uses the same prep + travel simulation and updates agent workload instantly.
              </div>
            </div>
          </div>
        </div>

        <AssignmentLog entries={assignmentLog} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}

