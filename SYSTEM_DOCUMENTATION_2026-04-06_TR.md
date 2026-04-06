# EvalStudio - Sistem Dokumantasyonu

> Bu dokuman, EvalStudio dashboard projesinin tum mimarisini, veri akisini, bilesenlerin nasil calistigini ve yeni bir eval sistemi eklemek icin gereken adimlari aciklar. Baska bir AI agent'a verildiginde, sistemi tamamen anlayip gelistirme yapabilmesi hedeflenmistir.

---

## Icindekiler

1. [Proje Genel Bakis](#1-proje-genel-bakis)
2. [Teknoloji Yigini](#2-teknoloji-yigini)
3. [Dosya ve Dizin Yapisi](#3-dosya-ve-dizin-yapisi)
4. [Veritabani Mimarisi (Supabase)](#4-veritabani-mimarisi-supabase)
5. [Veri Kontrati: EvalReport JSON Yapisi](#5-veri-kontrati-evalreport-json-yapisi)
6. [Agent Registry Sistemi](#6-agent-registry-sistemi)
7. [Veri Akisi: DB'den UI'a](#7-veri-akisi-dbden-uia)
8. [Frontend Mimarisi](#8-frontend-mimarisi)
9. [Sayfa Yapilari ve Routing](#9-sayfa-yapilari-ve-routing)
10. [Hook Sistemi](#10-hook-sistemi)
11. [State Management](#11-state-management)
12. [Component Katalogu](#12-component-katalogu)
13. [Stil ve Tema Sistemi](#13-stil-ve-tema-sistemi)
14. [Sabit Degerler ve Konfigurasyonlar](#14-sabit-degerler-ve-konfigurasyonlar)
15. [Export Sistemi](#15-export-sistemi)
16. [Hard-Coded vs Dinamik Ogelerin Tam Listesi](#16-hard-coded-vs-dinamik-ogelerin-tam-listesi)
17. [Yeni Bir Eval Sistemi Ekleme Rehberi](#17-yeni-bir-eval-sistemi-ekleme-rehberi)
18. [Bilinen Limitasyonlar](#18-bilinen-limitasyonlar)
19. [Gelistirme Onerileri](#19-gelistirme-onerileri)

---

## 1. Proje Genel Bakis

EvalStudio, LLM-tabanli agent'larin ciktilarini degerlendiren bir monitoring dashboard'dur. Her agent'in urettigi cikti bir eval pipeline tarafindan degerlendirilir ve sonuclar Supabase veritabanina yazilir. Dashboard bu verileri okuyarak:

- Agent bazinda skor takibi
- Kriter bazinda detayli analiz
- Input/Output JSON karsilastirmasi
- Iyilestirme onerisi yonetimi (cart sistemi)
- Zaman bazli trend grafikleri
- Eval karsilastirma (side-by-side)
- CSV/PDF export

saglar.

**Temel Mimari Prensibi:** Dashboard **sadece okur ve gosterir**. Tum skorlar, agirliklar, weighted_total degerleri eval pipeline tarafindan hesaplanip JSON olarak veritabanina yazilir. UI hicbir skor hesaplamasi yapmaz.

---

## 2. Teknoloji Yigini

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
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

## 3. Dosya ve Dizin Yapisi

```
eval_dashboard/
├── index.html                    # HTML entry, font yuklemeleri
├── package.json                  # Bagimliliklar ve script'ler
├── tsconfig.json                 # TypeScript config (strict, @/* alias)
├── vite.config.ts                # Vite + React + Tailwind plugin
├── vercel.json                   # SPA routing rewrites
├── components.json               # shadcn/ui konfigurasyonu
├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── src/
│   ├── main.tsx                  # React DOM render entry
│   ├── App.tsx                   # Router + QueryClient setup
│   ├── index.css                 # Tema, animasyonlar, CSS degiskenleri
│   ├── vite-env.d.ts             # Vite tip tanimlari
│   │
│   ├── lib/                      # Core kutuphaneler
│   │   ├── types.ts              # TUM TypeScript interface'leri (162 satir)
│   │   ├── supabase.ts           # Supabase client olusturma (7 satir)
│   │   ├── normalizers.ts        # Veri fetch ve normalizasyon (141 satir)
│   │   ├── constants.ts          # Grade/fidelity/agent renkleri (57 satir)
│   │   ├── utils.ts              # Helper fonksiyonlar (102 satir)
│   │   └── exporters.ts          # CSV/PDF export mantigi (101 satir)
│   │
│   ├── hooks/                    # React Query hook'lari (8 adet)
│   │   ├── useAgentRegistry.ts   # Agent registry fetch + gruplama
│   │   ├── useEvals.ts           # Eval listesi fetch (system group bazinda)
│   │   ├── useEvalDetail.ts      # Tek eval detay fetch
│   │   ├── useBrandScoreHistory.ts    # Brand bazinda skor gecmisi
│   │   ├── useCriteriaHeatmapData.ts  # Gunluk kriter skorlari (heatmap)
│   │   ├── useSuggestionFrequency.ts  # Oneri frekans analizi
│   │   ├── useNewEvalNotifications.ts # Yeni eval polling (30sn)
│   │   └── useKeyboardShortcuts.ts    # Klavye kisayollari
│   │
│   ├── stores/                   # Zustand client state (2 adet)
│   │   ├── cartStore.ts          # Oneri sepeti (localStorage persist)
│   │   └── notificationStore.ts  # Bildirim durumu (localStorage persist)
│   │
│   ├── pages/                    # Sayfa componentleri (5 adet)
│   │   ├── DashboardPage.tsx     # Ana sayfa - genel bakis
│   │   ├── EvalListPage.tsx      # Eval listesi - arama/siralama/filtre
│   │   ├── EvalDetailPage.tsx    # 3-panel detay gorunumu
│   │   ├── CartPage.tsx          # Oneri sepeti
│   │   └── ComparisonPage.tsx    # Yan yana eval karsilastirma
│   │
│   ├── components/
│   │   ├── layout/               # Layout: AppShell, Sidebar
│   │   ├── dashboard/            # Dashboard widget'lari
│   │   ├── eval-list/            # Liste sayfa componentleri
│   │   ├── eval-detail/          # Detay sayfa componentleri
│   │   ├── cart/                 # Sepet componentleri
│   │   ├── shared/               # Paylasilmis componentler
│   │   └── ui/                   # shadcn/ui primitifleri (17 dosya)
│   │
│   └── (yok: test dosyasi, migration dosyasi)
```

---

## 4. Veritabani Mimarisi (Supabase)

### Baglanti

```typescript
// src/lib/supabase.ts
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,    // https://xxx.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY // public anon key
);
```

Frontend **salt okunur** erisime sahiptir (RLS ile korunur). Tek yazma islemi `suggestion_applications` tablosuna insert'tir.

### Tablo Yapisi

#### `agent_registry` - Merkezi Agent Konfigurasyon Tablosu

Bu tablo tum sistemin merkezidir. Her agent burada tanimlanir.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | uuid | Primary key |
| `agent_key` | text | Benzersiz agent tanitici (orn: "new_serp_agent") |
| `display_name` | text | UI'da gosterilen isim (orn: "SERP Agent") |
| `color` | text | CSS renk degeri (orn: "var(--color-agent-serp)") |
| `icon` | text | Lucide icon adi (orn: "search") |
| `system_group` | text | Gruplama anahtari (orn: "content_brief_system") |
| `system_display_name` | text | Grup gosterim adi (orn: "Content Brief") |
| `table_name` | text | Bu agent'in eval verisinin oldugu tablo adi |
| `eval_report_column` | text | Eval report JSON'unun oldugu kolon adi |
| `input_column` | text/null | Input JSON kolonunun adi (opsiyonel) |
| `output_column` | text/null | Output JSON kolonunun adi (opsiyonel) |
| `sort_order` | integer | UI siralama onceligi |
| `is_active` | boolean | Aktif/pasif filtresi |
| `created_at` | timestamp | Olusturulma zamani |

**Ornek Kayit:**
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

#### Agent Eval Tablolari (Her Agent Icin Ayri Tablo)

Her agent'in verileri `agent_registry.table_name` ile belirtilen tabloda tutulur. Tablolar arasi baglanti `id` kolonu uzerinden yapilir - ayni eval run'daki tum agent tablolari ayni `id`'yi paylasir.

**Standart Kolon Yapisi:**

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | uuid | Eval run ID (tum agent tablolarinda ortak) |
| `created_at` | timestamp | Olusturulma zamani |
| `brand_name` | text/null | Sadece content_brief tablolarinda |
| `[eval_report_column]` | jsonb | EvalReport JSON (Section 5'e bkz) |
| `[input_column]` | jsonb/null | Agent'a gonderilen input verisi |
| `[output_column]` | jsonb/text/null | Agent'in urettigi cikti |

**Onemli:** `id` degeri tum agent tablolarinda eslesmeli. Ornegin bir eval run'da:
- `new_serp_evals.id = "abc-123"`
- `new_citation_evals.id = "abc-123"`
- `new_content_brief_evals.id = "abc-123"`

#### `daily_scores` - Gunluk Aggregate Tablo

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | uuid | Primary key |
| `date` | date | YYYY-MM-DD formati |
| `agent_key` | text | Agent referansi |
| `avg_score` | numeric | Gunluk ortalama skor (0-100) |
| `eval_count` | integer | O gunku eval sayisi |

Bu tablo harici bir backend job tarafindan doldurulur, dashboard tarafindan okunur.

#### `suggestion_applications` - Uygulanan Oneriler

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | uuid | Auto-generated |
| `eval_id` | text | Hangi eval'den geldi |
| `agent_key` | text | Hangi agent'tan geldi |
| `suggestion_hash` | text | Dedup icin hash |
| `suggestion_data` | jsonb | ImprovementSuggestion JSON |
| `batch_id` | text/null | Toplu uygulama grubu |
| `applied_at` | timestamp | Uygulanma zamani |

---

## 5. Veri Kontrati: EvalReport JSON Yapisi

Bu, tum sistemin temel kontrati. Eval pipeline bu yapida JSON uretmeli, UI bu yapiyi bekler.

```typescript
// ========== ANA YAPI ==========
interface EvalReport {
  overall: EvalOverall;
  eval_metadata: Record<string, unknown>;
  criteria_scores: CriteriaScore[];
}

// ========== GENEL DEGERLENDIRME ==========
interface EvalOverall {
  grade: string;                        // "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"
  grade_label: string;                  // Okunabilir etiket (orn: "Excellent")
  top_strengths: string[];              // Guclu yanlar listesi
  top_weaknesses: string[];             // Zayif yanlar listesi
  weighted_total: number;               // 0-100 arasi toplam skor (PIPELINE HESAPLAR)
  improvement_suggestions: ImprovementSuggestion[];
}

// ========== KRITER SKORLARI ==========
interface CriteriaScore {
  criterion: string;                    // Benzersiz kriter ID (orn: "keyword_placement")
  label: string;                        // Gosterim adi (orn: "Keyword Placement")
  score: number;                        // 0-10 arasi skor
  weight: number;                       // Agirlik carpani (orn: 5, 3, 2)
  weighted_score: number;               // score * weight (PIPELINE HESAPLAR)
  justification: string;                // Neden bu skoru aldi
  reference_module: string;             // Kaynak modul referansi
  positive_evidence: string[];          // Olumlu kanitlar
  negative_evidence: string[];          // Olumsuz kanitlar
  input_output_mapping: InputOutputMapping;
}

// ========== INPUT-OUTPUT ESLEME ==========
interface InputOutputMapping {
  fidelity: string;                     // "perfect", "high", "medium-high", "medium", "low", "poor"
  input_element: string;                // Input JSON path veya element ID
  output_element: string;               // Output JSON path veya element ID
}

// ========== IYILESTIRME ONERISI ==========
interface ImprovementSuggestion {
  priority: "high" | "medium" | "low";
  suggestion: string;                    // Onerinin aciklamasi
  affected_criterion: string;            // Hangi kritere etki eder
  expected_score_impact: string;         // Beklenen etki (orn: "+1.5 to +2.0")
  prompt_patch: PromptPatch;
}

// ========== PROMPT DEGISIKLIK ONERISI ==========
interface PromptPatch {
  rule: string;                         // Yeni/degistirilecek kural
  action: "add_rule" | "modify_rule" | "add_example";
  target_section: string;               // Prompt'un hangi bolumu
  current_behavior: string;             // Mevcut davranis
}

// ========== METADATA ==========
// eval_metadata icerigi tamamen serbesttir.
// UI su alanlari arar (opsiyonel):
//   - brand_name: string      → liste gorunumunde brand gosterimi
//   - target_prompt: string   → keyword olarak kullanilir
//   - query: string           → target_prompt yoksa keyword olarak
//   - primary_keyword: string → diger ikisi yoksa keyword olarak
```

### Kritik Notlar

1. **`weighted_total`** UI tarafindan HESAPLANMAZ. Eval pipeline `sum(weighted_score) / sum(weight) * 10` veya benzeri bir formul uygulayarak JSON'a yazar.

2. **`weighted_score`** UI tarafindan HESAPLANMAZ. Pipeline `score * weight` hesabini yapar.

3. **`grade`** hem pipeline tarafindan JSON'a yazilir, hem de UI'da `gradeFromScore()` fonksiyonu ile `weighted_total`'dan turetilir. UI kendi hesapladigi grade'i de kullanabilir.

4. **`criteria_scores` dizisinin boyutu** tamamen serbesttir. 3 kriter de olabilir, 30 da. UI hepsini iterate eder.

5. **`weight` degerleri** kriter bazinda serbesttir. Her kriterin farkli weight'i olabilir.

---

## 6. Agent Registry Sistemi

Agent registry, tum dashboard'un dinamik yapisinin temelidir. Yeni bir agent veya sistem eklemek icin tek yapilmasi gereken bu tabloya kayit eklemektir.

### Nasil Calisir

```
                    agent_registry tablosu
                           │
                           ▼
              ┌─────────────────────────┐
              │    useAgentRegistry()   │
              │  SELECT * WHERE active  │
              │  GROUP BY system_group  │
              └────────────┬────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         System A      System B     System C
         ┌─────┐      ┌─────┐      ┌─────┐
         │Agent1│      │Agent3│      │Agent5│
         │Agent2│      │Agent4│      │Agent6│
         └─────┘      └─────┘      └─────┘
              │            │            │
              ▼            ▼            ▼
        Sidebar'da    Sidebar'da    Sidebar'da
        nav item      nav item      nav item
```

### Gruplama Mantigi

Agent'lar `system_group` alanina gore gruplanir. `groupAgentsBySystem()` fonksiyonu:

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

### Primary Agent Kavrami

Her system group icinde bir "primary agent" belirlenir. Bu agent:
- Eval ID listesinin cekilmesi icin kullanilir
- `brand_name` metadata'sinin kaynagi olabilir

Secim mantigi:
```typescript
const briefAgent = groupAgents.find(a => a.table_name.includes("content_brief"));
const primaryAgent = briefAgent ?? groupAgents[0];
```

**Onemli:** `content_brief` iceren tablo adi varsa tercih edilir, yoksa ilk agent kullanilir. Bu mantik `useEvals.ts`, `useBrandScoreHistory.ts`, `useSuggestionFrequency.ts` ve `useNewEvalNotifications.ts`'de tekrarlanir.

---

## 7. Veri Akisi: DB'den UI'a

### Genel Akis Diyagrami

```
  Supabase PostgreSQL
        │
        ├─── agent_registry ───────────────── useAgentRegistry()
        │         │                                   │
        │    agents[], systemGroups[]                  │
        │         │                                   │
        ├─── [agent_table_1] ──┐                      │
        ├─── [agent_table_2] ──┤── useEvals() ────── EvalListPage
        ├─── [agent_table_3] ──┘       │
        │                              │
        │                        useEvalDetail() ──── EvalDetailPage
        │                              │
        ├─── daily_scores ──────────── DailyScoreChart (dashboard icerisinde)
        │
        └─── suggestion_applications ─ CartPage (yazma + okuma)
```

### Detayli Veri Fetch Adimlari

#### 1. Eval Listesi Yuklemesi (`useEvals`)

```
1. agents[] filtrele → systemGroup'a ait agent'lar
2. Primary agent bul (content_brief tercihli)
3. Primary tablodan TUM satirlari cek (SELECT *, ORDER BY created_at DESC)
4. Her satir icin:
   a. Tum agent tablolarindan eval_report JSON'unu cek (Promise.all)
   b. Her agent icin grade ve weighted_total cikar
   c. overall_avg hesapla (weighted_total ortalamasi)
   d. brand_name ve keyword metadata'dan cikar
5. EvalListItem[] dondur
```

#### 2. Eval Detay Yuklemesi (`fetchEvalRun` via `useEvalDetail`)

```
1. Tum agent tablolarini PARALEL sorgula (Promise.all)
2. Her agent icin:
   a. Tablodan eval_report JSON, input, output kolonlarini oku
   b. AgentEvalData objesi olustur
3. Null sonuclari filtrele
4. overall_avg = ortalama(weighted_total'lar)
5. Metadata'dan brand_name ve keyword cikar
6. NormalizedEvalRun objesi dondur
```

#### 3. Metadata Cikarim Onceligi

```typescript
// brand_name:
eval_metadata.brand_name ?? table.brand_name ?? null

// keyword (oncelik sirasi):
eval_metadata.target_prompt
  ?? eval_metadata.query
  ?? eval_metadata.primary_keyword
  ?? null
```

---

## 8. Frontend Mimarisi

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

### QueryClient Konfigurasyonu

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

### Component Agaci

```
AppShell
├── Sidebar
│   ├── Logo ("EvalStudio")
│   ├── NavItem: Dashboard (/)
│   ├── NavItem[]: System Groups (/evals/:group) + badge
│   └── NavItem: Cart (/cart) + badge
│
└── <Outlet>
    ├── DashboardPage
    │   ├── StatsCards → SystemCard[] (her system grubu icin)
    │   │   ├── Recharts mini LineChart
    │   │   └── Agent skor listesi
    │   └── RecentEvals → son 5 eval/grup
    │
    ├── EvalListPage
    │   ├── InlineHeatmap (genisleyebilir kriter heatmap)
    │   ├── DailyScoreChart (cok-agent cizgi grafik)
    │   ├── CommonSuggestions (en sik oneriler)
    │   ├── FilterBar (arama + siralama + sayac)
    │   └── EvalGrid → EvalCard[]
    │       ├── Agent skor grid'i
    │       ├── Sparkline (trend)
    │       └── GradeBadge
    │
    ├── EvalDetailPage (3-panel)
    │   ├── Header: breadcrumb, baslik, grade badge'leri, export
    │   ├── AgentTabs
    │   ├── Sol Panel: JsonTreeViewer (input)
    │   ├── Orta Panel:
    │   │   ├── Skor ozeti (ScoreBar)
    │   │   ├── Guclu/zayif yanlar
    │   │   └── CriteriaCard[]
    │   │       ├── Skor, agirlik, justification
    │   │       ├── Evidence (olumlu/olumsuz)
    │   │       ├── Input/Output mapping
    │   │       ├── DiffView (prompt patch onizleme)
    │   │       └── "Add to Cart" butonu
    │   └── Sag Panel: JsonTreeViewer (output)
    │
    ├── CartPage
    │   └── CartItem[] (oneri kartlari)
    │       └── "Apply & Export" → TXT indirme + DB kayit
    │
    └── ComparisonPage (2 panel)
        ├── Agent seciici dropdown
        ├── Swap butonu
        └── ComparisonPanel[] (x2)
            ├── Skor ozeti
            ├── Criteria karsilastirma + delta
            └── Senkronize scroll
```

---

## 9. Sayfa Yapilari ve Routing

### Route Tablosu

| Route | Sayfa | URL Parametreleri | Query Params |
|-------|-------|-------------------|--------------|
| `/` | DashboardPage | - | - |
| `/evals/:systemGroup` | EvalListPage | systemGroup | - |
| `/evals/:systemGroup/:evalId` | EvalDetailPage | systemGroup, evalId | - |
| `/cart` | CartPage | - | - |
| `/compare/:systemGroup` | ComparisonPage | systemGroup | left, right (eval ID'leri) |

### DashboardPage
- **Dosya:** `src/pages/DashboardPage.tsx`
- **Sorumluluk:** Tum sistemlerin genel gorunumu
- **Kullandigi Componentler:** StatsCards, RecentEvals
- **Veri:** Her sistem grubu icin skor ozeti ve son eval'ler
- **Stateless:** Kendi state'i yok, child component'lere delegate eder

### EvalListPage
- **Dosya:** `src/pages/EvalListPage.tsx`
- **Sorumluluk:** Bir system group'un eval listesi
- **Hooks:** useAgentRegistry, useEvals, useBrandScoreHistory, useNotificationStore, useKeyboardShortcuts
- **Local State:**
  - `search`: string - brand/keyword filtreleme
  - `sort`: SortOption - siralama (date_desc/date_asc/score_desc/score_asc/name_asc/name_desc)
  - `focusedIndex`: number - klavye navigasyonu icin
  - `selectedIds`: Set<string> - karsilastirma secimi (max 2)
- **Ozellikler:**
  - Arama ile filtreleme
  - 6 farkli siralama secenegi
  - Klavye navigasyonu (j/k/Enter)
  - 2 eval secip karsilastirma baslatma
  - InlineHeatmap, DailyScoreChart, CommonSuggestions widget'lari

### EvalDetailPage
- **Dosya:** `src/pages/EvalDetailPage.tsx`
- **Sorumluluk:** Tek bir eval'in 3 panelli detay gorunumu
- **Hooks:** useAgentRegistry, useEvalDetail, useSuggestionFrequency, useKeyboardShortcuts
- **Local State:**
  - `activeAgentKey`: string|null - aktif agent sekme
  - `leftOpen/rightOpen`: boolean - panel gorunurlugu
  - `inputHighlight/outputHighlight`: string|undefined - JSON agacinda vurgulama
  - `sortByWeight`: boolean - kriterleri agirliga gore sirala
  - `showWeightBar`: boolean - agirlik gorsellestirmesi
- **Ozellikler:**
  - Sol panel: Input JSON agaci (genisleyebilir, vurgulanabilir)
  - Sag panel: Output JSON agaci
  - Orta panel: Skor ozeti + kriter kartlari
  - Agent tab'lari ile gecis (Tab tusu)
  - CriteriaCard icerisinde "Add to Cart" fonksiyonalitesi
  - Input/Output element butonlari → JSON agacinda vurgulama
  - PDF export

### CartPage
- **Dosya:** `src/pages/CartPage.tsx`
- **Sorumluluk:** Toplanan onerilerin yonetimi ve export'u
- **Store:** useCartStore
- **Ozellikler:**
  - Oneriler agent bazinda gruplanir
  - "Apply & Export" → TXT dosya indirir + DB'ye insert
  - "Clear All" → sepeti bosaltir
  - Her item silinebilir
  - Basarili uygulama sonrasi success ekrani

### ComparisonPage
- **Dosya:** `src/pages/ComparisonPage.tsx`
- **Sorumluluk:** Iki eval'in yan yana karsilastirmasi
- **Query Params:** `?left={evalId}&right={evalId}`
- **Ozellikler:**
  - Senkronize scroll (iki panel birlikte kayar)
  - Agent secici dropdown
  - Swap butonu (sol/sag yer degistirir)
  - Skor deltalari (+/- gorunumu)

---

## 10. Hook Sistemi

Tum data hook'lari React Query uzerine insa edilmistir.

### useAgentRegistry

```typescript
// Dosya: src/hooks/useAgentRegistry.ts
// Query Key: ["agent-registry"]
// Stale Time: 5 dakika
// Donus: { agents: AgentRegistryEntry[], systemGroups: SystemGroup[], isLoading, error }

// Islem:
// 1. agent_registry tablosundan is_active=true olanlari cek
// 2. sort_order'a gore sirala
// 3. groupAgentsBySystem() ile grupla
```

### useEvals

```typescript
// Dosya: src/hooks/useEvals.ts
// Query Key: ["evals", systemGroup]
// Stale Time: default (aninda stale)
// Donus: UseQueryResult<EvalListItem[]>
// Enabled: agents.length > 0

// Islem:
// 1. Agent'lari systemGroup'a gore filtrele
// 2. Primary agent bul
// 3. Primary tablodan tum satirlari cek
// 4. Her satir icin tum agent tablolarindan eval_report cek (paralel)
// 5. EvalListItem olustur (id, brand_name, keyword, agents[], overall_avg)
```

### useEvalDetail

```typescript
// Dosya: src/hooks/useEvalDetail.ts
// Query Key: ["eval-detail", evalId, systemGroup]
// Enabled: !!evalId && agents.length > 0

// Islem: fetchEvalRun(evalId, filteredAgents) cagirir
```

### useBrandScoreHistory

```typescript
// Dosya: src/hooks/useBrandScoreHistory.ts
// Query Key: ["brand-score-history", systemGroup]
// Stale Time: 5 dakika
// Donus: Map<brandName, number[]>

// Islem:
// 1. Primary agent bul
// 2. Tum satirlari tarih sirasina gore cek
// 3. brand_name'e gore grupla
// 4. Her brand icin son N skoru tut
```

### useCriteriaHeatmapData

```typescript
// Dosya: src/hooks/useCriteriaHeatmapData.ts
// Query Key: ["criteria-heatmap", agent.agent_key]
// Stale Time: 5 dakika
// Donus: HeatmapRow[] (date + criterion scores)

// Islem:
// 1. Agent tablosundan tum eval'leri tarih sirasina cek
// 2. Tarihe gore grupla
// 3. Her tarih icin her kriter icin gunluk ortalama hesapla
```

### useSuggestionFrequency

```typescript
// Dosya: src/hooks/useSuggestionFrequency.ts
// Query Key: ["suggestion-frequency", systemGroup]
// Stale Time: 5 dakika
// Donus: { frequencyMap, topSuggestions (top 5), totalEvals }

// Islem:
// 1. Tum agent tablolarindan tum eval report'lari cek
// 2. improvement_suggestions dizilerini cikar
// 3. affected_criterion'a gore grupla
// 4. Benzersiz eval sayisi hesapla (ayni kriter icin)
// 5. Frekansa gore sirala, ilk 5'i dondur
```

### useNewEvalNotifications

```typescript
// Dosya: src/hooks/useNewEvalNotifications.ts
// Query Key: ["new-eval-notifications", ...]
// Refetch Interval: 30 saniye
// Side Effect: notificationStore.setNewCount() gunceller

// Islem:
// 1. Her system group icin primary agent bul
// 2. lastSeen[systemGroup]'dan sonra eklenen eval sayisini COUNT
// 3. notificationStore'u guncelle
```

### useKeyboardShortcuts

```typescript
// Dosya: src/hooks/useKeyboardShortcuts.ts
// Parametre: Shortcut[] dizisi
// Side Effect: document keydown listener

// Islem:
// 1. keydown dinle
// 2. INPUT/TEXTAREA/SELECT/contentEditable ise atla
// 3. key + when() eslesirse handler() cagir
```

---

## 11. State Management

### Server State: React Query

Tum veritabani verileri React Query ile yonetilir:

| Query Key | Stale Time | Refetch | Kaynak |
|-----------|------------|---------|--------|
| `["agent-registry"]` | 5 dk | - | `agent_registry` tablosu |
| `["evals", systemGroup]` | 0 (aninda) | - | Agent tablolari |
| `["eval-detail", evalId, systemGroup]` | 0 | - | Agent tablolari |
| `["brand-score-history", systemGroup]` | 5 dk | - | Primary agent tablosu |
| `["criteria-heatmap", agentKey]` | 5 dk | - | Agent tablosu |
| `["suggestion-frequency", systemGroup]` | 5 dk | - | Agent tablolari |
| `["new-eval-notifications", ...]` | - | 30 sn | Agent tablolari (COUNT) |

### Client State: Zustand

#### cartStore (`src/stores/cartStore.ts`)

```typescript
interface CartState {
  items: CartItem[];                    // Sepetteki oneriler
  appliedHashes: Set<string>;           // Uygulanmis onerilerin hash'leri

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
- **Set<string> serializasyonu:** Array'e cevirilir persist edilirken, Set'e geri donusturulur yuklenirken
- **Dedup:** `generateSuggestionHash(evalId, criterion, rule)` ile hash olusturulur

#### notificationStore (`src/stores/notificationStore.ts`)

```typescript
interface NotificationState {
  lastSeen: Record<string, string>;     // systemGroup → ISO timestamp
  newCounts: Record<string, number>;    // systemGroup → yeni eval sayisi

  markSeen(systemGroup): void;          // lastSeen guncelle, count sifirla
  setNewCount(systemGroup, count): void;
}
```

- **Persist:** localStorage, key: `"eval-notifications"`
- **Polling:** useNewEvalNotifications 30 saniyede bir gunceller

---

## 12. Component Katalogu

### Layout

| Component | Dosya | Sorumluluk |
|-----------|-------|------------|
| AppShell | `layout/AppShell.tsx` | Root layout, Sidebar + Outlet + Help modal |
| Sidebar | `layout/Sidebar.tsx` | Navigasyon, dinamik system group linkleri, badge'ler |

**Sidebar Detay:**
- Logo ve marka adi ("EvalStudio")
- Dashboard linki (sabit)
- System group linkleri (agent_registry'den dinamik)
- Her link icin bildirim badge'i (yeni eval sayisi)
- Cart linki + sepet sayaci
- `DynamicIcon` componenti: agent.icon degerini lucide-react ikonuna cevirir

### Dashboard

| Component | Dosya | Props | Sorumluluk |
|-----------|-------|-------|------------|
| StatsCards | `dashboard/StatsCards.tsx` | - | Her system icin skor karti + mini chart |
| RecentEvals | `dashboard/RecentEvals.tsx` | - | Her system icin son 5 eval |
| DailyScoreChart | `dashboard/DailyScoreChart.tsx` | activeSystem? | Gunluk skor trend grafigi (Recharts) |
| GradeDistributionChart | `dashboard/GradeDistributionChart.tsx` | activeSystem? | Grade dagilim pasta grafigi |
| CommonSuggestions | `dashboard/CommonSuggestions.tsx` | systemGroup | En sik oneriler (top 5) |

### Eval List

| Component | Dosya | Props | Sorumluluk |
|-----------|-------|-------|------------|
| FilterBar | `eval-list/FilterBar.tsx` | search, sort, counts | Arama + siralama + sayac |
| EvalGrid | `eval-list/EvalGrid.tsx` | evals, focusedIndex, ... | Responsive eval kart grid'i |
| EvalCard | `eval-list/EvalCard.tsx` | eval, isFocused, scoreHistory | Tek eval karti (sparkline, grade'ler) |
| InlineHeatmap | `eval-list/InlineHeatmap.tsx` | systemGroup, agents | Genisleyebilir kriter heatmap tablosu |

### Eval Detail

| Component | Dosya | Props | Sorumluluk |
|-----------|-------|-------|------------|
| AgentTabs | `eval-detail/AgentTabs.tsx` | agents, activeKey, onSelect | Agent sekme cubugu |
| CriteriaCard | `eval-detail/CriteriaCard.tsx` | criteria, suggestion, ... | Kriter detay karti (en karmasik component) |
| JsonTreeViewer | `eval-detail/JsonTreeViewer.tsx` | data, highlightPath, colorAccent | Interaktif JSON agaci |

**CriteriaCard Detay (en karmasik component):**
- Genisleyebilir: baslik, skor, agirlik → tiklayinca detay
- Justification metni
- Input/Output element butonlari → JSON viewer'da vurgulama tetikler
- Fidelity badge'i
- Evidence grid'i (olumlu/olumsuz)
- Suggestion kutusu (varsa):
  - Priority badge
  - Frekans gostergesi
  - DiffView (prompt patch onizleme)
  - "Add to Cart" / "Applied" / "In Cart" durum butonlari

### Shared (Paylasilmis)

| Component | Dosya | Props | Sorumluluk |
|-----------|-------|-------|------------|
| GradeBadge | `shared/GradeBadge.tsx` | grade, size | Renkli harf grade badge'i |
| ScoreBar | `shared/ScoreBar.tsx` | score, maxScore, animated | Yatay ilerleme cubugu |
| Sparkline | `shared/Sparkline.tsx` | data, width, height | SVG mini trend cizgisi |
| DiffView | `shared/DiffView.tsx` | oldText, newText | Yan yana diff gorunumu |
| ExportMenu | `shared/ExportMenu.tsx` | options[] | Export dropdown menusu |
| EmptyState | `shared/EmptyState.tsx` | title, description, icon | Bos durum placeholder |
| ShortcutHelpModal | `shared/ShortcutHelpModal.tsx` | open, onClose | Klavye kisayol yardimi |

### Cart

| Component | Dosya | Props | Sorumluluk |
|-----------|-------|-------|------------|
| CartItem | `cart/CartItem.tsx` | item | Oneri karti (priority, rule, diff) |

---

## 13. Stil ve Tema Sistemi

### CSS Degiskenleri (`src/index.css`)

**Arka Plan Katmanlari (koyu tema, mor tonlari):**
```css
--color-bg-page:       #0a0a0f    /* En koyu - sayfa arka plani */
--color-bg-sidebar:    #0f0f18    /* Sidebar */
--color-bg-card:       #12121e    /* Kart arka plani */
--color-bg-card-hover: #1a1a2e    /* Kart hover */
--color-bg-elevated:   #1e1e30    /* Yukseltiimis yuzeyler */
```

**Metin Hiyerarsisi (4 seviye):**
```css
--color-text-primary:   #f0f0f5   /* Ana metin */
--color-text-secondary: #a0a0b8   /* Ikincil metin */
--color-text-tertiary:  #6b6b80   /* Ucuncul metin */
--color-text-muted:     #45455a   /* Soluk metin */
```

**Kenarlık Renkleri:**
```css
--color-border-subtle:  rgba(255, 255, 255, 0.06)
--color-border-default: rgba(255, 255, 255, 0.10)
--color-border-strong:  rgba(255, 255, 255, 0.15)
```

**Grade Renkleri:**
```css
--color-grade-a: #22c55e  /* Yesil - A+, A, A- */
--color-grade-b: #3b82f6  /* Mavi  - B+, B, B- */
--color-grade-c: #eab308  /* Sari  - C+, C, C- */
--color-grade-d: #ef4444  /* Kirmizi - D+, D, D-, F */
```

**Agent Renkleri:**
```css
--color-agent-serp:     #3b82f6  /* SERP Agent - mavi */
--color-agent-citation: #22c55e  /* Citation Agent - yesil */
--color-agent-brief:    #f59e0b  /* Content Brief - turuncu */
--color-agent-faq-gen:  #8b5cf6  /* FAQ Generation - mor */
--color-agent-faq-qual: #ec4899  /* FAQ Quality - pembe */
```

**Vurgu Renkleri:**
```css
--color-accent-primary: #6366f1   /* Indigo - ana accent */
--color-accent-success: #10b981   /* Teal */
--color-accent-warning: #f59e0b   /* Amber */
--color-accent-danger:  #ef4444   /* Kirmizi */
```

### Animasyonlar

```css
.hover-lift          /* Kart hover efekti: translateY(-1px) + golge */
.animate-fade-in-up  /* Giris animasyonu: opacity 0→1, Y 12px→0 */
.animate-progress-fill /* Ilerleme cubugu dolma animasyonu */
.stagger-children    /* Cocuk element'ler icin kademeli giris (50ms araliklarla) */
```

### Fontlar

```css
--font-sans: "Plus Jakarta Sans", system-ui, sans-serif
--font-mono: "JetBrains Mono", "SF Mono", "Fira Code", monospace
```

---

## 14. Sabit Degerler ve Konfigurasyonlar

### Grade Esikleri (Hard-coded)

```typescript
// src/lib/utils.ts → gradeFromScore()
score >= 95 → "A+"    score >= 90 → "A"     score >= 87 → "A-"
score >= 83 → "B+"    score >= 80 → "B"     score >= 77 → "B-"
score >= 73 → "C+"    score >= 70 → "C"     score >= 67 → "C-"
score >= 63 → "D+"    score >= 60 → "D"     score >= 57 → "D-"
score < 57  → "F"
```

### Skor Renk Esikleri (Hard-coded)

```typescript
// src/lib/constants.ts

// Overall skor (0-100 olcegi):
getScoreColor(score):
  score >= 80 → grade-a (yesil)
  score >= 60 → grade-b (mavi)
  score >= 40 → grade-c (sari)
  else        → grade-d (kirmizi)

// Kriter skoru (0-10 olcegi):
getCriterionScoreColor(score):
  score >= 8 → grade-a
  score >= 6 → grade-b
  score >= 4 → grade-c
  else       → grade-d
```

### Fidelity Konfigurasyonu (Hard-coded)

```typescript
// src/lib/constants.ts
FIDELITY_CONFIG:
  "perfect"     → grade-a (yesil)
  "high"        → grade-a (yesil)
  "medium-high" → grade-b (mavi)
  "medium"      → grade-c (sari)
  "low"         → grade-d (kirmizi)
  "poor"        → grade-d (kirmizi)
```

### Agent Renk Haritas (Hard-coded)

```typescript
// src/lib/constants.ts
AGENT_COLORS:
  new_serp_agent     → var(--color-agent-serp)
  new_citation_agent → var(--color-agent-citation)
  new_content_brief  → var(--color-agent-brief)
  faq_generation     → var(--color-agent-faq-gen)
  faq_quality        → var(--color-agent-faq-qual)
```

**Not:** Bu hard-coded harita sadece fallback icin kullanilir. Agent'in rengi normalde `agent_registry.color` alanindangelir.

---

## 15. Export Sistemi

### CSV Export (`src/lib/exporters.ts`)

```
Cikti Format: eval_id, brand_name, keyword, date, [agent_score, agent_grade]..., overall_avg
Dosya Adi:    eval-scores-{systemGroup}-{YYYY-MM-DD}.csv
```

- Agent anahtarlari alfabetik sirali
- Her agent icin `_score` ve `_grade` kolonlari
- CSV escape: virgul, tirnak, yeni satir iceren degerleri sarar

### PDF Export (`src/lib/exporters.ts`)

- html2canvas ile DOM element'i yakalama
- Koyu arka plan (#0a0a0f)
- A4 boyutunda sayfalama
- jsPDF ile PDF olusturma
- Lazy import (bundle boyutu optimizasyonu)

### TXT Export (`src/lib/utils.ts`)

- Cart "Apply & Export" aksiyonunda kullanilir
- Oneriler agent bazinda gruplanir
- Her oneri: priority, target_section, affected_criterion, expected_impact, action, rule, current_behavior

---

## 16. Hard-Coded vs Dinamik Ogelerin Tam Listesi

### Tamamen Dinamik (Veritabanindan Gelir)

| Oge | Kaynak | Aciklama |
|-----|--------|----------|
| Agent tanimlari | `agent_registry` tablosu | Yeni agent eklemek icin sadece tablo + registry kaydi |
| System gruuplari | `agent_registry.system_group` | Agent'lar otomatik gruplanir |
| Sidebar navigasyonu | `useAgentRegistry()` | Registry'den dinamik olusturulur |
| Kriter isimleri | `eval_report.criteria_scores[].criterion` | Her agent farkli kriterler kullanabilir |
| Kriter sayisi | `eval_report.criteria_scores.length` | 3 de olabilir, 30 da |
| Weight degerleri | `eval_report.criteria_scores[].weight` | Her kriterin farkli agirligin olabilir |
| weighted_score | `eval_report.criteria_scores[].weighted_score` | Pipeline tarafindan hesaplanir |
| weighted_total | `eval_report.overall.weighted_total` | Pipeline tarafindan hesaplanir |
| Grade (JSON'daki) | `eval_report.overall.grade` | Pipeline tarafindan belirlenir |
| Improvement suggestions | `eval_report.overall.improvement_suggestions` | Pipeline olusturur |
| Evidence listeleri | `criteria_scores[].positive/negative_evidence` | Pipeline olusturur |
| Input/Output yapisi | Agent tablosundaki JSON kolonlar | Tamamen serbest JSON |
| Metadata | `eval_report.eval_metadata` | Serbest key-value |

### Hard-Coded (Kod Degisikligi Gerektirir)

| Oge | Dosya | Aciklama |
|-----|-------|----------|
| Grade esikleri | `src/lib/utils.ts:gradeFromScore()` | 95→A+, 90→A, 87→A-... |
| Skor renk esikleri | `src/lib/constants.ts:getScoreColor()` | 80→yesil, 60→mavi, 40→sari |
| Kriter skor renkleri | `src/lib/constants.ts:getCriterionScoreColor()` | 8→yesil, 6→mavi, 4→sari |
| Fidelity renkleri | `src/lib/constants.ts:FIDELITY_CONFIG` | perfect→yesil, medium→sari |
| Agent renk haritasi | `src/lib/constants.ts:AGENT_COLORS` | Sadece mevcut 5 agent icin |
| CSS tema renkleri | `src/index.css` | Koyu tema arka plan, metin, border |
| EvalReport JSON sekli | `src/lib/types.ts` | TypeScript interface kontrati |
| Primary agent secimi | `normalizers.ts`, hook'lar | `content_brief` iceren tablo oncelikli |
| Metadata cikarim sirasi | `normalizers.ts:fetchEvalRun()` | target_prompt → query → primary_keyword |
| Notification polling | `useNewEvalNotifications.ts` | 30 saniye araliklarla |
| Route yapisi | `src/App.tsx` | 5 sabit route |
| Klavye kisayollari | Sayfa componentleri | j/k/Enter/Tab/? |
| PDF arka plan rengi | `src/lib/exporters.ts` | #0a0a0f |

---

## 17. Yeni Bir Eval Sistemi Ekleme Rehberi

### Senaryo: "Code Review" adinda yeni bir eval sistemi

#### Adim 1: Supabase Tablolari Olustur

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

-- RLS politikalari
ALTER TABLE code_quality_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_evals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read" ON code_quality_evals FOR SELECT USING (true);
CREATE POLICY "Anon read" ON security_audit_evals FOR SELECT USING (true);
```

#### Adim 2: Agent Registry'e Kayit Ekle

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

#### Adim 3: CSS Degiskenleri Ekle (Opsiyonel ama Onerilen)

`src/index.css`'e:
```css
--color-agent-code-quality: #3b82f6;
--color-agent-security-audit: #ef4444;
```

`src/lib/constants.ts`'deki `AGENT_COLORS`'a:
```typescript
code_quality: "var(--color-agent-code-quality)",
security_audit: "var(--color-agent-security-audit)",
```

**Not:** Bu adim opsiyonel cunku agent rengi zaten `agent_registry.color` alaninda tanimli. `AGENT_COLORS` haritasi sadece fallback.

#### Adim 4: Eval Pipeline'in Ciktisini Olustur

Pipeline'in her eval icin iki tabloya da ayni `id` ile `EvalReport` JSON'u yazmasi gerekir:

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
    },
    {
      "criterion": "input_validation",
      "label": "Input Validation",
      "score": 5.0,
      "weight": 3,
      "weighted_score": 15.0,
      "justification": "Missing validation in 4 of 7 public functions",
      "reference_module": "validation_checker",
      "positive_evidence": ["API endpoint validates request body"],
      "negative_evidence": ["processPayment() accepts any amount", "No null checks"],
      "input_output_mapping": {
        "fidelity": "medium",
        "input_element": "source_code.functions",
        "output_element": "analysis.validation_report"
      }
    }
  ]
}
```

#### Adim 5: Hicbir Kod Degisikligi Gerekmez

Frontend otomatik olarak:
1. `useAgentRegistry()` yeni agent'lari kesfeder
2. Sidebar'a "Code Review" linki eklenir
3. `/evals/code_review_system` route'u calisir
4. Eval detay sayfasi 2 agent tab'i gosterir
5. Tum kriter kartlari, suggestion'lar, heatmap vs. calisir

#### Ne Zaman Kod Degisikligi Gerekir

| Durum | Degisiklik |
|-------|------------|
| `brand_name` yerine `project_name` kullanmak istiyorsan | `normalizers.ts` ve `useEvals.ts`'de metadata cikarim mantigi |
| Primary agent seciminde `content_brief` disinda oncelik istiyorsan | `normalizers.ts`, `useEvals.ts` ve diger hook'lardaki primary agent mantigi |
| Yeni grade esikleri istiyorsan (orn: 0-5 olcek) | `utils.ts:gradeFromScore()` |
| Yeni bir metadata alani gostermek istiyorsan | Ilgili sayfa componentleri |
| Farkli fidelity etiketleri kullaniyorsan | `constants.ts:FIDELITY_CONFIG` |
| daily_scores tablosuna veri yaziyorsan | Harici job'un agent_key'lerle eslestiginden emin ol |

---

## 18. Bilinen Limitasyonlar

### Performans

1. **N+1 sorgu problemi:** `useEvals` her eval satiri icin her agent tablosuna ayri sorgu atar. 100 eval * 5 agent = 500 sorgu. Buyuk veri setlerinde yavaslar.

2. **Tum satirlar cekilir:** `useEvals` sayfalam (pagination) kullanmaz. `SELECT *` ile tum eval'leri ceker.

3. **Heatmap full table scan:** `useCriteriaHeatmapData` tum eval tabloyusnu tarar ve JS'de aggregate eder.

4. **Suggestion frequency full scan:** Tum eval'lerdeki tum suggestion'lari tarar.

### Mimari

5. **Primary agent hard-coded mantigi:** `content_brief` iceren tablo adi aranir. Bu, content brief olmayan sistemlerde anlamsiz olabilir.

6. **brand_name bagimliligi:** Liste sayfasi ve bazi hook'lar `brand_name` alanina bagimli. Her eval sisteminde bu alan olmayabilir.

7. **Metadata field isimleri:** `target_prompt`, `query`, `primary_keyword` - bunlar content brief'e ozgu isimler.

8. **Agent renk haritasi:** `AGENT_COLORS` sabit objesi sadece mevcut 5 agent'i listeler. Yeni agent'lar icin fallback registry'den gelir ama haritada yoktur.

9. **Test yok:** Hicbir unit test veya integration test dosyasi yok.

10. **Migration yok:** Veritabani semalari kod reposunda tanimli degil. Schema degisiklikleri manual yapilir.

11. **Tip guvenligi:** Supabase sorgulari `as unknown as Record<string, unknown>` gibi tip zorlamalari kullaniyor. `supabase-gen-types` kullanilmiyor.

### UX

12. **Sadece koyu tema:** Light mode destegi yok.

13. **Responsive sinirli:** Mobil cihaz icin optimize edilmemis (ozellikle 3-panel detay sayfasi).

14. **Hata yonetimi:** Loading ve error state'leri minimal. Network hatalari icin retry=1.

---

## 19. Gelistirme Onerileri

### Oncelik 1: Performans Iyilestirmeleri

#### 1.1 Pagination Eklenmesi
**Sorun:** `useEvals` tum eval'leri tek seferde ceker.
**Oneri:** Server-side pagination ile sayfa basi 20-50 eval. Supabase `.range(from, to)` kullanilabilir. Infinite scroll veya sayfa numaralari ile UI entegrasyonu.

#### 1.2 N+1 Sorgu Optimizasyonu
**Sorun:** Her eval icin her agent tablosuna ayri sorgu.
**Oneri:** Supabase `rpc()` ile tek bir PostgreSQL fonksiyonu ile tum agent verilerini birlestirir. Veya eval list icin sadece primary agent verisini cek, detayli agent verileri detay sayfasinda yukle.

#### 1.3 daily_scores Tablosundan Yararlanma
**Sorun:** Heatmap ve suggestion frequency tum ham verileri taryor.
**Oneri:** Pre-aggregate tablolar olustur (orn: `criteria_daily_scores`, `suggestion_frequency_cache`). Backend job ile periyodik guncelle.

### Oncelik 2: Genellestirme (Multi-System Uyumluluk)

#### 2.1 Primary Agent Mantigi Genellestirme
**Sorun:** `content_brief` iceren tablo adi aramasi her sistem icin gecerli degil.
**Oneri:** `agent_registry` tablosuna `is_primary` boolean kolon ekle. Her system group'ta bir agent primary olarak isaretlensin. Mevcut `content_brief` arama mantigi fallback olarak kalaabilir.

```sql
ALTER TABLE agent_registry ADD COLUMN is_primary boolean DEFAULT false;
```

#### 2.2 Metadata Alan Konfigurasyonu
**Sorun:** `brand_name`, `target_prompt` gibi alanlar hard-coded.
**Oneri:** `agent_registry` tablosuna metadata konfigurasyonu ekle:

```sql
ALTER TABLE agent_registry ADD COLUMN metadata_config jsonb DEFAULT '{}';
-- Ornek: {"title_field": "project_name", "subtitle_field": "language"}
```

UI bu konfigurasyonu okuyarak ilgili metadata alanlarini gosterir.

#### 2.3 Agent Renk Haritasini Kaldir
**Sorun:** `AGENT_COLORS` sabit objesi sadece 5 agent icin tanimli.
**Oneri:** Bu haritayi tamamen kaldir. Zaten her agent'in rengi `agent_registry.color` alaninda tanimli. Tum referanslari registry'den gelen rengi kullanacak sekilde guncelle.

### Oncelik 3: Gelistirici Deneyimi

#### 3.1 Supabase Tip Olusturma
**Oneri:** `supabase gen types typescript` komutu ile veritabani tiplerini otomatik olustur. `as unknown as Record<string, unknown>` gibi tip zorlamalarindan kurtul.

#### 3.2 Test Altyapisi
**Oneri:**
- Vitest + Testing Library kurulumu
- Hook'lar icin unit testler (mock Supabase client)
- Component render testleri
- Normalizer fonksiyonlari icin pure function testleri

#### 3.3 Migration Dosyalari
**Oneri:** `supabase/migrations/` dizini olustur. Tum tablo olusturma, RLS politikalari ve seed data'yi migration olarak kaydet. Yeni bir ortam kurarken `supabase db push` ile schema uygula.

#### 3.4 Storybook / Component Playground
**Oneri:** Shared component'ler (GradeBadge, ScoreBar, Sparkline, etc.) icin Storybook kurulumu. Yeni eval sistemleri eklerken UI component'lerinin nasil gorunecegini hizlica onizleyebilme.

### Oncelik 4: Ozellik Genisletmeleri

#### 4.1 Real-Time Guncellemeler
**Oneri:** Supabase Realtime ile yeni eval eklendignide otomatik guncelleme. Mevcut 30 saniye polling'i kaldir, subscription modeline gec.

```typescript
supabase.channel('new-evals')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: primaryAgent.table_name },
    (payload) => queryClient.invalidateQueries(["evals", systemGroup])
  )
  .subscribe();
```

#### 4.2 Filtreleme ve Arama Genisletmesi
**Oneri:**
- Tarih araligi filtreleme
- Grade filtreleme (sadece A'lari goster, sadece F'leri goster)
- Agent bazinda filtreleme
- Kriter bazinda filtreleme (belirli kriterde dusuk skor alan eval'ler)

#### 4.3 Dashboard Kisisellestirme
**Oneri:** Dashboard widget'larinin siralamasini ve gorunurlugunu kullanici tercihine birak. localStorage veya DB'de kaydet.

#### 4.4 Light Mode
**Oneri:** CSS degiskenleri zaten katmanli yapida. `:root` altinda dark tema tanimli. `.light` sinifi icin ayri degerler ekleyerek light mode destegi saglanabilir.

#### 4.5 Webhook / API Entegrasyonu
**Oneri:** "Apply & Export" aksiyonunda sadece TXT indirmek yerine, webhook ile pipeline'a geri bildirim gonder. Prompt patch'leri otomatik uygulanabilir hale getir.

### Oncelik 5: Veri Butunlugu

#### 5.1 Eval ID Tutarliligi Kontrolu
**Oneri:** Bir eval ID'nin tum agent tablolarinda var oldugundan emin olan bir check mekanizmasi. Eksik agent verileri icin UI'da uyari goster.

#### 5.2 Schema Validation
**Oneri:** `eval_report` JSON'unun beklenen yapiya uygunlugunu kontrol eden bir Supabase check constraint veya edge function. Hatali JSON'larin DB'ye yazilmasini engelle.

```sql
-- Ornek check constraint
ALTER TABLE code_quality_evals
ADD CONSTRAINT valid_eval_report CHECK (
  eval_report ? 'overall' AND
  eval_report ? 'criteria_scores' AND
  (eval_report->'overall') ? 'weighted_total' AND
  (eval_report->'overall') ? 'grade'
);
```

---

## Ek: Hizli Referans Kartlari

### TypeScript Interface Haritas

```
AgentRegistryEntry ─── agent_registry tablosu
         │
         ├─── SystemGroup (system_group bazinda gruplama)
         │
         └─── table_name ──► Agent eval tablosu
                                 │
                                 ├─── EvalReport (jsonb kolon)
                                 │    ├─── EvalOverall
                                 │    │    ├─── grade, weighted_total
                                 │    │    ├─── top_strengths[], top_weaknesses[]
                                 │    │    └─── ImprovementSuggestion[]
                                 │    │         └─── PromptPatch
                                 │    ├─── CriteriaScore[]
                                 │    │    └─── InputOutputMapping
                                 │    └─── eval_metadata (serbest)
                                 │
                                 └─── Normalize ──► AgentEvalData
                                                    │
                                                    └─── NormalizedEvalRun
                                                         (tum agent'lar birlesik)
```

### Query Key → Hook → Sayfa Haritas

```
["agent-registry"]                    → useAgentRegistry    → TUM SAYFALAR
["evals", systemGroup]                → useEvals            → EvalListPage
["eval-detail", evalId, systemGroup]  → useEvalDetail       → EvalDetailPage, ComparisonPage
["brand-score-history", systemGroup]  → useBrandScoreHistory→ EvalListPage (sparkline)
["criteria-heatmap", agentKey]        → useCriteriaHeatmapData → EvalListPage (heatmap)
["suggestion-frequency", systemGroup] → useSuggestionFrequency → EvalListPage, EvalDetailPage
["new-eval-notifications", ...]       → useNewEvalNotifications → AppShell (sidebar badge)
```

---

*Bu dokuman, projenin 2026-04-06 tarihindeki durumunu yansitmaktadir.*
