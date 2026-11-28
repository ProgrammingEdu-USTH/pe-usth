-- PE-authored teaching fixture, not an original Northwind/USTH dump.
-- Backend supplies a new empty sandbox database. No CREATE/USE/DROP database here.
CREATE TABLE u9_employee(
 id INT PRIMARY KEY,first_name VARCHAR(50) NOT NULL,last_name VARCHAR(50) NOT NULL,
 city VARCHAR(60) NULL
) ENGINE=InnoDB;
CREATE TABLE u9_customer(
 id INT PRIMARY KEY,company VARCHAR(80) NOT NULL,email VARCHAR(120) NOT NULL UNIQUE,
 phone VARCHAR(30),address VARCHAR(150),country VARCHAR(60),region VARCHAR(60)
) ENGINE=InnoDB;
CREATE TABLE u9_supplier(
 id INT PRIMARY KEY,company VARCHAR(80) NOT NULL,email VARCHAR(120) NOT NULL UNIQUE,
 phone VARCHAR(30),address VARCHAR(150)
) ENGINE=InnoDB;
CREATE TABLE u9_product(
 id INT PRIMARY KEY,product_code VARCHAR(30) NOT NULL UNIQUE,product_name VARCHAR(80) NOT NULL,
 category VARCHAR(40) NOT NULL,list_price DECIMAL(10,2) NOT NULL,
 standard_cost DECIMAL(10,2) NOT NULL,discontinued BOOLEAN NOT NULL DEFAULT 0,
 CHECK(list_price>=0),CHECK(standard_cost>=0)
) ENGINE=InnoDB;
CREATE TABLE u9_shipper(id INT PRIMARY KEY,company VARCHAR(80) NOT NULL) ENGINE=InnoDB;
CREATE TABLE u9_status(id INT PRIMARY KEY,name VARCHAR(30) NOT NULL UNIQUE) ENGINE=InnoDB;
CREATE TABLE u9_orders(
 id INT PRIMARY KEY,order_code VARCHAR(30) NOT NULL UNIQUE,order_date DATE NOT NULL,
 customer_id INT NOT NULL,employee_id INT NOT NULL,shipper_id INT NULL,status_id INT NOT NULL,
 ship_city VARCHAR(60) NULL,shipping_fee DECIMAL(10,2) NULL,shipped_date DATE NULL,
 FOREIGN KEY(customer_id) REFERENCES u9_customer(id),
 FOREIGN KEY(employee_id) REFERENCES u9_employee(id),
 FOREIGN KEY(shipper_id) REFERENCES u9_shipper(id),
 FOREIGN KEY(status_id) REFERENCES u9_status(id),
 CHECK(shipping_fee>=0),CHECK(shipped_date>=order_date)
) ENGINE=InnoDB;
CREATE TABLE u9_order_line(
 order_id INT NOT NULL,product_id INT NOT NULL,quantity INT NOT NULL,
 unit_price DECIMAL(10,2) NOT NULL,discount DECIMAL(5,4) NOT NULL DEFAULT 0,
 PRIMARY KEY(order_id,product_id),
 FOREIGN KEY(order_id) REFERENCES u9_orders(id),
 FOREIGN KEY(product_id) REFERENCES u9_product(id),
 CHECK(quantity>0),CHECK(unit_price>=0),CHECK(discount BETWEEN 0 AND 1)
) ENGINE=InnoDB;
CREATE TABLE u9_po(
 id INT PRIMARY KEY,supplier_id INT NOT NULL,ordinal_number INT NOT NULL,
 created_at DATE NOT NULL,payment_method VARCHAR(20) NOT NULL,
 created_by INT NOT NULL,approved_by INT NULL,
 UNIQUE(supplier_id,ordinal_number),
 FOREIGN KEY(supplier_id) REFERENCES u9_supplier(id),
 FOREIGN KEY(created_by) REFERENCES u9_employee(id),
 FOREIGN KEY(approved_by) REFERENCES u9_employee(id),
 CHECK(payment_method IN('cash','check','transfer'))
) ENGINE=InnoDB;
CREATE TABLE u9_po_line(
 po_id INT NOT NULL,product_id INT NOT NULL,quantity INT NOT NULL,
 unit_cost DECIMAL(10,2) NOT NULL,PRIMARY KEY(po_id,product_id),
 FOREIGN KEY(po_id) REFERENCES u9_po(id),FOREIGN KEY(product_id) REFERENCES u9_product(id),
 CHECK(quantity>0),CHECK(unit_cost>=0)
) ENGINE=InnoDB;
CREATE TABLE u9_invoice(
 id INT PRIMARY KEY,order_id INT NOT NULL UNIQUE,issued_at DATE NOT NULL,
 FOREIGN KEY(order_id) REFERENCES u9_orders(id)
) ENGINE=InnoDB;
INSERT INTO u9_employee VALUES(1,'An','Nguyen','Hanoi'),(2,'Binh','Le','Hue'),
 (3,'Chi','Tran','Hanoi'),(4,'Dung','Vu',NULL);
INSERT INTO u9_customer VALUES
 (21,'Blue Lab','blue@example.invalid','01','Hanoi','Vietnam','Asia'),
 (22,'Green Lab','green@example.invalid','02','Paris','France','Europe'),
 (23,'Quiet Lab','quiet@example.invalid','03','Hue','Vietnam','Asia'),
 (24,'Empty Lab','empty@example.invalid','04','NY','USA','North America');
INSERT INTO u9_supplier VALUES
 (101,'Viet Trade','viet@example.invalid','11','Hanoi'),
 (102,'Paper House','paper@example.invalid','12','Hue');
INSERT INTO u9_product VALUES
 (1,'TEA','Tea','A',20,10,0),(2,'COF','Coffee','A',30,15,0),
 (3,'PEN','Pen','B',10,4,0),(4,'NOTE','Notebook','B',50,20,0),
 (5,'MAC','Machine','C',100,20,0),(6,'RUL','Ruler','B',10,5,1);
INSERT INTO u9_shipper VALUES(1,'Quick'),(2,'Slow');
INSERT INTO u9_status VALUES(1,'Open'),(2,'Closed'),(3,'Cancelled');
INSERT INTO u9_orders VALUES
 (31,'O31','2026-01-10',21,1,1,2,'Hanoi',100,'2026-01-12'),
 (32,'O32','2026-01-11',22,1,1,2,'Paris',200,'2026-01-16'),
 (33,'O33','2026-01-12',21,2,2,1,'Hanoi',NULL,NULL),
 (34,'O34','2026-01-13',23,2,2,2,'Hue',100,'2026-01-14'),
 (35,'O35','2026-01-14',22,2,1,2,'Paris',50,'2026-01-17'),
 (36,'O36','2026-01-15',21,2,NULL,1,'Hanoi',20,NULL);
INSERT INTO u9_order_line VALUES
 (31,1,10,20,0),(31,2,2,30,0.1),(32,5,20,100,0),
 (33,1,100,18,0),(33,3,5,10,0),(34,2,4,25,0.2),(35,4,5,45,0);
INSERT INTO u9_po VALUES
 (81,101,1,'2026-01-01','transfer',1,2),
 (82,102,1,'2026-01-02','cash',3,NULL);
INSERT INTO u9_po_line VALUES(81,1,200,10),(82,3,100,4),(82,6,20,5);
INSERT INTO u9_invoice VALUES(91,31,'2026-01-12'),(92,32,'2026-01-16');
