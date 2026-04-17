// ─── Mock Data Generators ────────────────────────────────────────────────────
// All values are stable: call once inside useState(() => fn()) to avoid flicker

// ── Greeting ─────────────────────────────────────────────────────────────────
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateStats() {
  return [
    {
      label: "Voice Sessions",
      value: rand(120, 180),
      trend: rand(8, 22),
      positive: true,
      icon: "Mic2",
    },
    {
      label: "Queries Answered",
      value: rand(70, 110),
      trend: rand(3, 15),
      positive: true,
      icon: "MessageSquare",
    },
    {
      label: "Actions Completed",
      value: rand(30, 55),
      trend: rand(10, 30),
      positive: true,
      icon: "CheckCircle2",
    },
    {
      label: "Knowledge Chunks",
      value: rand(18, 40),
      trend: rand(-5, 5),
      positive: null, // neutral
      icon: "Database",
    },
  ];
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
const ACTIVITY_TEMPLATES = [
  { text: "Created task — follow up with design team", icon: "CheckSquare", type: "action" },
  { text: "Searched knowledge base for Q3 roadmap", icon: "Search", type: "query" },
  { text: "Scheduled sync with engineering team", icon: "Calendar", type: "action" },
  { text: "Summarized Design Guidelines document", icon: "FileText", type: "doc" },
  { text: "Ingested new Google Drive folder", icon: "Upload", type: "ingest" },
  { text: "Extracted action items from meeting notes", icon: "Clipboard", type: "action" },
  { text: "Queried memory: last weekly report", icon: "Brain", type: "memory" },
  { text: "Connected Notion workspace", icon: "Link", type: "connector" },
  { text: "Answered question about product metrics", icon: "BarChart2", type: "query" },
  { text: "Drafted follow-up email for Priya", icon: "Mail", type: "action" },
];

const TIME_LABELS = ["Just now", "2 min ago", "8 min ago", "23 min ago", "1 hr ago", "2 hrs ago", "3 hrs ago", "Yesterday"];

export function generateActivities(count = 7) {
  // Stable shuffle using seeded index
  const shuffled = [...ACTIVITY_TEMPLATES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((item, i) => ({
    ...item,
    time: TIME_LABELS[i] ?? "Yesterday",
    id: i,
  }));
}

// ── Heatmap (7 cols × 5 rows = 35 cells) ─────────────────────────────────────
// Returns a flat array of 35 integers 0–4 representing activity level
export function generateHeatmap() {
  // Weighted toward 0–2 so it looks realistic (sparse)
  const weights = [0, 0, 0, 0, 1, 1, 2, 2, 3, 4];
  return Array.from({ length: 35 }, () => weights[Math.floor(Math.random() * weights.length)]);
}

// ── Agent Intelligence Score ──────────────────────────────────────────────────
export function generateAgentScore() {
  return rand(78, 94);
}

// ── Recent Action (for HomePage) ─────────────────────────────────────────────
const RECENT_ACTIONS = [
  "Created task — 'Follow up with Priya at 10 AM'",
  "Summarized Q3 planning document",
  "Scheduled sync with the engineering team",
  "Extracted action items from design review",
  "Answered question about product roadmap",
];

export function getRecentAction() {
  return {
    text: RECENT_ACTIONS[Math.floor(Math.random() * RECENT_ACTIONS.length)],
    time: `${Math.floor(Math.random() * 9) + 1} min ago`,
  };
}
