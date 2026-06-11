# INF8808E Project Team 10

Interactive D3 website for exploring how developer profiles and work contexts influence AI tool adoption and perceptions in the Stack Overflow Developer Survey 2025.

## Current Setup

- Vite app with D3 visualizations.
- GitHub Pages deployment workflow in `.github/workflows/deploy.yml`.
- Production Vite base path configured for `R3ivil/inf8808E-project-team10`.
- Chart-ready analysis summaries served from `public/data/analysis/`.
- Validated visualization plan in `viz-plan.json`.
- Implemented D3 modules in `src/visualizations/`.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

Local development URL:

```text
http://localhost:5173/
```

Production preview URL after `npm run build && npm run preview`:

```text
http://localhost:4173/inf8808E-project-team10/
```

## Data

The app uses compact chart-ready summaries:

- `public/data/analysis/role_metrics.csv`
- `public/data/analysis/role_adoption_composition.csv`
- `public/data/analysis/yearscode_cohort_stats.csv`
- `public/data/analysis/age_cohort_stats.csv`
- `public/data/analysis/agent_readiness_by_role.csv`
- `public/data/analysis/agent_readiness_by_industry.csv`
- `public/data/analysis/frustrations_by_adoption.csv`
- `public/data/analysis/aihuman_by_trust.csv`
- `public/data/analysis/aihuman_by_complex.csv`
- `public/data/analysis/aihuman_by_adoption.csv`
- `public/data/analysis/industry_metrics.csv`
- `public/data/analysis/industry_cohort_stats.csv`
- `public/data/analysis/icorpm_adoption_composition.csv`

The source subset was prepared from the Stack Overflow Developer Survey 2025 using the variables selected in the Team 10 mockup. The raw 49,191-row subset is intentionally not served by the website because the current visualizations use pre-aggregated denominators and rates.

To regenerate the chart-ready CSVs from the local raw subset:

```bash
python3 scripts/build_analysis_data.py \
  --input ../data/stackoverflow_2025_project_subset.csv \
  --out public/data/analysis
```

The original exploratory notebook from the data-analysis handoff is archived outside this repo at `../data/selected_files_20260611T153613.zip`. The script above is the cleaned reproducible version used for the final website CSVs.

## Visualization Plan

The initial plan follows the local INF8808 D3 visualization agent workflow and maps to the six mockup sections:

1. Adoption-trust gap by cohort
2. AI adoption composition across profiles and work contexts
3. Perception differences from the survey baseline
4. AI frustrations by adoption group
5. Human-help situations by trust group
6. AI-agent readiness by cohort

The first implementation uses the data-analysis findings to emphasize role, experience, manager/contributor status, frustration maturity, human-help situations, and AI-agent readiness.
