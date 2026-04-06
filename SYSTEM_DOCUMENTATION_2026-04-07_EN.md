# EvalStudio - System Documentation

> This document describes the full architecture of the EvalStudio dashboard project: data flow, how components work, and the steps required to add a new eval system. When given to another AI agent, it should be able to fully understand and start developing on this system immediately.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [File & Directory Structure](#3-file--directory-structure)
4. [Database Architecture (Supabase)](#4-database-architecture-supabase)
5. [Data Contract: EvalReport JSON Structure](#5-data-contract-evalreport-json-structure)
6. [Agent Registry System](#6-agent-registry-system)
7. [Data Flow: DB to UI](#7-data-flow-db-to-ui)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Page Structures & Routing](#9-page-structures--routing)
10. [Hook System](#10-hook-system)
11. [State Management](#11-state-management)
12. [Component Catalog](#12-component-catalog)
13. [Style & Theme System](#13-style--theme-system)
14. [Constants & Configuration](#14-constants--configuration)
15. [Export System](#15-export-system)
16. [Hard-Coded vs Dynamic Elements — Full List](#16-hard-coded-vs-dynamic-elements--full-list)
17. [Guide: Adding a New Eval System](#17-guide-adding-a-new-eval-system)
18. [Known Limitations](#18-known-limitations)
19. [Development Recommendations](#19-development-recommendations)

---

## 1. Project Overview

EvalStudio is a monitoring dashboard that evaluates the outputs of LLM-based agents. Each agent's output is assessed by an eval pipeline and the results are written to a Supabase database. The dashboard reads this data to provide:

- Per-agent score tracking
- Per-criteria detailed analysis
- Input/Output JSON comparison
- Improvement suggestion management (cart system)
- Time-series trend charts
- Side-by-side eval comparison
- CSV/PDF export

**Core Architectural Principle:** The dashboard **only reads and displays**. All scores, weights, and weighted_total values are calculated by the eval pipeline and written as JSON to the database. The UI performs no score calculations.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.0.0 |
| Build Tool | Vite | 6.2.0 |
| Language | TypeScript | 5.7.0 (strict mode) |
| Routing | React Router DOM | 7.2.0 |
| State (server) | TanStack React Query | 5.65.0 |
| State (client) | Zustand | 5.0.0 |
| Backend/DB | Supabase JS | 2.49.0 |
| Styling | Tailwind CSS | 4.0.0 |
| UI Components | shadcn/ui + Base UI | - |
| Charts | Recharts | 2.15.0 |
| Animations | Framer Motion | 12.0.0 |
| Icons | Lucide React | 0.475.0 |
| PDF Export | jsPDF + html2canvas | 4.2.1 / 1.4.1 |
| Diff | diff | 8.0.4 |
| Fonts | Plus Jakarta Sans, JetBrains Mono, Geist | - |

**Scripts:**
```bash
npm run dev      # Vite dev server
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build
```

---

## 3. File & Directory Structure

```
eval_dashboard/
├── index.html                    # HTML entry, font loading
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript config (strict, @/* alias)
├── vite.config.ts                # Vite + React + Tailwind plugin
├── vercel.json                   # SPA routing rewrites
├── components.json               # shadcn/ui configuration
├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── src/
│   ├── main.tsx                  # React DOM render entry
│   ├── App.tsx                   # Router + QueryClient setup
│   ├── index.css                 # Theme, animations, CSS variables
│   ├── vite-env.d.ts             # Vite type definitions
│   │
│   ├── lib/                      # Core libraries
│   │   ├── types.ts              # ALL TypeScript interfaces (162 lines)
│   │   ├── supabase.ts           # Supabase client creation (7 lines)
│   │   ├── normalizers.ts        # Data fetch & normalization (141 lines)
│   │   ├── constants.ts          # Grade/fidelity/agent colors (57 lines)
│   │   ├── utils.ts              # Helper functions (102 lines)
│   │   └── exporters.ts          # CSV/PDF export logic (101 lines)
│   │
│   ├── hooks/                    # React Query hooks (8 total)
│   │   ├── useAgentRegistry.ts   # Agent registry fetch + grouping
│   │   ├── useEvals.ts           # Eval list fetch (per system group)
│   │   ├── useEvalDetail.ts      # Single eval detail fetch
│   │   ├── useBrandScoreHistory.ts    # Per-brand score history
│   │   ├── useCriteriaHeatmapData.ts  # Daily criteria scores (heatmap)
│   │   ├── useSuggestionFrequency.ts  # Suggestion frequency analysis
│   │   ├── useNewEvalNotifications.ts # New eval polling (30s)
│   │   └── useKeyboardShortcuts.ts    # Keyboard shortcuts
│   │
│   ├── stores/                   # Zustand client state (2 total)
│   │   ├── cartStore.ts          # Suggestion cart (localStorage persist)
│   │   └── notificationStore.ts  # Notification state (localStorage persist)
│   │
│   ├── pages/                    # Page components (5 total)
│   │   ├── DashboardPage.tsx     # Main page - overview
│   │   ├── EvalListPage.tsx      # Eval list - search/sort/filter
│   │   ├── EvalDetailPage.tsx    # 3-panel detail view
│   │   ├── CartPage.tsx          # Suggestion cart
│   │   └── ComparisonPage.tsx    # Side-by-side eval comparison
│   │
│   ├── components/
│   │   ├── layout/               # Layout: AppShell, Sidebar
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── eval-list/            # List page components
│   │   ├── eval-detail/          # Detail page components
│   │   ├── cart/                 # Cart components
│   │   ├── shared/               # Shared/reusable components
│   │   └── ui/                   # shadcn/ui primitives (17 files)
│   │
│   └── (none: no test files, no migration files)
```

---

## 4. Database Architecture (Supabase)

### Connection

```typescript
// src/lib/supabase.ts
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,    // https://xxx.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY // public anon key
);
```

The frontend has **read-only** access (protected by RLS). The only write operation is inserting into the `suggestion_applications` table.

### Table Structure

#### `agent_registry` — Central Agent Configuration Table

This table is the heart of the entire system. Every agent is defined here.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `agent_key` | text | Unique agent identifier (e.g., "new_serp_agent") |
| `display_name` | text | UI display name (e.g., "SERP Agent") |
| `color` | text | CSS color value (e.g., "var(--color-agent-serp)") |
| `icon` | text | Lucide icon name (e.g., "search") |
| `system_group` | text | Grouping key (e.g., "content_brief_system") |
| `system_display_name` | text | Group display name (e.g., "Content Brief") |
| `table_name` | text | Name of the table holding this agent's eval data |
| `eval_report_column` | text | Column name containing the EvalReport JSON |
| `input_column` | text/null | Column name for input JSON (optional) |
| `output_column` | text/null | Column name for output JSON (optional) |
| `sort_order` | integer | UI sort priority |
| `is_active` | boolean | Active/inactive filter |
| `created_at` | timestamp | Creation timestamp |

**Example Row:**
```sql
INSERT INTO agent_registry (
  agent_key, display_name, color, icon,
  system_group, system_display_name,
  table_name, eval_report_column, input_column, output_column,
  sort_order, is_active
) VALUES (
  'new_serp_agent', 'SERP Agent', 'var(--color-agent-serp)', 'search',
  'content_brief_system', 'Content Brief System',
  'new_serp_evals', 'eval_report', 'serp_input', 'serp_output',
  1, true
);
```

#### Agent Eval Tables (Separate Table Per Agent)

Each agent's data lives in the table specified by `agent_registry.table_name`. Tables are linked by the `id` column — all agent tables for the same eval run share the same `id`.

**Standard Column Layout:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Eval run ID (shared across all agent tables) |
| `created_at` | timestamp | Creation timestamp |
| `brand_name` | text/null | Only in content_brief tables |
| `[eval_report_column]` | jsonb | EvalReport JSON (see Section 5) |
| `[input_column]` | jsonb/null | Input data sent to the agent |
| `[output_column]` | jsonb/text/null | Output produced by the agent |

**Important:** The `id` value must match across all agent tables. For example, in a single eval run:
- `new_serp_evals.id = "abc-123"`
- `new_citation_evals.id = "abc-123"`
- `new_content_brief_evals.id = "abc-123"`

#### `daily_scores` — Daily Aggregate Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `date` | date | YYYY-MM-DD format |
| `agent_key` | text | Agent reference |
| `avg_score` | numeric | Daily average score (0-100) |
| `eval_count` | integer | Number of evals that day |

This table is populated by an external backend job and read by the dashboard.

#### `suggestion_applications` — Applied Suggestions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Auto-generated |
| `eval_id` | text | Source eval ID |
| `agent_key` | text | Source agent |
| `suggestion_hash` | text | Dedup hash |
| `suggestion_data` | jsonb | ImprovementSuggestion JSON |
| `batch_id` | text/null | Batch application group |
| `applied_at` | timestamp | Application timestamp |

---

## 5. Data Contract: EvalReport JSON Structure

This is the system's fundamental contract. The eval pipeline must produce JSON in this shape; the UI expects this shape.

```typescript
// ========== MAIN STRUCTURE ==========
interface EvalReport {
  overall: EvalOverall;
  eval_metadata: Record<string, unknown>;
  criteria_scores: CriteriaScore[];
}

// ========== OVERALL EVALUATION ==========
interface EvalOverall {
  grade: string;                        // "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"
  grade_label: string;                  // Human-readable label (e.g., "Excellent")
  top_strengths: string[];              // List of key strengths
  top_weaknesses: string[];             // List of key weaknesses
  weighted_total: number;               // 0-100 aggregate score (CALCULATED BY PIPELINE)
  improvement_suggestions: ImprovementSuggestion[];
}

// ========== CRITERIA SCORES ==========
interface CriteriaScore {
  criterion: string;                    // Unique criterion ID (e.g., "keyword_placement")
  label: string;                        // Display name (e.g., "Keyword Placement")
  score: number;                        // 0-10 scale score
  weight: number;                       // Weight multiplier (e.g., 5, 3, 2)
  weighted_score: number;               // score * weight (CALCULATED BY PIPELINE)
  justification: string;                // Explanation for the score
  reference_module: string;             // Source module reference
  positive_evidence: string[];          // Supporting evidence
  negative_evidence: string[];          // Counter-evidence
  input_output_mapping: InputOutputMapping;
}

// ========== INPUT-OUTPUT MAPPING ==========
interface InputOutputMapping {
  fidelity: string;                     // "perfect", "high", "medium-high", "medium", "low", "poor"
  input_element: string;                // Input JSON path or element ID
  output_element: string;               // Output JSON path or element ID
}

// ========== IMPROVEMENT SUGGESTION ==========
interface ImprovementSuggestion {
  priority: "high" | "medium" | "low";
  suggestion: string;                    // Suggestion description
  affected_criterion: string;            // Which criterion it affects
  expected_score_impact: string;         // Expected impact (e.g., "+1.5 to +2.0")
  prompt_patch: PromptPatch;
}

// ========== PROMPT PATCH ==========
interface PromptPatch {
  rule: string;                         // New/modified rule
  action: "add_rule" | "modify_rule" | "add_example";
  target_section: string;               // Which section of the prompt
  current_behavior: string;             // Current behavior description
}

// ========== METADATA ==========
// eval_metadata content is entirely freeform.
// The UI looks for these optional fields:
//   - brand_name: string      -> displayed in list view
//   - target_prompt: string   -> used as keyword
//   - query: string           -> used as keyword if target_prompt absent
//   - primary_keyword: string -> fallback keyword
```

### Critical Notes

1. **`weighted_total`** is NOT calculated by the UI. The eval pipeline applies a formula like `sum(weighted_score) / sum(weight) * 10` and writes it to the JSON.

2. **`weighted_score`** is NOT calculated by the UI. The pipeline computes `score * weight`.

3. **`grade`** is both written by the pipeline into JSON AND derived in the UI via `gradeFromScore()` from `weighted_total`. The UI may use its own computed grade.

4. **`criteria_scores` array size** is entirely freeform. It can have 3 criteria or 30. The UI iterates over all of them.

5. **`weight` values** are freeform per criterion. Each criterion can have a different weight.

---

## 6. Agent Registry System

The agent registry is the foundation of the dashboard's dynamic architecture. To add a new agent or system, you only need to insert a row into this table.

### How It Works

```
                    agent_registry table
                           |
                           v
              +-------------------------+
              |    useAgentRegistry()   |
              |  SELECT * WHERE active  |
              |  GROUP BY system_group  |
              +-----------+-------------+
                          |
              +-----------+-----------+
              v           v           v
         System A      System B     System C
         +-----+      +-----+      +-----+
         |Agt 1|      |Agt 3|      |Agt 5|
         |Agt 2|      |Agt 4|      |Agt 6|
         +-----+      +-----+      +-----+
              |            |            |
              v            v            v
        Sidebar        Sidebar      Sidebar
        nav item       nav item     nav item
```

### Grouping Logic

Agents are grouped by `system_group` field. The `groupAgentsBySystem()` function:

```typescript
// src/lib/normalizers.ts
function groupAgentsBySystem(agents: AgentRegistryEntry[]): SystemGroup[] {
  const groups = new Map<string, SystemGroup>();
  for (const agent of agents) {
    const existing = groups.get(agent.system_group);
    if (existing) {
      existing.agents.push(agent);
    } else {
      groups.set(agent.system_group, {
        group_key: agent.system_group,
        display_name: agent.system_display_name,
        agents: [agent],
      });
    }
  }
  return Array.from(groups.values());
}
```

### Primary Agent Concept

Within each system group, a "primary agent" is selected. This agent is used for:
- Fetching the eval ID list
- Sourcing `brand_name` metadata

Selection logic:
```typescript
const briefAgent = groupAgents.find(a => a.table_name.includes("content_brief"));
const primaryAgent = briefAgent ?? groupAgents[0];
```

**Important:** A table name containing `content_brief` is preferred; otherwise the first agent is used. This logic repeats in `useEvals.ts`, `useBrandScoreHistory.ts`, `useSuggestionFrequency.ts`, and `useNewEvalNotifications.ts`.

---

## 7. Data Flow: DB to UI

### Overall Flow Diagram

```
  Supabase PostgreSQL
        |
        +--- agent_registry ------------------- useAgentRegistry()
        |         |                                   |
        |    agents[], systemGroups[]                  |
        |         |                                   |
        +--- [agent_table_1] --+                      |
        +--- [agent_table_2] --+-- useEvals() ------ EvalListPage
        +--- [agent_table_3] --+       |
        |                              |
        |                        useEvalDetail() ---- EvalDetailPage
        |                              |
        +--- daily_scores ------------ DailyScoreChart (inside dashboard)
        |
        +--- suggestion_applications - CartPage (read + write)
```

### Detailed Fetch Steps

#### 1. Eval List Loading (`useEvals`)

```
1. Filter agents[] -> agents belonging to systemGroup
2. Find primary agent (content_brief preferred)
3. Fetch ALL rows from primary table (SELECT *, ORDER BY created_at DESC)
4. For each row:
   a. Fetch eval_report JSON from all agent tables (Promise.all)
   b. Extract grade and weighted_total per agent
   c. Calculate overall_avg (mean of weighted_totals)
   d. Extract brand_name and keyword from metadata
5. Return EvalListItem[]
```

#### 2. Eval Detail Loading (`fetchEvalRun` via `useEvalDetail`)

```
1. Query all agent tables in PARALLEL (Promise.all)
2. For each agent:
   a. Read eval_report JSON, input, output columns
   b. Build AgentEvalData object
3. Filter out null results
4. overall_avg = mean(weighted_totals)
5. Extract brand_name and keyword from metadata
6. Return NormalizedEvalRun object
```

#### 3. Metadata Extraction Priority

```typescript
// brand_name:
eval_metadata.brand_name ?? table.brand_name ?? null

// keyword (priority order):
eval_metadata.target_prompt
  ?? eval_metadata.query
  ?? eval_metadata.primary_keyword
  ?? null
```

---

## 8. Frontend Architecture

### Entry Point

```typescript
// src/main.tsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);

// src/App.tsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="/evals/:systemGroup" element={<EvalListPage />} />
        <Route path="/evals/:systemGroup/:evalId" element={<EvalDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/compare/:systemGroup" element={<ComparisonPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
</QueryClientProvider>
```

### QueryClient Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### Component Tree

```
AppShell
+-- Sidebar
|   +-- Logo ("EvalStudio")
|   +-- NavItem: Dashboard (/)
|   +-- NavItem[]: System Groups (/evals/:group) + badge
|   +-- NavItem: Cart (/cart) + badge
|
+-- <Outlet>
    +-- DashboardPage
    |   +-- StatsCards -> SystemCard[] (one per system group)
    |   |   +-- Recharts mini LineChart
    |   |   +-- Agent score list
    |   +-- RecentEvals -> last 5 evals/group
    |
    +-- EvalListPage
    |   +-- InlineHeatmap (expandable criteria heatmap)
    |   +-- DailyScoreChart (multi-agent line chart)
    |   +-- CommonSuggestions (most frequent suggestions)
    |   +-- FilterBar (search + sort + count)
    |   +-- EvalGrid -> EvalCard[]
    |       +-- Agent score grid
    |       +-- Sparkline (trend)
    |       +-- GradeBadge
    |
    +-- EvalDetailPage (3-panel)
    |   +-- Header: breadcrumb, title, grade badges, export
    |   +-- AgentTabs
    |   +-- Left Panel: JsonTreeViewer (input)
    |   +-- Center Panel:
    |   |   +-- Score summary (ScoreBar)
    |   |   +-- Strengths/weaknesses
    |   |   +-- CriteriaCard[]
    |   |       +-- Score, weight, justification
    |   |       +-- Evidence (positive/negative)
    |   |       +-- Input/Output mapping
    |   |       +-- DiffView (prompt patch preview)
    |   |       +-- "Add to Cart" button
    |   +-- Right Panel: JsonTreeViewer (output)
    |
    +-- CartPage
    |   +-- CartItem[] (suggestion cards)
    |       +-- "Apply & Export" -> TXT download + DB insert
    |
    +-- ComparisonPage (2 panels)
        +-- Agent selector dropdown
        +-- Swap button
        +-- ComparisonPanel[] (x2)
            +-- Score summary
            +-- Criteria comparison + delta
            +-- Synchronized scroll
```

---

## 9. Page Structures & Routing

### Route Table

| Route | Page | URL Params | Query Params |
|-------|------|------------|--------------|
| `/` | DashboardPage | - | - |
| `/evals/:systemGroup` | EvalListPage | systemGroup | - |
| `/evals/:systemGroup/:evalId` | EvalDetailPage | systemGroup, evalId | - |
| `/cart` | CartPage | - | - |
| `/compare/:systemGroup` | ComparisonPage | systemGroup | left, right (eval IDs) |

### DashboardPage
- **File:** `src/pages/DashboardPage.tsx`
- **Responsibility:** Overview of all systems
- **Components Used:** StatsCards, RecentEvals
- **Data:** Score summary and recent evals per system group
- **Stateless:** No own state, delegates to child components

### EvalListPage
- **File:** `src/pages/EvalListPage.tsx`
- **Responsibility:** Eval list for a system group
- **Hooks:** useAgentRegistry, useEvals, useBrandScoreHistory, useNotificationStore, useKeyboardShortcuts
- **Local State:**
  - `search`: string — brand/keyword filtering
  - `sort`: SortOption — sorting (date_desc/date_asc/score_desc/score_asc/name_asc/name_desc)
  - `focusedIndex`: number — keyboard navigation
  - `selectedIds`: Set<string> — comparison selection (max 2)
- **Features:**
  - Search filtering
  - 6 sort options
  - Keyboard navigation (j/k/Enter)
  - Select 2 evals to launch comparison
  - InlineHeatmap, DailyScoreChart, CommonSuggestions widgets

### EvalDetailPage
- **File:** `src/pages/EvalDetailPage.tsx`
- **Responsibility:** 3-panel detail view for a single eval
- **Hooks:** useAgentRegistry, useEvalDetail, useSuggestionFrequency, useKeyboardShortcuts
- **Local State:**
  - `activeAgentKey`: string|null — active agent tab
  - `leftOpen/rightOpen`: boolean — panel visibility
  - `inputHighlight/outputHighlight`: string|undefined — JSON tree highlighting
  - `sortByWeight`: boolean — sort criteria by weight
  - `showWeightBar`: boolean — weight visualization toggle
- **Features:**
  - Left panel: Input JSON tree (expandable, highlightable)
  - Right panel: Output JSON tree
  - Center panel: Score summary + criteria cards
  - Agent tab switching (Tab key)
  - CriteriaCard "Add to Cart" functionality
  - Input/Output element buttons -> JSON tree highlighting
  - PDF export

### CartPage
- **File:** `src/pages/CartPage.tsx`
- **Responsibility:** Collected suggestions management and export
- **Store:** useCartStore
- **Features:**
  - Suggestions grouped by agent
  - "Apply & Export" -> downloads TXT file + inserts to DB
  - "Clear All" -> empties cart
  - Individual item deletion
  - Success screen after application

### ComparisonPage
- **File:** `src/pages/ComparisonPage.tsx`
- **Responsibility:** Side-by-side eval comparison
- **Query Params:** `?left={evalId}&right={evalId}`
- **Features:**
  - Synchronized scrolling (both panels scroll together)
  - Agent selector dropdown
  - Swap button (swaps left/right)
  - Score deltas (+/- display)

---

## 10. Hook System

All data hooks are built on React Query.

### useAgentRegistry

```typescript
// File: src/hooks/useAgentRegistry.ts
// Query Key: ["agent-registry"]
// Stale Time: 5 minutes
// Returns: { agents: AgentRegistryEntry[], systemGroups: SystemGroup[], isLoading, error }

// Logic:
// 1. Fetch from agent_registry table where is_active=true
// 2. Sort by sort_order
// 3. Group via groupAgentsBySystem()
```

### useEvals

```typescript
// File: src/hooks/useEvals.ts
// Query Key: ["evals", systemGroup]
// Stale Time: default (immediately stale)
// Returns: UseQueryResult<EvalListItem[]>
// Enabled: agents.length > 0

// Logic:
// 1. Filter agents by systemGroup
// 2. Find primary agent
// 3. Fetch all rows from primary table
// 4. For each row, fetch eval_report from all agent tables (parallel)
// 5. Build EvalListItem (id, brand_name, keyword, agents[], overall_avg)
```

### useEvalDetail

```typescript
// File: src/hooks/useEvalDetail.ts
// Query Key: ["eval-detail", evalId, systemGroup]
// Enabled: !!evalId && agents.length > 0

// Logic: Calls fetchEvalRun(evalId, filteredAgents)
```

### useBrandScoreHistory

```typescript
// File: src/hooks/useBrandScoreHistory.ts
// Query Key: ["brand-score-history", systemGroup]
// Stale Time: 5 minutes
// Returns: Map<brandName, number[]>

// Logic:
// 1. Find primary agent
// 2. Fetch all rows ordered by date
// 3. Group by brand_name
// 4. Keep last N scores per brand
```

### useCriteriaHeatmapData

```typescript
// File: src/hooks/useCriteriaHeatmapData.ts
// Query Key: ["criteria-heatmap", agent.agent_key]
// Stale Time: 5 minutes
// Returns: HeatmapRow[] (date + criterion scores)

// Logic:
// 1. Fetch all evals from agent table ordered by date
// 2. Group by date
// 3. Calculate daily average per criterion
```

### useSuggestionFrequency

```typescript
// File: src/hooks/useSuggestionFrequency.ts
// Query Key: ["suggestion-frequency", systemGroup]
// Stale Time: 5 minutes
// Returns: { frequencyMap, topSuggestions (top 5), totalEvals }

// Logic:
// 1. Fetch all eval reports from all agent tables
// 2. Extract improvement_suggestions arrays
// 3. Group by affected_criterion
// 4. Count unique evals per criterion
// 5. Sort by frequency, return top 5
```

### useNewEvalNotifications

```typescript
// File: src/hooks/useNewEvalNotifications.ts
// Query Key: ["new-eval-notifications", ...]
// Refetch Interval: 30 seconds
// Side Effect: Updates notificationStore.setNewCount()

// Logic:
// 1. Find primary agent per system group
// 2. COUNT evals added after lastSeen[systemGroup]
// 3. Update notificationStore
```

### useKeyboardShortcuts

```typescript
// File: src/hooks/useKeyboardShortcuts.ts
// Parameter: Shortcut[] array
// Side Effect: document keydown listener

// Logic:
// 1. Listen to keydown
// 2. Skip if target is INPUT/TEXTAREA/SELECT/contentEditable
// 3. If key + when() match, call handler()
```

---

## 11. State Management

### Server State: React Query

All database data is managed via React Query:

| Query Key | Stale Time | Refetch | Source |
|-----------|------------|---------|--------|
| `["agent-registry"]` | 5 min | - | `agent_registry` table |
| `["evals", systemGroup]` | 0 (immediate) | - | Agent tables |
| `["eval-detail", evalId, systemGroup]` | 0 | - | Agent tables |
| `["brand-score-history", systemGroup]` | 5 min | - | Primary agent table |
| `["criteria-heatmap", agentKey]` | 5 min | - | Agent table |
| `["suggestion-frequency", systemGroup]` | 5 min | - | Agent tables |
| `["new-eval-notifications", ...]` | - | 30s | Agent tables (COUNT) |

### Client State: Zustand

#### cartStore (`src/stores/cartStore.ts`)

```typescript
interface CartState {
  items: CartItem[];                    // Suggestions in cart
  appliedHashes: Set<string>;           // Hashes of applied suggestions

  addItem(evalId, agentKey, agentDisplayName, suggestion): void;
  removeItem(hash): void;
  clearCart(): void;
  isInCart(hash): boolean;
  isApplied(hash): boolean;
  markApplied(hashes[]): void;
  loadAppliedFromDb(hashes[]): void;
}
```

- **Persist:** localStorage, key: `"eval-cart"`
- **Set<string> serialization:** Converted to array for persistence, restored as Set on hydration
- **Dedup:** Hash generated via `generateSuggestionHash(evalId, criterion, rule)`

#### notificationStore (`src/stores/notificationStore.ts`)

```typescript
interface NotificationState {
  lastSeen: Record<string, string>;     // systemGroup -> ISO timestamp
  newCounts: Record<string, number>;    // systemGroup -> new eval count

  markSeen(systemGroup): void;          // Update lastSeen, zero count
  setNewCount(systemGroup, count): void;
}
```

- **Persist:** localStorage, key: `"eval-notifications"`
- **Polling:** useNewEvalNotifications updates every 30 seconds

---

## 12. Component Catalog

### Layout

| Component | File | Responsibility |
|-----------|------|----------------|
| AppShell | `layout/AppShell.tsx` | Root layout, Sidebar + Outlet + Help modal |
| Sidebar | `layout/Sidebar.tsx` | Navigation, dynamic system group links, badges |

**Sidebar Detail:**
- Logo and brand name ("EvalStudio")
- Dashboard link (static)
- System group links (dynamic from agent_registry)
- Notification badge per link (new eval count)
- Cart link + item count badge
- `DynamicIcon` component: maps agent.icon to lucide-react icon

### Dashboard

| Component | File | Props | Responsibility |
|-----------|------|-------|----------------|
| StatsCards | `dashboard/StatsCards.tsx` | - | Score card + mini chart per system |
| RecentEvals | `dashboard/RecentEvals.tsx` | - | Last 5 evals per system |
| DailyScoreChart | `dashboard/DailyScoreChart.tsx` | activeSystem? | Daily score trend chart (Recharts) |
| GradeDistributionChart | `dashboard/GradeDistributionChart.tsx` | activeSystem? | Grade distribution pie chart |
| CommonSuggestions | `dashboard/CommonSuggestions.tsx` | systemGroup | Most frequent suggestions (top 5) |

### Eval List

| Component | File | Props | Responsibility |
|-----------|------|-------|----------------|
| FilterBar | `eval-list/FilterBar.tsx` | search, sort, counts | Search + sort + count display |
| EvalGrid | `eval-list/EvalGrid.tsx` | evals, focusedIndex, ... | Responsive eval card grid |
| EvalCard | `eval-list/EvalCard.tsx` | eval, isFocused, scoreHistory | Single eval card (sparkline, grades) |
| InlineHeatmap | `eval-list/InlineHeatmap.tsx` | systemGroup, agents | Expandable criteria heatmap table |

### Eval Detail

| Component | File | Props | Responsibility |
|-----------|------|-------|----------------|
| AgentTabs | `eval-detail/AgentTabs.tsx` | agents, activeKey, onSelect | Agent tab bar |
| CriteriaCard | `eval-detail/CriteriaCard.tsx` | criteria, suggestion, ... | Criteria detail card (most complex component) |
| JsonTreeViewer | `eval-detail/JsonTreeViewer.tsx` | data, highlightPath, colorAccent | Interactive JSON tree |

**CriteriaCard Detail (most complex component):**
- Expandable: title, score, weight -> click to reveal details
- Justification text
- Input/Output element buttons -> triggers highlighting in JSON viewer
- Fidelity badge
- Evidence grid (positive/negative)
- Suggestion box (if available):
  - Priority badge
  - Frequency indicator
  - DiffView (prompt patch preview)
  - "Add to Cart" / "Applied" / "In Cart" status buttons

### Shared (Reusable)

| Component | File | Props | Responsibility |
|-----------|------|-------|----------------|
| GradeBadge | `shared/GradeBadge.tsx` | grade, size | Colored letter grade badge |
| ScoreBar | `shared/ScoreBar.tsx` | score, maxScore, animated | Horizontal progress bar |
| Sparkline | `shared/Sparkline.tsx` | data, width, height | SVG mini trend line |
| DiffView | `shared/DiffView.tsx` | oldText, newText | Side-by-side diff view |
| ExportMenu | `shared/ExportMenu.tsx` | options[] | Export dropdown menu |
| EmptyState | `shared/EmptyState.tsx` | title, description, icon | Empty state placeholder |
| ShortcutHelpModal | `shared/ShortcutHelpModal.tsx` | open, onClose | Keyboard shortcut help |

### Cart

| Component | File | Props | Responsibility |
|-----------|------|-------|----------------|
| CartItem | `cart/CartItem.tsx` | item | Suggestion card (priority, rule, diff) |

---

## 13. Style & Theme System

### CSS Variables (`src/index.css`)

**Background Layers (dark theme, purple-tinted):**
```css
--color-bg-page:       #0a0a0f    /* Darkest - page background */
--color-bg-sidebar:    #0f0f18    /* Sidebar */
--color-bg-card:       #12121e    /* Card background */
--color-bg-card-hover: #1a1a2e    /* Card hover */
--color-bg-elevated:   #1e1e30    /* Elevated surfaces */
```

**Text Hierarchy (4 levels):**
```css
--color-text-primary:   #f0f0f5   /* Primary text */
--color-text-secondary: #a0a0b8   /* Secondary text */
--color-text-tertiary:  #6b6b80   /* Tertiary text */
--color-text-muted:     #45455a   /* Muted text */
```

**Border Colors:**
```css
--color-border-subtle:  rgba(255, 255, 255, 0.06)
--color-border-default: rgba(255, 255, 255, 0.10)
--color-border-strong:  rgba(255, 255, 255, 0.15)
```

**Grade Colors:**
```css
--color-grade-a: #22c55e  /* Green  - A+, A, A- */
--color-grade-b: #3b82f6  /* Blue   - B+, B, B- */
--color-grade-c: #eab308  /* Yellow - C+, C, C- */
--color-grade-d: #ef4444  /* Red    - D+, D, D-, F */
```

**Agent Colors:**
```css
--color-agent-serp:     #3b82f6  /* SERP Agent - blue */
--color-agent-citation: #22c55e  /* Citation Agent - green */
--color-agent-brief:    #f59e0b  /* Content Brief - orange */
--color-agent-faq-gen:  #8b5cf6  /* FAQ Generation - purple */
--color-agent-faq-qual: #ec4899  /* FAQ Quality - pink */
```

**Accent Colors:**
```css
--color-accent-primary: #6366f1   /* Indigo - main accent */
--color-accent-success: #10b981   /* Teal */
--color-accent-warning: #f59e0b   /* Amber */
--color-accent-danger:  #ef4444   /* Red */
```

### Animations

```css
.hover-lift          /* Card hover effect: translateY(-1px) + shadow */
.animate-fade-in-up  /* Enter animation: opacity 0->1, Y 12px->0 */
.animate-progress-fill /* Progress bar fill animation */
.stagger-children    /* Staggered child element reveals (50ms intervals) */
```

### Fonts

```css
--font-sans: "Plus Jakarta Sans", system-ui, sans-serif
--font-mono: "JetBrains Mono", "SF Mono", "Fira Code", monospace
```

---

## 14. Constants & Configuration

### Grade Thresholds (Hard-coded)

```typescript
// src/lib/utils.ts -> gradeFromScore()
score >= 95 -> "A+"    score >= 90 -> "A"     score >= 87 -> "A-"
score >= 83 -> "B+"    score >= 80 -> "B"     score >= 77 -> "B-"
score >= 73 -> "C+"    score >= 70 -> "C"     score >= 67 -> "C-"
score >= 63 -> "D+"    score >= 60 -> "D"     score >= 57 -> "D-"
score < 57  -> "F"
```

### Score Color Thresholds (Hard-coded)

```typescript
// src/lib/constants.ts

// Overall score (0-100 scale):
getScoreColor(score):
  score >= 80 -> grade-a (green)
  score >= 60 -> grade-b (blue)
  score >= 40 -> grade-c (yellow)
  else        -> grade-d (red)

// Criterion score (0-10 scale):
getCriterionScoreColor(score):
  score >= 8 -> grade-a
  score >= 6 -> grade-b
  score >= 4 -> grade-c
  else       -> grade-d
```

### Fidelity Configuration (Hard-coded)

```typescript
// src/lib/constants.ts
FIDELITY_CONFIG:
  "perfect"     -> grade-a (green)
  "high"        -> grade-a (green)
  "medium-high" -> grade-b (blue)
  "medium"      -> grade-c (yellow)
  "low"         -> grade-d (red)
  "poor"        -> grade-d (red)
```

### Agent Color Map (Hard-coded)

```typescript
// src/lib/constants.ts
AGENT_COLORS:
  new_serp_agent     -> var(--color-agent-serp)
  new_citation_agent -> var(--color-agent-citation)
  new_content_brief  -> var(--color-agent-brief)
  faq_generation     -> var(--color-agent-faq-gen)
  faq_quality        -> var(--color-agent-faq-qual)
```

**Note:** This hard-coded map is only used as a fallback. The agent's color normally comes from the `agent_registry.color` field.

---

## 15. Export System

### CSV Export (`src/lib/exporters.ts`)

```
Output Format: eval_id, brand_name, keyword, date, [agent_score, agent_grade]..., overall_avg
Filename:      eval-scores-{systemGroup}-{YYYY-MM-DD}.csv
```

- Agent keys sorted alphabetically
- `_score` and `_grade` columns per agent
- CSV escape: wraps values containing comma, quotes, or newlines

### PDF Export (`src/lib/exporters.ts`)

- DOM element capture via html2canvas
- Dark background (#0a0a0f)
- A4 page pagination
- PDF generation via jsPDF
- Lazy import (bundle size optimization)

### TXT Export (`src/lib/utils.ts`)

- Used in Cart "Apply & Export" action
- Suggestions grouped by agent
- Each suggestion: priority, target_section, affected_criterion, expected_impact, action, rule, current_behavior

---

## 16. Hard-Coded vs Dynamic Elements — Full List

### Fully Dynamic (Driven by Database)

| Element | Source | Description |
|---------|--------|-------------|
| Agent definitions | `agent_registry` table | Add agents with just a table + registry row |
| System groups | `agent_registry.system_group` | Agents auto-grouped |
| Sidebar navigation | `useAgentRegistry()` | Dynamically built from registry |
| Criteria names | `eval_report.criteria_scores[].criterion` | Each agent can use different criteria |
| Criteria count | `eval_report.criteria_scores.length` | Can be 3 or 30 |
| Weight values | `eval_report.criteria_scores[].weight` | Each criterion can have a different weight |
| weighted_score | `eval_report.criteria_scores[].weighted_score` | Calculated by pipeline |
| weighted_total | `eval_report.overall.weighted_total` | Calculated by pipeline |
| Grade (in JSON) | `eval_report.overall.grade` | Set by pipeline |
| Improvement suggestions | `eval_report.overall.improvement_suggestions` | Generated by pipeline |
| Evidence lists | `criteria_scores[].positive/negative_evidence` | Generated by pipeline |
| Input/Output structure | JSON columns in agent tables | Entirely freeform JSON |
| Metadata | `eval_report.eval_metadata` | Freeform key-value |

### Hard-Coded (Requires Code Changes)

| Element | File | Description |
|---------|------|-------------|
| Grade thresholds | `src/lib/utils.ts:gradeFromScore()` | 95->A+, 90->A, 87->A-... |
| Score color thresholds | `src/lib/constants.ts:getScoreColor()` | 80->green, 60->blue, 40->yellow |
| Criterion score colors | `src/lib/constants.ts:getCriterionScoreColor()` | 8->green, 6->blue, 4->yellow |
| Fidelity colors | `src/lib/constants.ts:FIDELITY_CONFIG` | perfect->green, medium->yellow |
| Agent color map | `src/lib/constants.ts:AGENT_COLORS` | Only existing 5 agents |
| CSS theme colors | `src/index.css` | Dark theme backgrounds, text, borders |
| EvalReport JSON shape | `src/lib/types.ts` | TypeScript interface contract |
| Primary agent selection | `normalizers.ts`, hooks | `content_brief` table name preferred |
| Metadata extraction order | `normalizers.ts:fetchEvalRun()` | target_prompt -> query -> primary_keyword |
| Notification polling | `useNewEvalNotifications.ts` | 30 second intervals |
| Route structure | `src/App.tsx` | 5 fixed routes |
| Keyboard shortcuts | Page components | j/k/Enter/Tab/? |
| PDF background color | `src/lib/exporters.ts` | #0a0a0f |

---

## 17. Guide: Adding a New Eval System

### Scenario: A new eval system called "Code Review"

#### Step 1: Create Supabase Tables

```sql
-- Agent 1: Code quality agent
CREATE TABLE code_quality_evals (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  project_name text,
  eval_report jsonb NOT NULL,
  code_input jsonb,
  code_output jsonb
);

-- Agent 2: Security audit agent
CREATE TABLE security_audit_evals (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  eval_report jsonb NOT NULL,
  audit_input jsonb,
  audit_findings jsonb
);

-- RLS policies
ALTER TABLE code_quality_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_evals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read" ON code_quality_evals FOR SELECT USING (true);
CREATE POLICY "Anon read" ON security_audit_evals FOR SELECT USING (true);
```

#### Step 2: Insert Into Agent Registry

```sql
INSERT INTO agent_registry (
  agent_key, display_name, color, icon,
  system_group, system_display_name,
  table_name, eval_report_column, input_column, output_column,
  sort_order, is_active
) VALUES
(
  'code_quality', 'Code Quality', '#3b82f6', 'code',
  'code_review_system', 'Code Review',
  'code_quality_evals', 'eval_report', 'code_input', 'code_output',
  1, true
),
(
  'security_audit', 'Security Audit', '#ef4444', 'shield',
  'code_review_system', 'Code Review',
  'security_audit_evals', 'eval_report', 'audit_input', 'audit_findings',
  2, true
);
```

#### Step 3: Add CSS Variables (Optional but Recommended)

In `src/index.css`:
```css
--color-agent-code-quality: #3b82f6;
--color-agent-security-audit: #ef4444;
```

In `src/lib/constants.ts` `AGENT_COLORS`:
```typescript
code_quality: "var(--color-agent-code-quality)",
security_audit: "var(--color-agent-security-audit)",
```

**Note:** This step is optional since the agent's color is already defined in `agent_registry.color`. The `AGENT_COLORS` map is only a fallback.

#### Step 4: Produce Pipeline Output

The pipeline must write `EvalReport` JSON to both tables with the same `id`:

```json
{
  "overall": {
    "grade": "B+",
    "grade_label": "Good",
    "weighted_total": 84.2,
    "top_strengths": ["Clean variable naming", "Good error handling"],
    "top_weaknesses": ["Missing unit tests", "No input validation"],
    "improvement_suggestions": [
      {
        "priority": "high",
        "suggestion": "Add input validation for user-facing functions",
        "affected_criterion": "input_validation",
        "expected_score_impact": "+1.0 to +1.5",
        "prompt_patch": {
          "rule": "Always validate function parameters before processing",
          "action": "add_rule",
          "target_section": "Code Quality Rules",
          "current_behavior": "Functions accept any input without validation"
        }
      }
    ]
  },
  "eval_metadata": {
    "project_name": "payment-service",
    "language": "TypeScript",
    "primary_keyword": "payment processing"
  },
  "criteria_scores": [
    {
      "criterion": "code_readability",
      "label": "Code Readability",
      "score": 8.5,
      "weight": 5,
      "weighted_score": 42.5,
      "justification": "Clear naming conventions and consistent formatting",
      "reference_module": "readability_checker",
      "positive_evidence": ["Descriptive variable names", "Consistent indentation"],
      "negative_evidence": ["Some functions exceed 50 lines"],
      "input_output_mapping": {
        "fidelity": "high",
        "input_element": "source_code.main_module",
        "output_element": "analysis.readability_report"
      }
    }
  ]
}
```

#### Step 5: No Code Changes Required

The frontend will automatically:
1. `useAgentRegistry()` discovers the new agents
2. "Code Review" link appears in the sidebar
3. `/evals/code_review_system` route works
4. Eval detail page shows 2 agent tabs
5. All criteria cards, suggestions, heatmap, etc. work

#### When Code Changes ARE Required

| Scenario | What to Change |
|----------|----------------|
| Want to use `project_name` instead of `brand_name` | Metadata extraction logic in `normalizers.ts` and `useEvals.ts` |
| Want different primary agent priority (not `content_brief`) | Primary agent logic in `normalizers.ts`, `useEvals.ts`, other hooks |
| Need different grade thresholds (e.g., 0-5 scale) | `utils.ts:gradeFromScore()` |
| Want to display a new metadata field | Relevant page components |
| Using different fidelity labels | `constants.ts:FIDELITY_CONFIG` |
| Writing to daily_scores table | Ensure external job uses matching agent_keys |

---

## 18. Known Limitations

### Performance

1. **N+1 query problem:** `useEvals` makes a separate query to each agent table for every eval row. 100 evals * 5 agents = 500 queries. Slows down with large datasets.

2. **No pagination:** `useEvals` fetches all rows at once with `SELECT *`. No server-side pagination.

3. **Heatmap full table scan:** `useCriteriaHeatmapData` scans the entire eval table and aggregates in JS.

4. **Suggestion frequency full scan:** Scans all suggestions across all evals.

### Architecture

5. **Hard-coded primary agent logic:** Searches for `content_brief` in the table name. Meaningless for non-content-brief systems.

6. **brand_name dependency:** The list page and some hooks depend on the `brand_name` field. Not every eval system has this field.

7. **Metadata field names:** `target_prompt`, `query`, `primary_keyword` are content-brief-specific names.

8. **Agent color map:** The `AGENT_COLORS` constant only lists the existing 5 agents. New agents are not in the map (fallback comes from registry).

9. **No tests:** No unit test or integration test files exist.

10. **No migrations:** Database schemas are not defined in the code repository. Schema changes are manual.

11. **Type safety:** Supabase queries use `as unknown as Record<string, unknown>` type assertions. `supabase-gen-types` is not used.

### UX

12. **Dark theme only:** No light mode support.

13. **Limited responsiveness:** Not optimized for mobile devices (especially the 3-panel detail page).

14. **Minimal error handling:** Loading and error states are basic. Network errors retry once.

---

## 19. Development Recommendations

### Priority 1: Performance Improvements

#### 1.1 Add Pagination
**Problem:** `useEvals` fetches all evals at once.
**Recommendation:** Server-side pagination with 20-50 evals per page. Use Supabase `.range(from, to)`. Integrate with infinite scroll or page numbers in the UI.

#### 1.2 N+1 Query Optimization
**Problem:** Separate query per agent table per eval.
**Recommendation:** Use Supabase `rpc()` with a single PostgreSQL function that joins all agent data. Or fetch only primary agent data for the list, loading full agent data only on the detail page.

#### 1.3 Leverage daily_scores Table
**Problem:** Heatmap and suggestion frequency scan all raw data.
**Recommendation:** Create pre-aggregate tables (e.g., `criteria_daily_scores`, `suggestion_frequency_cache`). Update periodically via a backend job.

### Priority 2: Generalization (Multi-System Compatibility)

#### 2.1 Generalize Primary Agent Logic
**Problem:** Searching for `content_brief` in the table name doesn't apply to every system.
**Recommendation:** Add an `is_primary` boolean column to `agent_registry`. Mark one agent as primary per system group. Keep the current `content_brief` search as fallback.

```sql
ALTER TABLE agent_registry ADD COLUMN is_primary boolean DEFAULT false;
```

#### 2.2 Metadata Field Configuration
**Problem:** `brand_name`, `target_prompt`, etc. are hard-coded field names.
**Recommendation:** Add metadata configuration to `agent_registry`:

```sql
ALTER TABLE agent_registry ADD COLUMN metadata_config jsonb DEFAULT '{}';
-- Example: {"title_field": "project_name", "subtitle_field": "language"}
```

The UI reads this config and displays the appropriate metadata fields.

#### 2.3 Remove Agent Color Map
**Problem:** `AGENT_COLORS` constant only defines 5 agents.
**Recommendation:** Remove this map entirely. Every agent's color is already defined in `agent_registry.color`. Update all references to use the registry color.

### Priority 3: Developer Experience

#### 3.1 Supabase Type Generation
**Recommendation:** Use `supabase gen types typescript` to auto-generate database types. Eliminate `as unknown as Record<string, unknown>` type assertions.

#### 3.2 Test Infrastructure
**Recommendation:**
- Set up Vitest + Testing Library
- Unit tests for hooks (mock Supabase client)
- Component render tests
- Pure function tests for normalizer functions

#### 3.3 Migration Files
**Recommendation:** Create a `supabase/migrations/` directory. Record all table creation, RLS policies, and seed data as migrations. Apply schemas via `supabase db push` when setting up new environments.

#### 3.4 Storybook / Component Playground
**Recommendation:** Set up Storybook for shared components (GradeBadge, ScoreBar, Sparkline, etc.). Enables quick preview of how UI components will look when adding new eval systems.

### Priority 4: Feature Extensions

#### 4.1 Real-Time Updates
**Recommendation:** Use Supabase Realtime for automatic updates when new evals are added. Replace the current 30-second polling with a subscription model.

```typescript
supabase.channel('new-evals')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: primaryAgent.table_name },
    (payload) => queryClient.invalidateQueries(["evals", systemGroup])
  )
  .subscribe();
```

#### 4.2 Expanded Filtering & Search
**Recommendation:**
- Date range filtering
- Grade filtering (show only A's, show only F's)
- Per-agent filtering
- Per-criterion filtering (evals with low scores on a specific criterion)

#### 4.3 Dashboard Customization
**Recommendation:** Let users customize the order and visibility of dashboard widgets. Save preferences in localStorage or the database.

#### 4.4 Light Mode
**Recommendation:** CSS variables are already layered. Dark theme is defined under `:root`. Add separate values under a `.light` class for light mode support.

#### 4.5 Webhook / API Integration
**Recommendation:** Instead of only downloading a TXT file in "Apply & Export", send feedback to the pipeline via webhook. Enable automatic application of prompt patches.

### Priority 5: Data Integrity

#### 5.1 Eval ID Consistency Check
**Recommendation:** Add a mechanism to verify that an eval ID exists across all agent tables. Show a UI warning for missing agent data.

#### 5.2 Schema Validation
**Recommendation:** Add a Supabase check constraint or edge function that validates the `eval_report` JSON structure. Prevent malformed JSON from being written to the DB.

```sql
-- Example check constraint
ALTER TABLE code_quality_evals
ADD CONSTRAINT valid_eval_report CHECK (
  eval_report ? 'overall' AND
  eval_report ? 'criteria_scores' AND
  (eval_report->'overall') ? 'weighted_total' AND
  (eval_report->'overall') ? 'grade'
);
```

---

## Appendix: Quick Reference Cards

### TypeScript Interface Map

```
AgentRegistryEntry --- agent_registry table
         |
         +--- SystemGroup (grouped by system_group)
         |
         +--- table_name --> Agent eval table
                                 |
                                 +--- EvalReport (jsonb column)
                                 |    +--- EvalOverall
                                 |    |    +--- grade, weighted_total
                                 |    |    +--- top_strengths[], top_weaknesses[]
                                 |    |    +--- ImprovementSuggestion[]
                                 |    |         +--- PromptPatch
                                 |    +--- CriteriaScore[]
                                 |    |    +--- InputOutputMapping
                                 |    +--- eval_metadata (freeform)
                                 |
                                 +--- Normalize --> AgentEvalData
                                                    |
                                                    +--- NormalizedEvalRun
                                                         (all agents combined)
```

### Query Key -> Hook -> Page Map

```
["agent-registry"]                    -> useAgentRegistry    -> ALL PAGES
["evals", systemGroup]                -> useEvals            -> EvalListPage
["eval-detail", evalId, systemGroup]  -> useEvalDetail       -> EvalDetailPage, ComparisonPage
["brand-score-history", systemGroup]  -> useBrandScoreHistory-> EvalListPage (sparkline)
["criteria-heatmap", agentKey]        -> useCriteriaHeatmapData -> EvalListPage (heatmap)
["suggestion-frequency", systemGroup] -> useSuggestionFrequency -> EvalListPage, EvalDetailPage
["new-eval-notifications", ...]       -> useNewEvalNotifications -> AppShell (sidebar badge)
```

---

*This document reflects the state of the project as of 2026-04-07.*
