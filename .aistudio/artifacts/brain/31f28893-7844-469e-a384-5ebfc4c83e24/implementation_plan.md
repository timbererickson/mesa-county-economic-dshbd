# Residential Permit Subtype Keyword Scoping

Enforces strict keyword-based scoping for residential development permits, restricting all residential data across dashboard metrics, charts, KPI summary cards, turnaround analytics, and subtype selectors exclusively to subtypes matching `remodel`, `family`, `solar`, `home`, or `residential`.

### User Review & Critical Decisions

> [!IMPORTANT]
> The residential permit scope has been confirmed via user interview and will be applied uniformly across the entire application lifecycle.

- **Confirmed Decision 1 (Scope Level)**: Applied across all dashboard metrics, charts, turnaround calculations, and subtype filter lists. Non-matching residential permits (e.g. pure reroofing, window/door replacements, mechanical equipment) are completely excluded from residential totals and lists.
- **Confirmed Decision 2 (Target Field)**: Subtype filtering inspects the **permit subtype name only** using case-insensitive keyword matching (`remodel`, `family`, `solar`, `home`, `residential`). Commercial permits remain unaffected.
- **Confirmed Decision 3 (Transparency & UI Indicators)**: A clear scope badge is displayed in the filter bar when Residential or All permits are active, informing stakeholders that residential analytics are scoped to core construction and renovation categories.

---

### 1. Overview & Core Concept

- **What It Does**: The Mesa County Development Metrics Dashboard will restrict residential permit data ingestion and analysis to five core development categories: `remodel`, `family`, `solar`, `home`, and `residential`. Routine non-structural maintenance permits (such as standalone reroofing, utility replacements, and simple window swaps) will be filtered out, focusing analytics squarely on major residential building, addition, and renewable energy investments.
- **Target Audience / Persona**: Development directors, county commissioners, and urban planners evaluating housing growth, single/multi-family construction, residential solar adoption, and major residential remodels.
- **Key Value**: Eliminates distortion from high-volume, low-complexity maintenance permits (such as 8,700+ routine reroofing permits), delivering accurate turnaround times, realistic median valuations, and relevant subtype breakdowns for true residential building activity.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Landing & Initial Load**: Upon loading the dashboard, residential permit aggregates (valuation, volume, average days to issue) instantly reflect only the qualifying subtypes.
  2. **Subtype Selector Dropdown**: Opening the Subtype Filter modal or dropdown displays only the qualifying residential subtypes (e.g., `Single Family`, `Electrical Solar`, `Residential Remodel/ Addition/ Alteration`, `Manufactured Home`, `Two Family`, `Interior Remodel`), keeping the list clean and purposeful.
  3. **Visual Scope Indicator**: A subtle, elegant filter chip (`Scoped: Remodel • Family • Solar • Home • Residential`) appears alongside the Record Type filter, providing immediate confirmation of the active criteria.
  4. **Commercial Toggle**: Switching between "Commercial", "Residential", and "All" smoothly adapts the metrics. Commercial permits continue to show all commercial classifications.
- **Visual Identity & Theme**:
  - Consistent Retool/Executive Navy aesthetic (`#023e52` teal primary, `#182029` dark card panels, `#2c3746` borders, `#38bdf8` cyan accents).
  - Clean badge styling with cyan highlights to indicate active scoping rules.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Upstream Filter in Permit Ingestion Pipeline**
  - *Chosen Approach*: Implement `isQualifyingResidentialSubtype` inside `src/backend/getPermitData.ts` during record parsing and dataset aggregation.
  - *Why*: Guarantees 100% consistency across all downstream consumers: summary cards, trend charts (2025 vs 2026), major projects table, turnaround percentiles, and subtype dropdown counts without risk of desynchronization.
  - *Alternatives Considered*: Filtering only in the UI presentation layer (`DevMetricsDashboard.tsx`). Rejected because raw totals, pre-calculated quarters, and subtype lists would risk leaking un-scoped records or showing mismatched counts.

- **Decision 2: Subtype Substring Matching Logic**
  - *Chosen Approach*: Case-insensitive pattern matching:
    ```typescript
    const RESIDENTIAL_SUBTYPE_KEYWORDS = ['remodel', 'family', 'solar', 'home', 'residential'] as const;
    export function isQualifyingResidentialSubtype(subtype: string | null | undefined): boolean {
      if (!subtype) return false;
      const normalized = subtype.toLowerCase();
      return RESIDENTIAL_SUBTYPE_KEYWORDS.some(kw => normalized.includes(kw));
    }
    ```
  - *Why*: Accommodates variations across historical and GIS feeds (e.g., `Single Family Dwelling`, `Electrical Solar`, `Residential Garage/Shop`, `Manufactured Home`, `Interior Remodel`).

- **Decision 3: Preserving Commercial Permit Integrity**
  - *Chosen Approach*: Scoping rule strictly evaluates `recordType === 'Residential'`. If `recordType === 'Commercial'`, the permit is retained according to commercial permitting rules.
  - *Why*: Adheres precisely to user specification without altering commercial development metrics.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│               Data Sources (CSV / ArcGIS REST)                  │
│               /data/permit-valuations2.csv                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 src/backend/getPermitData.ts                    │
│                                                                 │
│  parseDateVal()  ──►  robustParseLine()  ──►  Record Extraction │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Keyword Scoping Gate:                                     │  │
│  │ if (recordType === 'Residential') {                       │  │
│  │   keep = isQualifyingResidentialSubtype(recordSubtype);   │  │
│  │ }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                │
│       Filtered Records & Scoped Subtype Set Generated           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/pages/DevMetricsDashboard.tsx                  │
│                                                                 │
│  • KPI Metric Cards (Total Value, Permits Issued, Avg Turnaround)│
│  • Permit Volume & Value Comparison Charts (2025 vs 2026)       │
│  • Major Projects Table (Valuation >= $500K)                    │
│  • Turnaround Analytics (Calendar Days vs Elapsed Hours)        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│             src/components/DevelopmentFilter.tsx                │
│                                                                 │
│  • Record Type: [All | Commercial | Residential]                │
│  • Subtype Dropdown (Populated strictly with qualifying list)   │
│  • Visual Scope Badge ("Scoped: Remodel, Family, Solar, ...")   │
└─────────────────────────────────────────────────────────────────┘
```

#### State & Component Mapping

| Component | Responsibility | Keyword Scoping Impact |
| :--- | :--- | :--- |
| `getPermitData.ts` | CSV parsing & cache management | Filters raw records before creating `PermitFetchResult`; populates `availableSubtypes` with only qualifying subtypes. |
| `DevMetricsDashboard.tsx` | Core view & calculations | `rawPermits`, `boundsPermits`, and `subtypeOptions` automatically reflect the filtered residential universe. |
| `DevelopmentFilter.tsx` | User controls | Subtype menu only lists matching subtypes; displays visual indicator chip for active keyword scope. |
| `PermitSubtypeFilter.tsx` | Multiselect popover | "Select All" and individual toggles operate only over the curated qualifying subtype list. |
