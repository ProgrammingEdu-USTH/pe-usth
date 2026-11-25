-- PE-authored fixture. MySQL8.4/InnoDB. Dedicated training schema only.
-- Resets only the tables explicitly listed in pe_advanced_core.
CREATE DATABASE IF NOT EXISTS pe_advanced_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE pe_advanced_core;
DROP TABLE IF EXISTS ddl_probe;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS purchase_lines;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS on_call;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS plan_orders;
CREATE TABLE purchases (
 id INT PRIMARY KEY, customer_id INT NOT NULL, amount DECIMAL(12,2) NOT NULL,
 status VARCHAR(12) NOT NULL, created_on DATE NOT NULL
) ENGINE=InnoDB;
CREATE TABLE purchase_lines (
 order_id INT NOT NULL, line_id INT NOT NULL, amount DECIMAL(12,2) NOT NULL,
 PRIMARY KEY(order_id,line_id), FOREIGN KEY(order_id) REFERENCES purchases(id)
) ENGINE=InnoDB;
CREATE TABLE payments (
 id INT PRIMARY KEY, order_id INT NOT NULL, amount DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(order_id) REFERENCES purchases(id)
) ENGINE=InnoDB;
INSERT INTO purchases VALUES
 (101,1,100,'paid','2026-01-01'),(102,1,50,'paid','2026-01-02'),
 (103,2,70,'pending','2026-01-02'),(104,3,0,'paid','2026-01-03');
INSERT INTO purchase_lines VALUES (101,1,60),(101,2,40),(102,1,50),(103,1,70);
INSERT INTO payments VALUES (1,101,60),(2,101,40),(3,102,50);
CREATE TABLE accounts (id INT PRIMARY KEY,balance INT NOT NULL CHECK(balance>=0)) ENGINE=InnoDB;
INSERT INTO accounts VALUES (1,100),(2,100);
CREATE TABLE on_call (id INT PRIMARY KEY,active TINYINT NOT NULL CHECK(active IN(0,1))) ENGINE=InnoDB;
INSERT INTO on_call VALUES(1,1),(2,1);
CREATE TABLE jobs(id INT PRIMARY KEY,state VARCHAR(12) NOT NULL) ENGINE=InnoDB;
INSERT INTO jobs VALUES(1,'ready'),(2,'ready'),(3,'ready');
CREATE TABLE metrics(day_no INT NOT NULL,id INT PRIMARY KEY,value INT NOT NULL) ENGINE=InnoDB;
INSERT INTO metrics VALUES(1,1,10),(1,2,20),(2,3,5),(4,4,7);
CREATE TABLE plan_orders (
 id INT PRIMARY KEY, customer_id INT NOT NULL, status VARCHAR(12) NOT NULL,
 amount DECIMAL(12,2) NOT NULL, payload VARCHAR(100) NOT NULL
) ENGINE=InnoDB;
-- plan_orders is populated by the verifier with deterministic rows.
