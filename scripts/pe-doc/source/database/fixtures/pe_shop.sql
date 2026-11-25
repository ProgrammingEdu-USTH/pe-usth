-- PE authored fixture; MySQL 8.4 / InnoDB. Resets only pe_shop teaching schema.
CREATE DATABASE IF NOT EXISTS pe_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE pe_shop;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
 customer_id INT PRIMARY KEY,
 customer_name VARCHAR(80) NOT NULL,
 city VARCHAR(40) NULL
) ENGINE=InnoDB;
CREATE TABLE products (
 product_id INT PRIMARY KEY,
 product_name VARCHAR(80) NOT NULL,
 category VARCHAR(40) NOT NULL,
 price DECIMAL(10,2) NOT NULL CHECK (price >= 0)
) ENGINE=InnoDB;
CREATE TABLE orders (
 order_id INT PRIMARY KEY,
 customer_id INT NOT NULL,
 order_date DATE NOT NULL,
 status VARCHAR(20) NOT NULL,
 CONSTRAINT fk_order_customer FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
 CHECK (status IN ('paid','pending','cancelled'))
) ENGINE=InnoDB;
CREATE TABLE order_items (
 order_id INT NOT NULL,
 product_id INT NOT NULL,
 quantity INT NOT NULL CHECK(quantity > 0),
 unit_price DECIMAL(10,2) NOT NULL CHECK(unit_price >= 0),
 discount DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK(discount BETWEEN 0 AND 1),
 PRIMARY KEY(order_id,product_id),
 FOREIGN KEY(order_id) REFERENCES orders(order_id),
 FOREIGN KEY(product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;
INSERT INTO customers VALUES (1,'An','Hanoi'),(2,'Binh','Hue'),(3,'Chi',NULL),(4,'Dung','Hanoi');
INSERT INTO products VALUES (10,'Notebook','Stationery',30),(11,'Pen','Stationery',10),(12,'Bag','Accessories',120),(13,'Ruler','Stationery',10);
INSERT INTO orders VALUES (100,1,'2026-01-10','paid'),(101,1,'2026-01-11','paid'),(102,2,'2026-01-12','pending'),(103,3,'2026-01-12','paid');
INSERT INTO order_items VALUES (100,10,2,30,0),(100,11,3,10,0),(101,12,1,120,0.10),(102,11,5,10,0);
