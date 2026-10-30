# Poznámky a soubory u zakázky

Tento kontrakt je návrh pouze pro izolovaný Supabase staging. Produkční databázi ani Storage automaticky nemění. Před aplikací ověřuje aktuální signatury, návratové typy a bezpečnostní nastavení helperů `public.app_role(uuid)` a `public.app_can_lead(uuid,uuid)`.

Migrace vytváří samostatný `app_lead_events` pro audit událostí poznámek a souborů, protože aktuální staging snapshot toto rozhraní neobsahuje. Vytváří také oddělený soukromý bucket `lead-files`; existující `crm-files` a jeho politiky nechává nedotčené. Ve staging SQL Editoru původní běh skončil chybou, protože návrh volal neexistující `app_private.app_role(uuid)`. Opravený návrh používá skutečné helpery ve schématu `public` a nejdřív kontroluje jejich signatury i `SECURITY DEFINER`/`search_path` kontrakt.

Opravený návrh prošel v disposable PostgreSQL: neplatný helper grant správně zastavil běh před DDL bez částečného vytvoření tabulek; po obnovení grantu prošla aplikace dvakrát po sobě, A/B RLS testy pro poznámky/soubory/Storage, kontrola serverově nastaveného autora a auditní události. To není důkaz staging nasazení. Staging aplikace zůstává odděleným krokem po lidské revizi.

## Zaměstnanecké změny zakázky

Jediným zdrojem pravdy je funkce `app_private.employee_lead_editable_fields()` v `supabase/staging/20261013_lead_notes_files_contract.sql`. Povolená pole jsou:

- `status` — pouze existující povolené přechody životního cyklu;
- `description` — poznámka z místa nebo kontaktní poznámka;
- `phone` a `email` — oprava kontaktu získaná při práci;
- `address` — oprava místa realizace.

Identita zakázky, firma, přiřazení, cena, zdroj, importní údaje, revize a ostatní pole zůstávají zaměstnanci uzamčená. Změna seznamu musí upravit také SQL akceptační test.

## Soubory

Bucket `lead-files` je soukromý. Objekt má cestu `company_id/lead_id/uuid-název`. Bucket i tabulka metadat přijímají nejvýše 15 MB a pouze JPEG, PNG, WebP, HEIC nebo PDF. RLS ověřuje firmu i přístup k zakázce; samotná znalost cesty oprávnění neuděluje.

Poznámky ani metadata souborů se neupravují. Databázový trigger při zápisu z prohlížeče vždy nastaví autora z ověřené relace a čas z databázových hodin, takže klient nemůže podvrhnout 15minutové mazací okno. Majitel může záznam firmy smazat kdykoli. Přiřazený zaměstnanec může smazat jen svůj záznam nebo objekt do 15 minut od vytvoření.
