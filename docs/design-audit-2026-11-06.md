# Design audit — StavbaFlow — 6. 11. 2026

## Druhý průchod před revizí

- Landing ukazuje přehled tří ukázkových zakázek hned vedle popisu produktu. Kroky od přijetí po změnu stavu jsou popsané jazykem zákazníka. Kalkulačka uvádí modelové předpoklady a připouští nulu zakázek navíc.
- Přihlášení používá jediný formulář se stejnou značkou jako landing. Zůstal vstup pro pozvánky a obnovu hesla.
- Majitelský přehled ukazuje stav zakázky i na telefonu. Filtr „K vyřízení“ vybere nové poptávky a nabídky. Názvy položek v menu popisují, kam odkaz vede.
- Revize modelem GPT-6 Astra proběhla před druhou úpravou. Kontrola chráněného dashboardu prochází skutečným formulářem přihlášení v lokálním prohlížeči s podvrženým Auth a databázovým API.

[Landing nad přehybem](design-audit-2026-11-06/landing-desktop-viewport.png) · [Přihlášení na počítači](design-audit-2026-11-06/login-desktop-viewport.png) · [Přihlášený dashboard na počítači](design-audit-2026-11-06/dashboard-signed-in-1440.png) · [Přihlášený dashboard na telefonu](design-audit-2026-11-06/dashboard-signed-in-390.png)

## Co se změnilo

- Sjednocené firemní, zaměstnanecké a platformní obrazovky: světlejší pracovní plochy, stejný modrý akcent, jednotné panely, navigace a ovládací prvky.
- Přehled zakázek v mobilním demu používá přepínání šesti stavů, funguje od šířky 320 px a při kreslení avatarů neposílá jména externí službě.
- Názvy zakázek se už nezkracují po dvou řádcích a částky se formátují českým zápisem tisíců.
- Přihlášení a obnova hesla mají čitelnější formulář, bezpečnou chybovou zprávu a správné stavy pro zadání nového hesla. Odeslání e-mailu se ověřovalo pouze přes lokálně podvrženou API odpověď.
- Veřejná landing stránka používá obsahově přesný nadpis, jasnou cenu Start, jednotné modré akce, konzistentní velikost nadpisů, čitelnější text a ikony u problémových karet, tarifů a FAQ.
- Hlavička se vejde na 320 px. Z aplikace byl odstraněn nepoužívaný požadavek na CSS Leafletu z unpkg.com; trasový test potvrdil, že aplikace neodesílá síťové požadavky mimo lokální testovací server.
- Zachovaný je text, že právní identita není dokončená. IČO, právní adresu ani VOP jsem nevymýšlel.

## Ověření

- `npm run test:design`: 15/15. Sada pokrývá landing, demo, přihlášení a obnovu, průchod syntetického majitele přes přihlášení na chráněný dashboard, zaměstnanecký a administrační náhled, ovládání mobilní tabule a 42 známých tras.
- `npm test`: 586/586.
- `npm run lint`: TypeScript a ESLint bez chyb.
- `npm run build`: produkční build prošel.
- Všechny browser testy běžely lokálně se syntetickým obsahem. Ověřená RPC pro načtení veřejného profilu firmy byla nahrazena lokální odpovědí; ostatní síťové požadavky byly blokované.

## Obrázky

- [Landing desktop, 1440 px](design-audit-2026-11-06/landing-1440.png)
- [Landing mobil, 390 px](design-audit-2026-11-06/landing-390.png)
- [Demo desktop, 1440 px](design-audit-2026-11-06/demo-desktop-1440.png)
- [Board mobil, 390 px](design-audit-2026-11-06/lead-board-mobile-390.png)
- [Přihlášení mobil, 390 px](design-audit-2026-11-06/login-mobile-390.png)
- [Zaměstnanecký přehled, syntetická data, 390 px](design-audit-2026-11-06/employee-mobile-390.png)
- [Admin firmy, syntetická data, 390 px](design-audit-2026-11-06/admin-companies-mobile-390.png)

## Meze přejímky

Neměl jsem přihlášené stagingové ani produkční účty, proto skutečné role, produkční e-maily, reset hesla přes doručený odkaz, platby ani živé změny dat nejsou touto vizuální přejímkou potvrzené. Admin a zaměstnanecký layout byl zobrazen v lokálních syntetických fixturech bez backendových zápisů. Produkce, staging, databáze a environment proměnné zůstaly nedotčené.

Taste `consistency.mjs` byl spuštěn nad landing stránkou. Hlásí také obecná pravidla, která jsou pro přihlášenou SPA a vícesekční produktovou stránku nevhodná (například očekávání, že se celý produkt vejde do prvního hero viewportu, nebo že každá stránka má nejvýše dvě akce). Tyto výstupy jsem nepovažoval za potvrzení či vyvrácení funkčnosti; přednost měla konkrétní vizuální kontrola screenshotů a ověřitelné Playwright podmínky. Několik obecně platných podnětů z kontroly — kontrast, velikost textu, konzistence akcí, mobilní navigace a velikost nadpisů — jsem opravil. Nezávislá kontrola také vedla k odstranění zkracování dlouhých názvů zakázek, správnému navázání ARIA tab panelů a trasovým kontrolám konkrétního obsahu.

## Stav před předáním

Změny jsou připravené k lidské revizi ve větvi `codex/stavbaflow-design-refresh`. Ověření probíhá lokálně. Vercel Preview je pro tuto větev vypnuté a commit používá `[skip ci]`, aby otevření PR nespustilo placené běhy GitHub Actions.
