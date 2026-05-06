# Delivery Dashboard (React + Tailwind)

This dashboard visualizes a mock real-time delivery assignment system:

- Streaming incoming orders
- Greedy/scoring-based agent assignment
- Agent movement + busy/available state
- SLA countdown + delivery completion
- Metrics (avg delivery time, SLA violation rate, workload variance)
- Assignment log

## Setup

```bash
cd frontend
npm install
```

## Run (dev)

```bash
npm run dev
```

Then open the printed `http://localhost:5173` URL.

## Notes

- The simulation logic is in `src/simulation/*`.
- The UI is in `src/components/*`.
- Global state is managed by `src/context/DashboardContext.tsx`.

