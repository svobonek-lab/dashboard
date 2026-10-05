# Instalace read-only konektoru StavbaFlow na Synology

Tento postup je určen pro řízený pilot. Konektor pouze čte vybrané tabulky z PostgreSQL, MySQL/MariaDB nebo Microsoft SQL Serveru a odesílá mapované záznamy přes HTTPS do jedné firmy ve StavbaFlow. Neotevírá port NASu a do zdrojové databáze nezapisuje.

## Předpoklady

- Synology Container Manager na `linux/amd64` nebo `linux/arm64`;
- vyhrazená složka `/volume1/docker/stavbaflow` (číslo volume lze změnit);
- DNS, správný čas a odchozí HTTPS k aplikaci StavbaFlow a GHCR;
- samostatný databázový uživatel s pouze `SELECT` na povolených tabulkách;
- zkontrolovaný image digest a jednorázový enrollment kód s platností 15 minut.

Nevystavujte databázi do internetu. Konektor má běžet v síti, ze které dosáhne na databázi. Heslo se ukládá jen do souboru Docker secret na NASu.

## Read-only databázový účet

Použijte nový účet pouze pro StavbaFlow. Povolte mu přihlášení z adresy NASu, `SELECT` jen na mapovaných tabulkách a čtení potřebných metadata katalogů. Nepřidělujte `INSERT`, `UPDATE`, `DELETE`, DDL, správu uživatelů ani replikační oprávnění. Vestavěný startovací test připojení selže uzavřeně, pokud nedokáže prokázat čtení nebo zákaz zápisu.

## Soubory na NASu

1. Stáhněte z kontrolovaného GitHub release `compose.yaml`, `config.example.json`, `install.ps1` a manifest.
2. Zkopírujte vzor konfigurace do `/volume1/docker/stavbaflow/config/config.json`.
3. Nastavte `CUSTOMER_DB_HOST`, port, databázi, schéma, `CUSTOMER_READ_ONLY_USER` a přesnou HTTPS adresu aplikace.
4. Uložte databázové heslo bez konce řádku do `/volume1/docker/stavbaflow/secrets/source-db-password`.
5. V dashboardu vlastníka vytvořte jednorázový kód a uložte jej do `/volume1/docker/stavbaflow/secrets/enrollment-code`.
6. Omezte přístup ke složkám `secrets` a `state` pouze na správce NASu a účet Container Manageru.

Instalační skript odmítne jinou cílovou cestu, chybějící secrets, neplatný Compose soubor i neúspěšné spuštění. Hodnoty secrets nevypisuje.

## První připojení

Po startu konektor lokálně vytvoří Ed25519 identitu, spotřebuje jednorázový kód a odešle první podepsaný heartbeat. V dashboardu musí být vidět nový konektor a metadata tabulek/sloupců bez zákaznických řádků. Pokud kód vypršel, vytvořte nový; starý nelze znovu použít.

Vyberte jednu tabulku a explicitně namapujte sloupce. První běh je vždy dry-run. Zkontrolujte počty platných/chybných záznamů a názvy chybných polí. Import se povolí teprve po výslovném schválení vlastníkem a jen při nulovém počtu chyb dry-runu.

## Přijetí instalace

Instalace je úspěšná pouze když:

- image běží pod neprivilegovaným uživatelem a NAS nemá nový veřejný port;
- read-only kontrola všech tří podporovaných motorů pro daný pilot projde;
- dashboard zaznamená čerstvý podepsaný heartbeat;
- dry-run nevypíše zdrojové hodnoty ani přihlašovací údaje;
- vlastník jiné syntetické firmy stav konektoru nevidí;
- po schválení se uloží jen kanonická mapovaná data a opakovaný request nevytvoří duplicitu.

Bez těchto důkazů neaktivujte `VITE_CONNECTOR_ENABLED` pro zákaznické nasazení.
