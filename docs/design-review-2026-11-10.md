# Mobilní ovládání a focus — 2026-11-10

Ověřeno v lokálním syntetickém demu přes Chromium/Playwright. Stránky `/landing`, `/login`, `/demo` a `/demo/leads` měly při všech pěti šířkách `document.scrollWidth` shodný s šířkou viewportu.

| Stránka | 320 px | 390 px | 768 px | 1024 px | 1440 px |
| --- | ---: | ---: | ---: | ---: | ---: |
| Landing | 320 | 390 | 768 | 1024 | 1440 |
| Login | 320 | 390 | 768 | 1024 | 1440 |
| Demo přehled | 320 | 390 | 768 | 1024 | 1440 |
| Demo zakázky | 320 | 390 | 768 | 1024 | 1440 |

Čísla v tabulce jsou naměřené šířky dokumentu v pixelech. Vodorovný posuv zůstává uvnitř lišty záložek; stránka jako celek se neposouvá do strany.

## Záložky dema

| Šířka | Snímek |
| --- | --- |
| 320 px | [Demo zakázky](design-review-2026-11-10/-demo-leads-320.png) |
| 390 px | [Demo zakázky](design-review-2026-11-10/-demo-leads-390.png) · [Lišta posunutá doprava](design-review-2026-11-10/demo-tabs-390-scrolled.png) |
| 768 px | [Demo zakázky](design-review-2026-11-10/-demo-leads-768.png) |
| 1024 px | [Demo zakázky](design-review-2026-11-10/-demo-leads-1024.png) |
| 1440 px | [Demo zakázky](design-review-2026-11-10/-demo-leads-1440.png) |

Při 320 a 390 px má každá záložka nejméně 44 px na výšku. Test ověřil skryté záložky za pravým přechodem, vodorovný posuv až na konec a změnu přechodu na levý okraj. Šipkami lze dál měnit aktivní záložku.

## Klávesové ovládání

Playwright prošel klávesou Tab všechny dosažitelné odkazy a tlačítka: 14 na landingu, 3 na loginu a 5 v demu zakázek. Každý zaměřený prvek měl `:focus-visible` a obrys široký alespoň 2 px. Prohlédnuté snímky s viditelným obrysem:

- [Landing, 390 px](design-review-2026-11-10/focus--landing-390.png)
- [Login, 390 px](design-review-2026-11-10/focus--login-390.png)
- [Demo zakázky, 390 px](design-review-2026-11-10/focus--demo-leads-390.png)

Další referenční snímky: [landing 390](design-review-2026-11-10/-landing-390.png), [landing 1440](design-review-2026-11-10/-landing-1440.png), [login 390](design-review-2026-11-10/-login-390.png), [login 1440](design-review-2026-11-10/-login-1440.png), [demo přehled 390](design-review-2026-11-10/-demo-390.png), [demo přehled 1440](design-review-2026-11-10/-demo-1440.png).

Ověření: `npm test` (610/610), `npm run lint`, `npm run build` a `npm run test:design` (18/18).
