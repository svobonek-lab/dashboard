# Typografie a design tokeny — vizuální přejímka

Zdroj: `main` na commitu `1afc95b93fc4e25adfa4ccfb9389a5d953f738a3`. Screenshoty vznikly v lokálním Playwrightu se syntetickou přihlášenou owner session; neobsahují produkční data.

| Stránka | 390 px | 1440 px |
|---|---|---|
| Landing | [landing-390.png](landing-390.png) | [landing-1440.png](landing-1440.png) |
| Veřejné demo | [demo-390.png](demo-390.png) | [demo-1440.png](demo-1440.png) |
| Owner dashboard | [owner-dashboard-390.png](owner-dashboard-390.png) | [owner-dashboard-1440.png](owner-dashboard-1440.png) |

IBM Plex Sans WOFF2 je uložen v `public/fonts/` z balíčku `@ibm/plex-sans@1.1.0`; přiložená licence je `public/fonts/IBM-Plex-OFL.txt`. Browser test kontroluje vypočtené fonty viditelného textu i to, že se WOFF2 načítá pouze z `/fonts/` na stejné doméně.

Barvy odpovídají kapitole 5 v `StavbaFlow-audit-2026-11-10 (1).pdf`: paper `#F4F3EF`, surface `#FFFFFF`, text `#1C2430`, muted `#5C6670`, line `#D8DCE0`, accent `#2563EB`, warning `#B45309`. Soubor PDF je podklad mimo repozitář.

Vizuální přejímka zahrnuje i odstranění emoji v prioritě, prostředních teček mimo informační banner dema, šipek z tlačítek, verzálek s prostrkáním a dekorativních gradientů. Po kontrole screenshotu byl sjednocen kontrast desktopového owner sidebaru se společnými tokeny.

Lokální ověření: `npm test` 610/610, `npm run lint` bez chyb, `npm run build` prošel, `npm run test:design` 16/16. Po úpravě kontrastu prošel cílený Playwright test přihlášeného owner dashboardu 1/1 a jeho oba screenshoty byly obnoveny. Žádné produkční údaje ani vzdálené zápisy nebyly použity.
