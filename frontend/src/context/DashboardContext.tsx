import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Agent, MetricsSnapshot, Order, Weights } from "../simulation/types";
import { makeInitialAgents, makeStreamingOrders } from "../simulation/mockData";
import { SimulatorEngine } from "../simulation/simulator";

export type AssignmentLogEntry = { tsMs: number; message: string };

export type DashboardWeights = Weights;

export type DashboardState = {
  running: boolean;
  simNowMs: number;
  orders: Order[];
  agents: Agent[];
  pendingCount: number;
  assignmentLog: AssignmentLogEntry[];
  metrics: MetricsSnapshot;
  weights: DashboardWeights;
};

type DashboardContextValue = DashboardState & {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setWeights: (w: DashboardWeights) => void;
  manualAssign: (orderId: string, agentId: string) => boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [running, setRunning] = useState(false);
  const [simNowMs, setSimNowMs] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [assignmentLog, setAssignmentLog] = useState<AssignmentLogEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot>({
    totalCompleted: 0,
    averageDeliveryMinutes: 0,
    slaViolations: 0,
    slaViolationRatePercent: 0,
    loadVariance: 0
  });

  const [weights, setWeightsState] = useState<DashboardWeights>({
    distanceWeight: 0.55,
    priorityWeight: 0.45
  });

  const engineRef = useRef<SimulatorEngine | null>(null);
  const intervalRef = useRef<number | null>(null);

  const intervalMs = 250;

  const initializeEngine = () => {
    const baseAgents = makeInitialAgents();
    const ordersStream = makeStreamingOrders();
    engineRef.current = new SimulatorEngine({
      agents: baseAgents,
      streamedOrders: ordersStream,
      dynamicDelay: true,
      weights
    });
    const snapshot = engineRef.current.getSnapshot();
    setSimNowMs(snapshot.simNowMs);
    setOrders(snapshot.orders);
    setAgents(snapshot.agents);
    setPendingCount(snapshot.pendingCount);
    setAssignmentLog(snapshot.assignmentLog);
    setMetrics(snapshot.metrics);
  };

  const stopInternal = () => {
    setRunning(false);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    if (!engineRef.current) initializeEngine();
    setRunning(true);
  };

  const reset = () => {
    stopInternal();
    initializeEngine();
  };

  const manualAssign = (orderId: string, agentId: string) => {
    const engine = engineRef.current;
    if (!engine) return false;
    const ok = engine.manualAssign(orderId, agentId);
    if (ok) {
      const snap = engine.getSnapshot();
      setSimNowMs(snap.simNowMs);
      setOrders(snap.orders);
      setAgents(snap.agents);
      setPendingCount(snap.pendingCount);
      setAssignmentLog(snap.assignmentLog);
      setMetrics(snap.metrics);
    }
    return ok;
  };

  useEffect(() => {
    if (!running) return;
    if (!engineRef.current) initializeEngine();

    intervalRef.current = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.tick(intervalMs);
      const snap = engine.getSnapshot();
      setSimNowMs(snap.simNowMs);
      setOrders(snap.orders);
      setAgents(snap.agents);
      setPendingCount(snap.pendingCount);
      setAssignmentLog(snap.assignmentLog.slice(-250));
      setMetrics(snap.metrics);
    }, intervalMs);

    return () => stopInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setWeights(weights);
  }, [weights]);

  // Initialize once so the dashboard has something visible.
  useEffect(() => {
    initializeEngine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      running,
      simNowMs,
      orders,
      agents,
      pendingCount,
      assignmentLog,
      metrics,
      weights,
      start,
      stop: stopInternal,
      reset,
      setWeights: (w: DashboardWeights) => setWeightsState(w),
      manualAssign
    }),
    [running, simNowMs, orders, agents, pendingCount, assignmentLog, metrics, weights]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

