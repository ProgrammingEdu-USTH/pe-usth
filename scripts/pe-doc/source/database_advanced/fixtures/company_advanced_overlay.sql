-- PE-authored Advanced overlay. Source: Practice 1.pdf p5 EMPLOYEE includes Minit.
-- The old85 fixture is a reconstruction and remains unchanged.
-- Developer setup contract (not a learner terminal task):
-- 1. In a dedicated isolated schema, load baseline/fixtures/company_pe.sql after
--    changing ONLY its CREATE DATABASE and USE targets to pe_advanced_company.
-- 2. Run this overlay ONCE after each fresh baseline load. It intentionally fails
--    with duplicate-column error on a second run; it is not an idempotent migration.
-- 3. Verify all six original PKs, eight source FK relationships and table shapes;
--    minit must round-trip NULL and one character. Do not infer source NOT NULL,
--    UNIQUE(name), salary/hour CHECK or spouse-symmetry rules from the diagram.
-- 4. Reset only the dedicated Advanced schema. Never replace the old85 database.
USE pe_advanced_company;
ALTER TABLE employee ADD COLUMN minit CHAR(1) NULL AFTER fname;
