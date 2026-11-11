# Vizuální brána před vydáním

Playwright projekt `design` porovnává uložené snímky stránek landing, demo, login a přihlášeného owner dashboardu při 390 a 1440 px. Baseline jsou v `tests/design-system.spec.ts-snapshots/`. Rozdíl smí zasáhnout nejvýše 1 % pixelů každého snímku (`maxDiffPixelRatio: 0.01`). Test běží nad lokálním syntetickým prostředím bez produkčních dat.

Baseline vycházejí z aktuální větve `main`. Po jejich vytvoření prošly dva samostatné běhy porovnání bez `--update-snapshots` (2/2 a 2/2). Celý `npm run test:design` prošel 16/16; `npm test` prošel 610/610, `npm run lint` a `npm run build` prošly.

Workflow `.github/workflows/design-visual.yml` spouští projekt `design` při pull requestech na GitHub-hosted Windows runneru. [Dřívější CI běh 43029508834](https://github.com/svobonek-lab/dashboard/actions/runs/43029508834) prošel 20/20 na předchozí designové větvi. CI běh pro tento samostatný PR proti `main` bude zaznamenán po dokončení.

Repozitář je veřejný a ochrana `main` nyní vyžaduje check `verify`. Až bude designový workflow součástí `main`, je třeba přidat check `design` od aplikace GitHub Actions jako další povinný status při zachování stávajícího `verify` a přísné aktuálnosti větve.
