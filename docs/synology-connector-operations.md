# Provoz a incidenty Synology konektoru StavbaFlow

## Běžný provoz

Konektor se synchronizuje nejvýše jednou za minutu a lze spustit ručně. Stav `ready` čeká na schválené mapování, `running` právě čte, `success` dokončil běh, `partial_failure` vyžaduje opravu konkrétních polí a `paused` zastavuje automatické běhy. Pět po sobě jdoucích provozních chyb pozastaví plánovač. Chyba jednoho řádku nezastaví ostatní platné řádky.

Logy a podpora smějí obsahovat verzi, digest, čas, safe error code, tabulku/sloupec a počty. Nesmějí obsahovat řádky zákazníka, hesla, connection string, enrollment kód, privátní klíč, bearer token ani request podpis.

## Aktualizace a návrat

Publikování konektoru je ruční workflow z reviewovaného `main`. Vytvoří image pro amd64/arm64, verzi, commit tag a release manifest s neměnným digestem. Hostitelský `update.ps1` nikdy nemontuje Docker socket do konektoru.

Aktualizátor:

1. ověří očekávaný image a formát digestu;
2. uloží současný digest;
3. stáhne kandidáta a zachová config/state mounty;
4. čeká omezenou dobu na lokální health a podepsaný platform heartbeat;
5. při chybě spustí přesný předchozí digest.

Automatickou aktualizaci lze vypnout nebo zadat `PinnedDigest`. Mapping ani credentials se při aktualizaci nemění. Po rollbacku uložte bezpečný error code a oba digesty, nikoli logy s daty.

## Mapování, pause a obnova

Každá změna mapování vytvoří novou verzi, zruší předchozí schválení a vyžádá nový dry-run. Před úpravou schématu zdroje konektor pozastavte. Po opravě mapování spusťte dry-run, zkontrolujte nulu chyb, schvalte a teprve potom obnovte synchronizaci.

Zálohujte složku `state` a konfiguraci odděleně od secrets. Stav obsahuje identitu, checkpointy a outbox; jeho ztráta může způsobit bezpečné opakované doručení, které server zpracuje idempotentně. Obnova musí zachovat oprávnění souborů. Kopii secrets nepřikládejte k podpoře.

## Odpojení a kompromitace

Odpojení v dashboardu je dvoukrokové a serverově okamžité. Po revokaci stará identita nesmí odeslat heartbeat ani data. Potom zastavte Container Manager projekt a smažte enrollment secret. Pro nové zařízení vytvořte nový enrollment; nekopírujte privátní identitu z podezřelého NASu.

Při podezření na kompromitaci:

1. ihned revoke konektor a pozastavte import;
2. izolujte NAS od sítě a otočte heslo read-only databázového účtu;
3. zachovejte čas, digest, bezpečné logy a auditní ID;
4. ověřte poslední přijatý request a tenant audit bez exportu zákaznických řádků;
5. obnovte konektor novou identitou až po vyřešení příčiny.

## Eskalace

Eskalace obsahuje firmu jako interní ID, connector ID, verzi/digest, mapping verzi, časy heartbeatů, počty a error codes. Nikdy neposílejte zdrojové hodnoty nebo credentials. Produkční SQL změna, rozšíření grantů, vypnutí RLS ani obousměrný zápis nejsou postupem obnovy a vyžadují samostatný reviewovaný release.
