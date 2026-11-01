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

| Ceník zobrazoval Founding Pilot jako hlavní nabídku za 7 900 Kč a tři karty popisovaly scénáře místo tarifů. | Start 1 990 Kč/měsíc do 5 zaměstnanců, Růst 2 990 Kč/měsíc do 15 a Profi 4 990 Kč/měsíc bez limitu; Founding Pilot zůstává sekundární nabídka bez částky, cenu potvrzuje nabídka. | Ceny a kapacitu zadal provozovatel; Profi konektor je označen jako připravovaný na únor 2027 a Profi nemá checkout CTA. |

Kalkulačka používá tříměsíční cenu Startu pouze jako modelovaný náklad a výsledek zůstává výslovně ilustrativní, nikoli příslib výnosu. Start a Růst vedou na registraci s výběrem tarifu. Funkční Stripe platba závisí na odpovídajících serverových Preview cenách a schválené databázové smlouvě; Production proměnné nebyly změněny. Změněné copy nepřidává reference ani výsledky. Founding Pilot nemá v této nabídce pevnou částku; produkční stránka se změní až po schválení a nasazení draft PR.
