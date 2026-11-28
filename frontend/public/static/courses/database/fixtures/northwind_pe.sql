-- Reconstructed PE dataset, NOT the missing USTH Northwind dump.
-- Names normalized from the inconsistent lab names; mapping in Z02.
CREATE DATABASE IF NOT EXISTS northwind_pe CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE northwind_pe;
DROP TABLE IF EXISTS purchase_order_details;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS employees;
CREATE TABLE employees(id INT PRIMARY KEY, first_name VARCHAR(50) NOT NULL,last_name VARCHAR(50) NOT NULL,city VARCHAR(40),email_address VARCHAR(100)) ENGINE=InnoDB;
CREATE TABLE suppliers(id INT AUTO_INCREMENT PRIMARY KEY,company VARCHAR(80) NOT NULL,last_name VARCHAR(50),first_name VARCHAR(50),city VARCHAR(40),country_region VARCHAR(40),email_address VARCHAR(100),UNIQUE(company)) ENGINE=InnoDB;
CREATE TABLE customers(id INT PRIMARY KEY,company VARCHAR(80) NOT NULL,last_name VARCHAR(50),first_name VARCHAR(50),city VARCHAR(40),email_address VARCHAR(100)) ENGINE=InnoDB;
CREATE TABLE products(id INT AUTO_INCREMENT PRIMARY KEY,product_code VARCHAR(30) NOT NULL UNIQUE,product_name VARCHAR(80),supplier_id INT NOT NULL,list_price DECIMAL(10,2) NOT NULL,standard_cost DECIMAL(10,2) NOT NULL DEFAULT 0,discontinued BOOLEAN NOT NULL DEFAULT 0,category VARCHAR(40) NOT NULL,FOREIGN KEY(supplier_id) REFERENCES suppliers(id),CHECK(list_price>=0),CHECK(standard_cost>=0)) ENGINE=InnoDB;
CREATE TABLE orders(id INT PRIMARY KEY,order_date DATE NOT NULL,customer_id INT NOT NULL,employee_id INT NOT NULL,ship_name VARCHAR(80),ship_city VARCHAR(40),shipping_fee DECIMAL(10,2),FOREIGN KEY(customer_id) REFERENCES customers(id),FOREIGN KEY(employee_id) REFERENCES employees(id)) ENGINE=InnoDB;
CREATE TABLE order_details(order_id INT,product_id INT,unit_price DECIMAL(10,2) NOT NULL,quantity INT NOT NULL,discount DECIMAL(4,2) NOT NULL DEFAULT 0,PRIMARY KEY(order_id,product_id),FOREIGN KEY(order_id) REFERENCES orders(id),FOREIGN KEY(product_id) REFERENCES products(id),CHECK(quantity>0),CHECK(discount BETWEEN 0 AND 1)) ENGINE=InnoDB;
CREATE TABLE purchase_orders(id INT PRIMARY KEY,created_by INT NOT NULL,approved_by INT NULL,FOREIGN KEY(created_by) REFERENCES employees(id),FOREIGN KEY(approved_by) REFERENCES employees(id)) ENGINE=InnoDB;
CREATE TABLE purchase_order_details(purchase_order_id INT,product_id INT,quantity INT NOT NULL,PRIMARY KEY(purchase_order_id,product_id),FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id),FOREIGN KEY(product_id) REFERENCES products(id),CHECK(quantity>0)) ENGINE=InnoDB;
INSERT INTO employees VALUES (1,'Anh','Nguyen','Hanoi','anh@pe.example'),(2,'Minh','Tran','Hue','minh@pe.example'),(3,'An','Le',NULL,'an@pe.example');
INSERT INTO suppliers VALUES (10,'VietBrew','Nguyen','Ha','Hanoi','Vietnam','ha@pe.example'),(11,'PaperTown','Le','Binh','Hue','Vietnam','binh@pe.example'),(12,'TeaHouse','Tran','Chi','Hanoi','Vietnam',NULL);
INSERT INTO customers VALUES (21,'PE School','Pham','Lan','Hanoi','lan@pe.example'),(22,'Hanoi Lab','Vo','Mai','Hanoi','mai@pe.example'),(23,'Hue Studio','Do','An','Hue',NULL);
INSERT INTO products VALUES (1,'TEA','Tea',10,20,12,0,'Beverages'),(2,'COF','Coffee',10,25,18,0,'Beverages'),(3,'OLD','Old Notebook',11,15,10,1,'Stationery'),(4,'MILK','Milk',12,15,8,0,'Beverages'),(5,'PEN','Pen',11,5,2,0,'Stationery'),(6,'BULK','Machine',11,200,140,0,'Equipment'),(7,'RULE','Ruler',11,5,2.5,0,'Stationery');
INSERT INTO orders VALUES (31,'2006-03-25',21,1,'PE School','Hanoi',10),(32,'2006-03-26',22,2,'Hanoi Lab','Hue',20),(33,'2006-03-20',23,1,'Hue Studio','Hue',NULL),(34,'2006-03-28',21,1,'PE School','Hanoi',NULL);
INSERT INTO order_details VALUES (31,1,20,30,0.10),(31,2,25,20,0),(32,6,200,6,0),(33,5,5,3,0);
INSERT INTO purchase_orders VALUES (80,1,2),(81,3,NULL);
INSERT INTO purchase_order_details VALUES (80,7,30),(80,1,10),(81,3,4);
