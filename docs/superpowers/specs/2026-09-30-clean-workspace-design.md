# StavbaCore clean workspace design

## Cíl

StavbaCore má během několika sekund vysvětlit malé stavební firmě, co získá: jeden pracovní dashboard, který vede poptávku přes nabídku až k předání zakázky. Owner potřebuje vidět celou firmu, zaměstnanec pouze přiřazenou práci.

## Schválený vizuální směr

Rozhraní bude světlé, klidné a pracovní, inspirované jasností Google AI Studio: kompaktní levý rail, velká pracovní plocha, důsledná hierarchie a jedna dominantní akce. StavbaCore si zachová vlastní stavební charakter přes kobaltovou modrou a tyrkysový stavový akcent, nikoli přes ilustrace nebo dekorativní gradienty.

- Základ: `#F7F8FA`.
- Panely: `#FFFFFF`.
- Primární text: `#111827`.
- Sekundární text: `#667085`.
- Primární akce: `#2563EB`.
- Dokončeno: `#0F766E`.
- Pozornost: `#F59E0B`.
- Chyba: `#DC2626`.
- Písmo: Geist/Inter, sentence case, krátké řádky, výrazná čísla pouze tam, kde pomáhají rozhodnutí.

## Plochy a chování

### Owner dashboard

První obrazovka má uvítací řádek s názvem firmy a jednou hlavní akcí. Pod ním je blok „Dnes potřebuje pozornost“ s nejvýše třemi konkrétními položkami, dále pipeline poptávek a stručné týmové vytížení. KPI karty budou menší a sekundární. Owner neuvidí demo data pro cizí firmu.

### Employee dashboard

Zaměstnanec vstoupí přímo na „Moje dnešní práce“. Uvidí pouze přiřazené zakázky, nejbližší termín, checklist a jednu další akci. Navigace skryje owner finance, firmy a administraci. Prázdný stav vysvětlí, že zatím nemá přiřazenou práci.

### Landing a demo

Landing otevře konkrétní příslib: „Mějte každou poptávku a zakázku pod kontrolou.“ Ukáže čtyři kroky toku a jednu realistickou ukázku dashboardu. CTA jsou „Prohlédnout ukázku“ a „Přihlásit se“. Demo bude jasně označené jako ukázkové.

## Omezení a bezpečnost

Redesign nemění Supabase schéma, autentizaci, RLS ani produkční zápisy. Zachovává fail-closed chování, tenant cache scope a role guardy. Všechna nová data v prázdných stavech jsou syntetická a viditelně označená.

## Úspěch

- Nový návštěvník pozná produkt a další krok bez vysvětlování.
- Owner a employee mají odlišné priority a žádný nepřístupný obsah se pouze neschovává vizuálně — route guard zůstává autoritativní.
- Rozhraní funguje na šířce 390 px i desktopu, s viditelným focus stavem a respektem k reduced motion.
- Stávající testy, lint a build zůstanou zelené.
