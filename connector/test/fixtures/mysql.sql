CREATE TABLE customers (
  id bigint PRIMARY KEY,
  name varchar(255) NOT NULL,
  email varchar(255) NULL,
  updated_at timestamp(6) NOT NULL,
  deleted_at timestamp(6) NULL
);
INSERT INTO customers VALUES
  (1, 'Stavební firma Alfa', 'alfa@example.test', '2026-10-04 08:00:00', NULL),
  (2, 'Firma Beta', NULL, '2026-10-04 08:00:00', NULL),
  (3, 'Firma Gama', 'gama@example.test', '2026-10-04 09:00:00', NULL),
  (4, 'Archivovaná firma', NULL, '2026-10-04 10:00:00', '2026-10-04 10:00:00');
CREATE TABLE leads (id bigint PRIMARY KEY, title varchar(255) NOT NULL, updated_at timestamp(6) NOT NULL);
CREATE TABLE projects (id bigint PRIMARY KEY, title varchar(255) NOT NULL, updated_at timestamp(6) NOT NULL);
CREATE TABLE employees (id bigint PRIMARY KEY, name varchar(255) NOT NULL, updated_at timestamp(6) NOT NULL);
CREATE TABLE invoices (id bigint PRIMARY KEY, number varchar(80) NOT NULL, total decimal(12,2), updated_at timestamp(6) NOT NULL);
CREATE TABLE payments (id bigint PRIMARY KEY, invoice_id bigint, amount decimal(12,2), updated_at timestamp(6) NOT NULL);
CREATE TABLE byodb_employees (id varchar(36) PRIMARY KEY, name varchar(255) NOT NULL, email varchar(320) NOT NULL);
CREATE TABLE byodb_projects (id varchar(36) PRIMARY KEY, title varchar(255) NOT NULL);
CREATE USER 'fixture_reader'@'%' IDENTIFIED BY 'fixture_reader_password';
GRANT SELECT ON fixture.* TO 'fixture_reader'@'%';
CREATE USER 'fixture_writer'@'%' IDENTIFIED BY 'fixture_writer_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON fixture.byodb_employees TO 'fixture_writer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON fixture.byodb_projects TO 'fixture_writer'@'%';
FLUSH PRIVILEGES;
