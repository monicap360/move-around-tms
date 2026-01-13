# MOVEAROUND TMS — MULTI-VERTICAL IMPLEMENTATION

## Status: Foundation Complete ✅

### Completed Components

1. **Vertical Definition System** (`lib/verticals.ts`)
   - ✅ 4 vertical types defined
   - ✅ Profile configurations per vertical
   - ✅ Baseline window configuration
   - ✅ Intelligence emphasis settings
   - ✅ UI default settings

2. **Database Schema** (`db/migrations/052_vertical_system.sql`)
   - ✅ `vertical_type` added to `organizations` table
   - ✅ Optional `vertical_override` on `sites` table (if exists)
   - ✅ Indexes and constraints added

### Implementation Order (Remaining)

**SECTION 3: Baseline Adaptation**
- Create `lib/intelligence/baselines.ts` (shared baseline engine)
- Update confidence scoring to use vertical-specific baseline windows
- Update anomaly detection to respect vertical emphasis

**SECTION 4: Vertical-Specific Intelligence Tuning**
- Update confidence scorer to use vertical emphasis fields
- Update exception queue to prioritize based on vertical
- Update evidence packets to include vertical context

**SECTION 5: HQ Dashboards**
- Update analytics routes to respect vertical_type
- Add vertical-specific metric filtering
- Update dashboard components to show vertical-appropriate metrics

**SECTION 6: Demo Organizations**
- Create seed script for demo orgs per vertical
- Configure each demo org with appropriate vertical_type

### Key Design Principles (DO NOT VIOLATE)

1. **One shared data model** — no forks
2. **Vertical logic in profiles** — not in tables
3. **Intelligence adapts via baselines** — not rules
4. **Same UI components** — different defaults
5. **Identical monetization** — same pricing for all

### Vertical Types Supported

1. `construction_hauling` — Default (30-60 day baselines)
2. `aggregates_quarry` — 60-90 day baselines
3. `waste_recycling` — 14-30 day baselines + route baselines
4. `ready_mix` — Same-day + weekly baselines

### Next Steps

See TODO list for remaining implementation tasks.
