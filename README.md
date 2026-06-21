# INF8808E Project — Team 10

This D3 website explores how developer roles and work contexts relate to AI-tool use,
trust, frustration, requests for human help, and AI-agent use. It is based on the
[2025 Stack Overflow Developer Survey](https://survey.stackoverflow.co).

## Run the project

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Vite serves the site at `http://localhost:5173/` by default.

Create and inspect a production build with:

```bash
npm run build
npm run preview
```

## What is implemented

The site contains six linked visualizations:

1. AI adoption compared with trust or confidence on complex tasks
2. AI adoption composition across profiles and work contexts
3. Cohort differences from the overall survey baseline
4. AI frustrations by adoption group
5. Situations where developers still seek human help
6. AI-agent use and reported changes to work

The global controls switch between roles and industries, set the minimum valid sample
size, and reset the page. Cohorts pinned in V1, V2, V3, or V6 remain highlighted in the
other compatible charts.

## Project structure

- `src/main.js` loads the analysis files and coordinates the page state.
- `src/components/` contains the global controls, section navigation, and pinned-cohort panel.
- `src/visualizations/` contains one D3 module per visualization plus shared chart utilities.
- `src/styles/style.css` contains the responsive page and chart styling.
- `public/data/analysis/` contains the compact CSV summaries used by the browser.
- `scripts/build_analysis_data.py` regenerates those summaries from the local survey subset.

The raw 49,191-row subset is intentionally excluded from Git. The website serves only
the aggregates required by the visualizations, including valid and missing response
counts used in tooltips.

To regenerate the tracked analysis files:

```bash
python scripts/build_analysis_data.py \
  --input data/results.csv \
  --out public/data/analysis
```

## Deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` builds the site and deploys
`dist/` to GitHub Pages whenever `main` is updated. The production base path is configured
in `vite.config.js` for this repository.

## Interpretation

All percentages are descriptive. Missing responses are excluded independently for each
measure, and multi-select questions can total more than 100%. The visualizations show
associations in this survey sample; they do not establish causal effects.
