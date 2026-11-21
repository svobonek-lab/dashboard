# Changelog tvrzení na landingu

## 30denní Managed Cloud pilot s osobním zřízením

Veřejná nabídka používá jediný kontakt k domluvě pilotu. Cena 1 990 Kč za 30 dní zahrnuje osobní zřízení a případnou DPH. Provozovatel uvede použitý daňový režim v nabídce před objednáním. Pilot je pro jednu firmu a pět uživatelů včetně majitele, bez příloh a automatického prodloužení. Kalkulačka uvádí předpoklady pro 30 dní a ukáže návratnost po zadání nákladů. Hero a demo zobrazují stejnou syntetickou firmu a stejné poptávky.

| Funkce | Ověřený stav a dopad na nabídku |
|---|---|
| CSV | [Přejímka](prompt-acceptance-status.md) dokládá import a úklid syntetických řádků na stagingu. Produkční přejímka je otevřená. Import není součástí nabídky. |
| AI e-mail | [Produkční přehled](production-release-readiness-2026-11-08.md) uvádí otevřené podmínky zpracování. AI příjem e-mailu není součástí nabídky. |
| BYODB | [Pracovní plán](../WORKPLAN.md) uvádí otevřené přejímky konektoru a onboarding. BYODB není součástí nabídky spravovaného cloudu. |
| Poznámky a soubory | [Přejímka na stagingu](lead-attachments-staging-acceptance.md) a návrh produkčního vydání nedokládají aktivaci v produkci. Nabídka označuje obě funkce jako čekající na produkční přejímku. |
| Historie změn | [Přejímka zápisů](reviews/2026-11-21-lead-write-contract.md#staging-execution-record) dokládá historii na stagingu. Nabídka ji označuje jako čekající na produkční přejímku a demo ji nezobrazuje. |

## Předchozí změny

| Původní tvrzení | Upravené tvrzení | Důvod |
|---|---|---|
| Navigace majitele a příkazová paleta nabízely „Prodejní cockpit“ se samostatným SalesWorkspace playbookem. | Položka i route byly odstraněny v Promptu 1; tato obrazovka už není prezentovaná jako funkce pilotního účtu. | SalesWorkspace nebyl součástí ověřených provozních tras pilotu. |
| Klientský portál a automatické follow-upy byly uvedené v roadmapě bez konkrétního stavu. | „Připravujeme, nejsou součástí prvního pilotu.“ | Tyto funkce jsou v `PILOT_UNAVAILABLE_ROUTES` a nejsou součástí nabídky pilotu. |
| Výstup kalkulačky popisoval modelové předpoklady, ale neoznačoval celý výpočet jako ilustrativní. | „Ilustrativní výpočet s orientačními hodnotami“ a výslovné upozornění, že nejde o příslib výsledku. | Kalkulačka používá pevné modelové předpoklady a uživatelský odhad; nejde o výsledek ověřený na zákaznických datech. |
| Marketingové texty označovaly pilotní tok a funkce za ověřené ve stagingu. | „Scénář pilotu“ a „funkce plánované pro první nasazení“; live staging acceptance proveďte před zákaznickými daty. | Nejnovější owner-only Playwright průchod ověřil Auth, ale skončil `NO_ACTIVE_MEMBERSHIP`; UI BYODB nebylo dosaženo. |
| Badge na přihlašovací obrazovce říkal „Ověřený firemní pilot“. | „Firemní pilot StavbaFlow“. | Owner účet v aktuálním staging acceptance nemá aktivní členství firmy. |
| Landing ukazoval neověřené pilotní kroky jako odškrtnuté a některé vypisované moduly nebyly označené jako vyřazené. | Kroky jsou označené „K ověření“ / „Ověřit“; kalendář, analytika, cenové nabídky, dokumenty, komunikace a klientský portál jsou výslovně mimo první pilot. | Stagingové přijetí kroků 1–5 zatím není doložené. |
| Právní footer mohl ukazovat veřejnou kontaktní adresu vedle názvu, aniž by zřetelně ukazoval chybějící právní údaje. | Viditelný blok označuje IČO, právní adresu a VOP jako nedoplněné, dokud nejsou explicitní a VOP není schválené pomocí `VITE_COMPANY_VOP_APPROVED=true`. | Skutečné IČO, sídlo a schválený text VOP musí dodat a ověřit provozovatel. |

| Ceník zobrazoval Founding Pilot jako hlavní nabídku za 7 900 Kč a tři karty popisovaly scénáře místo tarifů. | Start 1 990 Kč/měsíc do 5 zaměstnanců, Růst 2 990 Kč/měsíc do 15 a Profi 4 990 Kč/měsíc bez limitu; Founding Pilot zůstává sekundární nabídka bez částky, cenu potvrzuje nabídka. | Ceny a kapacitu zadal provozovatel; Profi konektor je označen jako připravovaný na únor 2027 a Profi nemá checkout CTA. |

Kalkulačka používá tříměsíční cenu Startu pouze jako modelovaný náklad a výsledek zůstává výslovně ilustrativní, nikoli příslib výnosu. Start a Růst vedou na registraci s výběrem tarifu. Funkční Stripe platba závisí na odpovídajících serverových Preview cenách a schválené databázové smlouvě; Production proměnné nebyly změněny. Změněné copy nepřidává reference ani výsledky. Founding Pilot nemá v této nabídce pevnou částku; produkční stránka se změní až po schválení a nasazení draft PR.
