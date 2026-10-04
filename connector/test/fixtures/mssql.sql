IF DB_ID('fixture') IS NULL CREATE DATABASE fixture;
GO
USE fixture;
GO
CREATE TABLE dbo.customers (
  id bigint PRIMARY KEY,
  name nvarchar(255) NOT NULL,
  email nvarchar(255) NULL,
  updated_at datetimeoffset NOT NULL,
  deleted_at datetimeoffset NULL
);
INSERT INTO dbo.customers VALUES
  (1, N'Stavební firma Alfa', N'alfa@example.test', '2026-10-04T08:00:00+00:00', NULL),
  (2, N'Firma Beta', NULL, '2026-10-04T08:00:00+00:00', NULL),
  (3, N'Firma Gama', N'gama@example.test', '2026-10-04T09:00:00+00:00', NULL),
  (4, N'Archivovaná firma', NULL, '2026-10-04T10:00:00+00:00', '2026-10-04T10:00:00+00:00');
CREATE TABLE dbo.leads (id bigint PRIMARY KEY, title nvarchar(255) NOT NULL, updated_at datetimeoffset NOT NULL);
CREATE TABLE dbo.projects (id bigint PRIMARY KEY, title nvarchar(255) NOT NULL, updated_at datetimeoffset NOT NULL);
CREATE TABLE dbo.employees (id bigint PRIMARY KEY, name nvarchar(255) NOT NULL, updated_at datetimeoffset NOT NULL);
CREATE TABLE dbo.invoices (id bigint PRIMARY KEY, number nvarchar(80) NOT NULL, total decimal(12,2), updated_at datetimeoffset NOT NULL);
CREATE TABLE dbo.payments (id bigint PRIMARY KEY, invoice_id bigint, amount decimal(12,2), updated_at datetimeoffset NOT NULL);
GO
USE master;
GO
CREATE LOGIN fixture_reader WITH PASSWORD = 'Fixture_reader_password_1!', CHECK_POLICY = ON;
GO
USE fixture;
GO
CREATE USER fixture_reader FOR LOGIN fixture_reader;
GRANT CONNECT TO fixture_reader;
GRANT SELECT ON SCHEMA::dbo TO fixture_reader;
DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO fixture_reader;
GO
