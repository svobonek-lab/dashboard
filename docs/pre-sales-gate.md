# Vizuální brána před vydáním

Playwright projekt `design` porovnává uložené snímky stránek landing, demo, login a přihlášeného owner dashboardu při 390 a 1440 px. Baseline jsou v `tests/design-system.spec.ts-snapshots/`. Rozdíl smí zasáhnout nejvýše 1 % pixelů každého snímku (`maxDiffPixelRatio: 0.01`). Test běží nad lokálním syntetickým prostředím bez produkčních dat.

Místně proběhlo vytvoření baseline a následně dva samostatné úspěšné běhy vizuálních porovnání bez `--update-snapshots` (2/2 a 2/2). Celý `npm run test:design` prošel 20/20; `npm test` prošel 610/610, `npm run lint` a `npm run build` prošly.

Workflow `.github/workflows/design-visual.yml` spouští projekt `design` při pull requestech na GitHub-hosted Windows runneru. [První CI běh 43029508834](https://github.com/svobonek-lab/dashboard/actions/runs/43029508834) pro commit `3a6cd0d28fd5a862dff2464a1ee3aa0583ac154e` skončil úspěšně: 20/20 testů, včetně všech osmi baseline. Následná změna tohoto dokumentu nemění testovaný kód ani snímky.

**Omezení povinného checku:** GitHub API pro ochranu větve i rulesets vrací u tohoto soukromého repozitáře HTTP 403 s požadavkem na GitHub Pro nebo veřejný repozitář. Job tedy může selhat a upozornit recenzenta, ale GitHub nyní nedokáže zablokovat merge povinným statusem. Vlastník repozitáře musí po zpřístupnění ochrany větve nastavit `design-visual / design` jako required status check.
