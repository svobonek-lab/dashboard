# Jednotné zaoblení a hloubka — vizuální přejímka

Srovnání vychází ze stejného lokálního syntetického Playwright scénáře jako [předchozí přejímka](../design-audit-2026-11-10/README.md). V obou sadách mají landing, veřejné demo a přihlášený owner dashboard shodnou šířku 390 nebo 1440 px. Žádná sada nepoužívá zákaznická data.

| Obrazovka | 390 px před | 390 px po | 1440 px před | 1440 px po |
|---|---|---|---|---|
| Landing | [před](../design-audit-2026-11-10/landing-390.png) | [po](landing-390.png) | [před](../design-audit-2026-11-10/landing-1440.png) | [po](landing-1440.png) |
| Veřejné demo | [před](../design-audit-2026-11-10/demo-390.png) | [po](demo-390.png) | [před](../design-audit-2026-11-10/demo-1440.png) | [po](demo-1440.png) |
| Owner dashboard | [před](../design-audit-2026-11-10/owner-dashboard-390.png) | [po](owner-dashboard-390.png) | [před](../design-audit-2026-11-10/owner-dashboard-1440.png) | [po](owner-dashboard-1440.png) |

Kontrola: ovládací prvky používají 8 px, panely 12 px a dialogy 16 px. Stíny v `src/` byly odstraněny; plochy odděluje hranice 1 px nebo prostor. Vnořené karty v Kanbanu, prodejní pipeline, detailu zakázky, nastavení, importu a konektoru byly nahrazeny oddělovači. Kulaté stavové body a pilulky zůstávají funkčními značkami.

Vizuální rozdíl jsem zkontroloval na všech šesti výsledných snímcích. Landing je o 36 px kratší na telefonu a o 13 px na desktopu po odstranění vnitřního rámečku kalkulačky. Demo je pixelově beze změny; owner dashboard má stejné rozměry a jen drobné změny okrajů. Na 390 px ani 1440 px nevidím přetečení nebo ztracený obsah.

Lokální ověření finálního stavu: `npm test` 610/610, `npm run lint`, `npm run build` a `npm run test:design` 16/16 prošly. Playwright ověřil přetečení viewportu, dostupnost obsahu a průchod hlavními syntetickými obrazovkami.
