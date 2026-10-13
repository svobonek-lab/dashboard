# Poznámky a soubory u zakázky

Tento kontrakt je návrh pouze pro izolovaný Supabase staging. Produkční databázi ani Storage automaticky nemění.

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
