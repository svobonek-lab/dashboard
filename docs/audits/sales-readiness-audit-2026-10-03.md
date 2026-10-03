# StavbaFlow — audit připravenosti k prodeji

Datum: 2026-10-03  
Posuzovaný stav: PR #65, commit `06d50f2`, oddělený Supabase staging `oncmtmrhmjlerbwkrecv`

## Rozhodnutí

StavbaFlow je po sloučení a nasazení PR #65 vhodný pro **řízený placený pilot jedné menší stavební firmy**. Není ještě připravený jako samoobslužný SaaS, který lze bez operátora prodávat více firmám současně.

První nabídka musí zůstat v ověřeném rozsahu: veřejný formulář, poptávky, přiřazení zaměstnanci, povolené změny stavu, historie a kontrolovaný CSV import. Přímé SQL/ERP/Synology propojení, automatické nabídky, klientský portál, evidence času a materiálu, fakturace a úplný POHODA workflow nejsou ověřenou součástí pilotu.

## Nově ověřeno v reálném průchodu

- `npm test`: 101 testů prošlo.
- TypeScript kontrola a produkční sestavení prošly.
- GitHub Actions a oba Vercel Preview checky pro `06d50f2` prošly.
- Majitel se přihlásil bez výběru role a viděl jen svou firmu.
- Majitel přiřadil skutečného aktivního zaměstnance; `assigned_to` a revize byly potvrzeny přímým stagingovým čtením a přežily reload.
- Veřejný formulář se načetl podle tenant slug, i když byl majitel současně přihlášený.
- Formulář vytvořil právě jednu syntetickou poptávku se `source=public_form`, hodnotou 150 000 Kč a správným `company_id`.
- Nová poptávka se objevila v Kanbanu majitele bez lokálního fallbacku nebo vymyšlených dat.
- Produkční Supabase nebyla použita pro zápisy ani migrace.

Při browser testu byla nalezena a opravena chyba, kdy veřejný formulář dědil přihlášenou dashboardovou relaci. Veřejné RPC správně odmítá roli `authenticated`, a proto formulář nyní používá samostatného anonymního klienta bez perzistence relace.

## P0 — nutné před prvním placeným pilotem

### 1. Sloučit a nasadit PR #65

Oprava přiřazování, omezení neověřených obrazovek a oprava anonymního formuláře jsou zatím pouze v draft PR. Stabilní aplikace je nesmí prodávat dříve, než bude tento přesný commit zkontrolován, sloučen a nasazen.

### 2. Otočit stagingový `service_role` klíč

Stagingový serverový klíč byl během ověřování ručně přenesen mezi Supabase a Vercel. Před vložením skutečných zákaznických dat musí být preventivně zneplatněn, nahrazen novým a aktualizován pouze v serverovém Vercel prostředí. Nesmí mít prefix `VITE_` ani se objevit v repozitáři nebo klientském bundle.

### 3. Zavést opakovatelný onboarding firmy

Stagingový kontrakt umí firmu a ownera vytvořit, ale chybí bezpečný operátorský endpoint nebo dokončený interní průvodce. Dnešní pilot lze založit ručně podle runbooku, nikoli spolehlivě během několika minut pro každého dalšího zákazníka.

Onboarding musí jedním auditovatelným postupem:

- vytvořit firmu, slug a owner membership;
- nastavit branding a firemní kontakt;
- explicitně zapnout veřejný formulář;
- vytvořit a ověřit přihlášení ownera;
- pozvat zaměstnance;
- uložit výsledek checklistu bez ukládání tajných hodnot.

### 4. Opravit prodejní landing page

Landing page dnes slibuje funkce mimo ověřený pilot: SLA automatizaci, automatický follow-up nabídek, živou marži z času a materiálu, klientský portál, PDF nabídky, POHODA XML faktury, kompletní ZIP export a vlastní ERP/SQL propojení. Rezervační formulář současně výslovně říká, že se nikam neodesílá.

