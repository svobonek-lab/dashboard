# StavbaCore reference and product gap review

Reviewed on 2026-09-25 for the sales meeting with a small construction company. The intended customer is one construction firm buying its own operating dashboard; platform-wide tenant administration is internal and is not the product to pitch.

## Reference site observations

The signed-in `/admin` area is a super-admin control panel. Its navigation includes a company directory, company workspace links, an installation wizard, demo creation, domains, billing, audit logs, and platform settings. `/admin/companies` exposes firm records and actions such as branding edits, workspace previews, and deletion. Those controls describe platform operations, not the everyday value a construction company buys.

The `/admin/install` wizard presents a seven-step setup: import a company website, set identity and logo, describe services, create the owner account, add the team, preview the workspace, and activate it. Its website extraction and account provisioning should not be presented as existing production behavior until they are independently verified.

The public `/demo` tells a stronger customer story in four parts: receive a lead, respond, accept a quote, record field costs, then show the owner's result. Its sample screen mentions a timed response target and live costs. This review did not test those claims or submit its simulation controls.

## What this repository currently provides

The application has owner and employee routes, organization context, role-aware navigation, leads, quotes, jobs, calendar, team, analytics, documents, communications, an inquiry widget, settings, and an onboarding checklist. The public `/demo` is intentionally separate from authentication and production services; it uses synthetic browser-local data and lets a viewer advance an inquiry through contact, site measurement, quote, and job handoff.

The customer-facing dashboard also contained hard-coded example clients, a fabricated daily schedule, fixed response-time claims, and fallback price and margin values. These could be displayed beside a real company's records and point to the wrong lead. This review's accompanying change derives attention items and active jobs from the company's lead list and leaves missing price or margin values explicitly blank.

The repository's cost tab still contains sample invoices, a fixed labor cost, and browser-only component state. It is not a durable accounting ledger. The reference's timed SLA and field-cost claims are likewise not verified as working production features. Do not promise them as live functionality in the sales meeting.

## Recommended meeting path

Show the company owner's dashboard and its lead-to-job flow. The new public demo walkthrough uses an explicitly fictional example to explain the business sequence and calculate an illustrative gross margin; it does not send data to production or claim to be accounting output. Avoid the platform super-admin screens when describing the product to a construction firm.

## Follow-up before selling as a live operating system

1. Replace the cost tab's in-memory sample ledger with a tenant-scoped, durable implementation after reconciling the verified `app_*` schema and exercising it in disposable staging. Until then, label it as a preview or keep it out of live customer workflows.
2. Review onboarding completion state for organization-scoped storage and verify owner/employee permissions against staging. UI role checks alone do not prove tenant isolation.
3. Only advertise response-time alerts, field reporting, and calculated margins after the data sources, persistence, and end-to-end behavior pass tests.

No customer rows were copied into this review. No production database writes, schema changes, migrations, or deployments were performed.
