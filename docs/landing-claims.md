# Changelog tvrzení na landingu

| Původní tvrzení | Upravené tvrzení | Důvod |
|---|---|---|
| Navigace majitele a příkazová paleta nabízely „Prodejní cockpit“ se samostatným SalesWorkspace playbookem. | Položka i route byly odstraněny v Promptu 1; tato obrazovka už není prezentovaná jako funkce pilotního účtu. | SalesWorkspace nebyl součástí ověřených provozních tras pilotu. |
| Klientský portál a automatické follow-upy byly uvedené v roadmapě bez konkrétního stavu. | „Připravujeme, nejsou součástí prvního pilotu.“ | Tyto funkce jsou v `PILOT_UNAVAILABLE_ROUTES` a nejsou součástí nabídky pilotu. |
| Výstup kalkulačky popisoval modelové předpoklady, ale neoznačoval celý výpočet jako ilustrativní. | „Ilustrativní výpočet s orientačními hodnotami“ a výslovné upozornění, že nejde o příslib výsledku. | Kalkulačka používá pevné modelové předpoklady a uživatelský odhad; nejde o výsledek ověřený na zákaznických datech. |
| Marketingové texty označovaly pilotní tok a funkce za ověřené ve stagingu. | „Scénář pilotu“ a „funkce plánované pro první nasazení“; live staging acceptance proveďte před zákaznickými daty. | Nejnovější owner-only Playwright průchod ověřil Auth, ale skončil `NO_ACTIVE_MEMBERSHIP`; UI BYODB nebylo dosaženo. |
| Badge na přihlašovací obrazovce říkal „Ověřený firemní pilot“. | „Firemní pilot StavbaFlow“. | Owner účet v aktuálním staging acceptance nemá aktivní členství firmy. |
| Landing ukazoval neověřené pilotní kroky jako odškrtnuté a některé vypisované moduly nebyly označené jako vyřazené. | Kroky jsou označené „K ověření“ / „Ověřit“; kalendář, analytika, cenové nabídky, dokumenty, komunikace a klientský portál jsou výslovně mimo první pilot. | Stagingové přijetí kroků 1–5 zatím není doložené. |
| Právní footer mohl ukazovat veřejnou kontaktní adresu vedle názvu, aniž by zřetelně ukazoval chybějící právní údaje. | Viditelný blok označuje IČO, právní adresu a VOP jako nedoplněné, dokud nejsou explicitní a VOP není schválené pomocí `VITE_COMPANY_VOP_APPROVED=true`. | Skutečné IČO, sídlo a schválený text VOP musí dodat a ověřit provozovatel. |

Text ceny a rozsahu Founding Pilotu zůstává zachován: osobní založení firmy, přihlášení majitele, pozvání zaměstnanců, webový formulář a kontrolovaný CSV import. Změněné copy nepřidává nové schopnosti, reference ani výsledky. Aktuální produkční web zůstane na původním textu do schválení a nasazení draft PR.
