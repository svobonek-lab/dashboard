CREATE TABLE customers (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  email text,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);
INSERT INTO customers VALUES
  (1, 'Stavební firma Alfa', 'alfa@example.test', '2026-10-04T08:00:00Z', NULL),
  (2, 'Firma Beta', NULL, '2026-10-04T08:00:00Z', NULL),
  (3, 'Firma Gama', 'gama@example.test', '2026-10-04T09:00:00Z', NULL),
  (4, 'Archivovaná firma', NULL, '2026-10-04T10:00:00Z', '2026-10-04T10:00:00Z');
CREATE TABLE leads (id bigint PRIMARY KEY, title text NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE projects (id bigint PRIMARY KEY, title text NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE employees (id bigint PRIMARY KEY, name text NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE invoices (id bigint PRIMARY KEY, number text NOT NULL, total numeric(12,2), updated_at timestamptz NOT NULL);
CREATE TABLE payments (id bigint PRIMARY KEY, invoice_id bigint, amount numeric(12,2), updated_at timestamptz NOT NULL);
CREATE TABLE byodb_employees (id text PRIMARY KEY, name text NOT NULL, email text NOT NULL);
CREATE TABLE byodb_projects (id text PRIMARY KEY, title text NOT NULL);
CREATE ROLE fixture_reader LOGIN PASSWORD 'fixture_reader_password';
GRANT CONNECT ON DATABASE fixture TO fixture_reader;
GRANT USAGE ON SCHEMA public TO fixture_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fixture_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO fixture_reader;
CREATE ROLE fixture_writer LOGIN PASSWORD 'fixture_writer_password';
GRANT CONNECT ON DATABASE fixture TO fixture_writer;
GRANT USAGE ON SCHEMA public TO fixture_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON byodb_employees, byodb_projects TO fixture_writer;
