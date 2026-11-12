# Vizuální brána před vydáním

Playwright projekt `design` porovnává uložené snímky stránek landing, demo, login a přihlášeného owner dashboardu při 390 a 1440 px. Baseline jsou v `tests/design-system.spec.ts-snapshots/`. Rozdíl smí zasáhnout nejvýše 1 % pixelů každého snímku (`maxDiffPixelRatio: 0.01`). Test běží nad lokálním syntetickým prostředím bez produkčních dat.

Baseline vycházejí z aktuální větve `main`. Po jejich vytvoření prošly dva samostatné běhy porovnání bez `--update-snapshots` (2/2 a 2/2). Celý `npm run test:design` prošel 16/16; `npm test` prošel 610/610, `npm run lint` a `npm run build` prošly.

Workflow `.github/workflows/design-visual.yml` spouští projekt `design` při pull requestech na GitHub-hosted Windows runneru. [CI běh 43033259490](https://github.com/svobonek-lab/dashboard/actions/runs/43033259490) pro commit `25bc8ac79dbcb4669169f840f82e3c750ab8b72b` prošel 16/16 v PR #188 proti `main`, včetně všech osmi baseline. Následná úprava tohoto dokumentu nemění testovaný kód ani snímky.

Ochrana `main` nyní vyžaduje `verify` i `design` od GitHub Actions, přísnou aktuálnost větve a jednu schvalující revizi. [Běh `verify` 43033259590](https://github.com/svobonek-lab/dashboard/actions/runs/43033259590) selhal na existujícím nesouladu historických migrací se staging snapshotem; stejný kontrolní skript selhává i místně a předchozí běhy na `main` byly také neúspěšné. PR #188 nemění migrace ani snapshot a kontrola nebyla oslabena. Před sloučením je potřeba tuto nezávislou překážku vyřešit samostatně.