Před spuštěním prodeje je nutné:

- přepsat nabídku na skutečný rozsah Founding Pilotu;
- odstranit nebo označit roadmapu u neověřených funkcí;
- zprovoznit jeden skutečný kontakt/rezervaci, který nepotvrdí úspěch bez doručení;
- doplnit veřejnou identitu dodavatele, kontakt, VOP, zásady soukromí a DPA;
- nepoužít soukromý e-mail jako veřejný obchodní kontakt bez výslovného rozhodnutí vlastníka.

### 5. Udělat zákaznickou přejímku v cílovém prostředí

Pro konkrétní pilotní firmu je nutné znovu projít `docs/pilot-operator-runbook.md`: owner login, zaměstnanecká pozvánka a aktivace, přiřazená zakázka, veřejný formulář, CSV import, opakovaný import, logout/recovery a dvoufiremní izolace. Výsledek musí obsahovat URL deploymentu, commit a datum, ne tajné klíče ani zákaznické řádky.

## P1 — nutné před opakovaným prodejem více firmám

1. **Produkční release proces.** Zkontrolovat produkční metadata, granty a RLS samostatně; nic nekopírovat ze stagingu automaticky. Připravit rollback a schválení produkčního zápisového režimu.
2. **Notifikace.** Buď nastavit a ověřit poskytovatele e-mailů, nebo notifikace v nabídce vypnout. UI nesmí hlásit doručení bez potvrzení poskytovatele.
3. **Data lifecycle.** Doložit export, smazání, retenční dobu, zálohu, obnovu a postup při incidentu. Určit osobu odpovědnou za podporu.
4. **Tarify a limity.** Ceny na landing page dnes nejsou vynucené v aplikaci. Před běžným předplatným je potřeba řízení plánu, uživatelů a fakturace.
5. **Pozorovatelnost.** Přidat bezpečné provozní logy a upozornění na chyby formuláře, pozvánek a importu bez osobních údajů v logu.
6. **Výkon.** Hlavní klientský bundle má přibližně 1,7 MB po minifikaci. Rozdělit velké obrazovky pomocí lazy loadingu; není to blokátor prvního pilotu, ale zhoršuje mobilní start.
7. **Leaked-password protection.** Zapnout po přechodu na Supabase plán, který tuto kontrolu podporuje.

## Co lze po splnění P0 poctivě prodávat

- dashboard majitele pro poptávky a jejich stav;
- jedno přihlášení s automatickým směrováním owner/employee;
- zaměstnanec vidí jen přidělené zakázky;
- veřejný formulář firmy zapisující poptávky do jejího workspace;
- přiřazení zaměstnance a omezený lifecycle poptávka → realizace;
- kontrolovaný CSV import bez zápisu zpět do původní databáze;
- audit změn a ověřené oddělení firem.

## Co zatím nesmí být součástí obchodního slibu

- přímá nebo obousměrná synchronizace SQL/ERP/Synology/Google Sheets;
- automatický follow-up, SMS nebo garantované e-mailové notifikace;
- kompletní nabídky, fakturace, klientský portál a účetní workflow;
- živá evidence materiálu, času a marže;
- samoobslužné založení firmy bez operátora;
- plně automatické nasazení produkčních databázových změn.

## Nejrychlejší cesta k prvnímu prodeji

1. Zkontrolovat a ručně sloučit PR #65.
2. Nasadit přesný sloučený commit na dashboard a zopakovat krátký smoke test.
3. Otočit stagingový serverový klíč.
4. Upravit landing page na omezený Founding Pilot a zprovoznit skutečný obchodní kontakt.
5. Vybrat jednu pilotní firmu, ručně ji provisionovat a projít zákaznický runbook.
6. Nabídnout 30denní řízený pilot s jasně popsanými výlukami a osobním onboardingem.

Po těchto krocích lze prodávat první řízený pilot. Označení „hotový SaaS pro libovolný počet firem“ zůstává předčasné, dokud nejsou splněné P1 body.
