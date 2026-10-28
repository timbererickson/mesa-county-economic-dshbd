# FY 2026 Sep YTD Fiscal Data Integration

Update the dashboard's Fiscal Activity Signals with verified receipts through September 2026, enabling Q3 analysis and year-over-year comparisons for three full quarters.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user in Phase 1:
> - **Quarter Filters**: All quarters (Q1–Q4) remain visible in the toolbar. Q1, Q2, and Q3 are now fully active for 2026, while Q4 is marked as "Pending" and disabled.
> - **Comparative Visualizations**: Grouped bar charts will display Q1, Q2, and Q3 side-by-side (2025 vs 2026) to show the full YTD performance trajectory.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the previously inaccurate Jan–Jun 2026 data with the comprehensive Sep 2026 YTD receipts ($71.35M total). It enables detailed tracking of Property, Sales, and Use Tax collections across nine months of 2026 compared to 2025.
- **Target Audience**: County financial decision-makers tracking revenue performance through the third quarter.
- **Key Value**: Accurate, three-quarter YoY benchmarking (Jan–Sep) with verified $0.00 variance from the official general ledger report.

---

## 2. User Experience & Visual Design

- **Fiscal Toolbar**:
  - `Q3` button is now enabled for 2026 and YoY modes.
  - `Q4` remains visible but disabled with a "Pending" label.
  - "All (YTD)" filter now aggregates Jan–Sep for 2026.
- **KPI Summary Cards**:
  - Displays current 2026 totals ($38.43M Sales, $30.53M Property, $2.39M Use).
  - YoY deltas update to compare the first three quarters of 2026 against the first three quarters of 2025.
- **Grouped Bar Charts**:
  - Added Q3 2026 bars ($13.16M total) alongside Q1 and Q2.
  - Maintains distinctive color tokens for 2025 (muted contrast) and 2026 (vibrant teal/pink).
- **Monthly Drilldown Table**:
  - Expanded to include July, August, and September 2026 line items.
  - Retains accounting adjustment visibility (e.g., negative Use Tax in March).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Data Integrity & Overwriting**:
  - *Chosen Approach*: Directly overwrite `src/data/fiscalData2026.ts` with the Sep YTD values.
  - *Why*: Ensures the "inaccurate" source is completely purged from the application logic as requested.
- **Decision 2: Q3 Sep 2026 Representation**:
  - *Chosen Approach*: Explicitly include the small September receipt ($1,434.30) to maintain audit fidelity, even though it likely represents a partial reporting cycle.
- **Decision 3: Chart Scope**:
  - *Chosen Approach*: Extend the grouped comparison to Q3 while keeping Q4 empty for 2026.
  - *Why*: Provides the most comprehensive performance view allowed by the current reporting period.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│     MESA Revenue by Period - Sep 2026 YTD CSV (Jan-Sep)         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     src/data/fiscalData2026.ts                  │
│  - Property Tax: Q1 $12.63M | Q2 $17.13M | Q3 $0.77M | YTD $30.53M
│  - Sales Tax:    Q1 $10.43M | Q2 $16.38M | Q3 $11.61M| YTD $38.43M
│  - Use Tax:      Q1 $0.59M  | Q2 $1.03M  | Q3 $0.77M | YTD $2.39M
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       src/ui/FiscalSection.tsx                  │
│  - Year State: 2025 | 2026 | yoy                                │
│  - Q3 active for 2026; Q4 disabled.                             │
│  - Charts & Table updated for Jan-Sep coverage.                 │
└─────────────────────────────────────────────────────────────────┘
```

### Execution Steps
1.  **Data Refresh**: Write new `src/data/fiscalData2026.ts` with the Sep 2026 YTD figures.
2.  **UI Logic**: Update `FiscalSection.tsx` to handle the Q3 period for 2026.
3.  **Visualization**: Update `quarterlyComparisonChartData` to ensure Q3 2026 values are mapped correctly.
4.  **Verification**: Confirm compilation and check YoY delta accuracy.
