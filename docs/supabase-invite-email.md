# Pozvánkový e-mail a vlastní SMTP v Supabase

Tento postup se provádí nejdříve ve stagingovém projektu. Produkční projekt se nemění automaticky.

## 1. Nastavení adres aplikace

1. V Supabase otevřete **Authentication → URL Configuration**.
2. Nastavte **Site URL** na HTTPS adresu dashboardu.
3. Do **Redirect URLs** přidejte přesnou adresu `https://<dashboard>/login` pro Preview a později samostatně pro produkci.
4. Nepovolujte zástupnou doménu, pokud stačí konkrétní Preview URL.

## 2. Česká šablona pozvánky

1. Otevřete **Authentication → Email Templates → Invite user**.
2. Předmět nastavte například na `Pozvánka do {{ .Data.company_name }} | StavbaFlow`.
3. Obsah nahraďte souborem `supabase/templates/invite.html`.
4. Uložte změnu a zkontrolujte, že tlačítko používá výhradně `{{ .ConfirmationURL }}`.

Backend předává do šablony `company_name`, jméno, roli, `company_id` a `invite_id`. Pozvánka i databázový záznam mají platnost 7 dní.

## 3. Vlastní SMTP

1. Otevřete **Project Settings → Authentication → SMTP Settings** (v některých verzích UI **Authentication → Email → SMTP**).
2. Zapněte **Custom SMTP**.
3. Vyplňte hostitele, port, uživatele, heslo, adresu odesílatele a zobrazované jméno podle poskytovatele.
4. Použijte ověřenou doménu odesílatele a u poskytovatele nastavte SPF, DKIM a případně DMARC.
5. U poskytovatele vypněte automatické přepisování odkazů a click tracking. Přepsaný jednorázový odkaz může Supabase odmítnout.
6. Uložte nastavení. Heslo SMTP nikdy nepatří do repozitáře ani do proměnných `VITE_*`.

Pokud vlastní SMTP není nastavené nebo Supabase odeslání odmítne, StavbaFlow nesmí zobrazit úspěch. API vrátí chybu doručení, onboarding firmy se vrátí zpět a UI zobrazí pokyn ke kontrole SMTP.

## 4. Platnost odkazu a databázová pojistka

Databázová pozvánka StavbaFlow expiruje za 7 dní. Před zveřejněním stejného tvrzení zákazníkům ověřte ve stagingu také skutečnou životnost jednorázového odkazu Supabase Auth; bezpečnostní nastavení Auth může odkaz ukončit dříve. Pokud ji nelze sladit na 7 dní, upravte text e-mailu na kratší ověřenou dobu a nabídněte opětovné odeslání pozvánky.

Po ruční kontrole aplikujte ve stagingu `supabase/staging/20261013_invite_password_gate.sql`. Funkce při přijetí pozvánky kontroluje pouze existenci hashovaného hesla v `auth.users`; heslo ani hash nevrací. Bez uloženého hesla nevytvoří členství ve firmě, i kdyby někdo obešel obrazovku aplikace.

## 5. Ruční scénář s reálnou schránkou

1. Ve stagingu založte syntetickou firmu a použijte reálnou testovací schránku, která ještě nemá účet.
2. Potvrďte, že UI oznámí odeslání pouze tehdy, když Supabase pozvánku skutečně přijme.
3. Ve schránce ověřte odesílatele, název firmy, jediné tlačítko a text o platnosti 7 dní.
4. Otevřete tlačítko v anonymním okně. Cílem musí být přesná stagingová adresa `/login`.
5. Potvrďte obrazovku **Nastavte si heslo**. Před uložením hesla zkuste otevřít `/dashboard`; aplikace vás musí vrátit na `/login`.
6. Zadejte heslo o alespoň 10 znacích. Po úspěchu musí majitel skončit ve firemním dashboardu, zaměstnanec pouze v dashboardu přiřazených zakázek.
7. Odhlaste se a přihlaste novým heslem. Role i firma musí zůstat stejné.
8. Zkuste odkaz použít znovu; Supabase ho musí odmítnout jako použitý nebo expirovaný.
9. Proveďte stejný scénář jednou pro majitele a jednou pro zaměstnance.

Do pilotního protokolu uložte datum, cílovou Preview URL, typ účtu, výsledek doručení, přesměrování, opakovaného přihlášení a odmítnutí použitého odkazu. Neukládejte token ani heslo.
