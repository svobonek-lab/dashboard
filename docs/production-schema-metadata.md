# Production schema metadata snapshot

This document records a metadata-only read of the configured production Supabase project on 2026-09-30. It is an evidence snapshot for the application adapter work; it contains no customer rows, tokens, secrets, or write instructions.

Source: approved read-only Supabase MCP list_tables, schema public, verbose metadata. The response reported RLS enabled for every table below and returned primary keys and foreign-key constraints. The connector did not expose policy predicates, grants, or secondary indexes, so those remain explicit verification gates before any production adapter is enabled.

## Tenant and identity tables

| Table | Columns (type; default/nullable where relevant) | Primary key | Key foreign keys |
|---|---|---|---|
| app_companies | id uuid (gen_random_uuid), name text, slug text (unique), email text (''), phone text (''), address text (''), ico text (''), dic text (''), color text (#2563eb), privacy_url text (''), public_form boolean (false), active boolean (true), created_at timestamptz (now), logo_url text (''), terms_url text (''), onboarding_completed boolean (false), email_notifications boolean (true), plan text (pilot), trial_ends_at timestamptz (now + 30 days), form_heading text, form_intro text, form_button_label text, form_success_title text, form_success_text text, response_target_minutes int4 (60) | id | referenced by company-scoped app tables |
| app_members | company_id uuid, user_id uuid, name text, email text, role text (owner or employee), active boolean (true) | (company_id,user_id) | company_id -> app_companies.id; user_id -> auth.users.id |
| app_invites | id uuid (gen_random_uuid), company_id uuid, email text, name text, expires_at timestamptz (now + 7 days), created_at timestamptz (now), role text (employee) | id | company_id -> app_companies.id |

## Lead-to-job tables

| Table | Columns (type; default/nullable where relevant) | Primary key | Key foreign keys |
|---|---|---|---|
| app_leads | id uuid (gen_random_uuid), company_id uuid, title text, customer text, email text (''), phone text (''), address text (''), description text (''), status text (new), priority text (normal), assigned_to uuid (nullable), scheduled_at timestamptz (nullable), duration_minutes int4 (60), value numeric (0), source text (manual), created_at timestamptz (now), updated_at timestamptz (now), revision int4 (1), first_response_at timestamptz (nullable), portal_token_hash text (nullable), portal_shared_until timestamptz (nullable) | id | (company_id,assigned_to) -> app_members; (company_id,lead_id) -> app_leads from dependent tables |
| app_tasks | id uuid (gen_random_uuid), company_id uuid, lead_id uuid, title text, done boolean (false), due_at timestamptz (nullable), created_at timestamptz (now) | id | (company_id,lead_id) -> app_leads |
| app_quotes | id uuid (gen_random_uuid), company_id uuid, lead_id uuid, number text, items jsonb ([]), note text (''), valid_until date, status text (draft), customer_snapshot jsonb ({}), supplier_snapshot jsonb ({}), token_hash text (nullable), shared_until timestamptz (nullable), decided_at timestamptz (nullable), accepted_name text (nullable), created_at timestamptz (now), revision int4 (1) | id | (company_id,lead_id) -> app_leads |
| app_job_budgets | company_id uuid, lead_id uuid, revenue numeric, planned_cost numeric, note text (''), updated_at timestamptz (now) | lead_id | company_id -> app_companies; (company_id,lead_id) -> app_leads |

## Financial and work tracking tables

app_time_entries stores (company_id, lead_id, member_id, work_date, minutes, hourly_cost, note, created_at) with id as primary key and company-scoped foreign keys to app_leads and app_members. app_costs stores (company_id, lead_id, kind, description, quantity, unit_cost, supplier, incurred_on, created_by, created_at) with id as primary key and company-scoped lead linkage. app_invoices stores (company_id, lead_id nullable, number, customer, amount, issued_on, due_on, status, paid_at nullable, note, created_at) with id as primary key.

## Compatibility gates

1. The production source of truth is the app_* contract above. Existing UI paths that query legacy organizations, users, employees, leads, or projects must remain behind an explicit adapter and must fail closed when the app contract is unavailable.
2. Every read and write must carry the resolved company_id; the composite foreign keys are the tenant boundary for assignment, time, costs, quotes, tasks, and budgets.
3. Employee visibility must be constrained to app_members.user_id = auth.uid() and assigned leads. Owners may manage their company only after membership resolution.
4. Before enabling a production adapter, separately verify RLS policy predicates, grants, and secondary indexes for each touched table. This snapshot intentionally does not infer those values.
5. No migration, RPC, SQL write, row inspection, or deployment is part of this snapshot.

## Smallest safe next code change

Implement a read-only app_* metadata-backed repository contract in a feature branch, first for company/member/lead list and employee assignment filtering. Add fixture tests for composite company keys, owner/employee visibility, and fail-closed behavior. Leave quote conversion, time, costs, invoices, and public inquiry behind their existing guarded paths until their policies and function signatures are verified.
