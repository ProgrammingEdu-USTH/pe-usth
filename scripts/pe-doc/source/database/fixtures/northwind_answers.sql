-- PE solutions for the reconstructed northwind_pe fixture.
-- Run northwind_pe.sql before each complete attempt.
USE northwind_pe;
-- P2.01 discontinued id/name.
SELECT id,product_name FROM products WHERE discontinued=1;
-- P2.02 exactly four rows; ties broken by id.
SELECT id,product_name,list_price FROM products ORDER BY list_price,id LIMIT 4;
-- P2.03 inclusive endpoints.
SELECT id,product_name,list_price FROM products WHERE list_price BETWEEN 15 AND 25 ORDER BY id;
-- P2.04 full_name convention first + space + last; components NOT NULL here.
SELECT id,CONCAT(first_name,' ',last_name) AS full_name FROM employees ORDER BY id;
-- P2.05 first_name prefix A; ai_ci collation is case/accent-insensitive.
SELECT id,first_name,last_name FROM employees WHERE first_name LIKE 'A%' ORDER BY id;
-- P2.06 ignore unknown city, do not count NULL as a named city.
SELECT COUNT(DISTINCT city) AS known_cities FROM employees;
-- P2.07 distinct ship_name.
SELECT DISTINCT ship_name FROM orders ORDER BY ship_name;
-- P2.08 minimum maximum.
SELECT MIN(list_price) AS min_price,MAX(list_price) AS max_price FROM products;
-- P2.09 current products.
SELECT COUNT(*) AS current_products FROM products WHERE discontinued=0;
-- P2.10 choose population standard deviation; sample uses STDDEV_SAMP.
SELECT AVG(list_price) AS avg_price,STDDEV_POP(list_price) AS std_price FROM products;
-- P2.11 scalar subquery.
SELECT product_name,list_price FROM products WHERE list_price>(SELECT AVG(list_price) FROM products) ORDER BY id;
-- P2.12-15 one transaction; keep inserted id by connection variable, no hard-coded auto id.
START TRANSACTION;
INSERT INTO suppliers(company,last_name,first_name,city,country_region) VALUES('Habeco','Nguyễn','Hồng Linh','Hanoi','Vietnam');
SET @habeco_id=LAST_INSERT_ID();
INSERT INTO products(product_code,product_name,supplier_id,list_price,discontinued,category) VALUES('TBTruc Bach','Truc Bach',@habeco_id,22,0,'Beverages');
UPDATE products SET standard_cost=18 WHERE product_code='TBTruc Bach';
-- Expected FK failure; DO NOT run in batch unless intentionally testing it separately:
-- DELETE FROM suppliers WHERE id=@habeco_id;
-- It must fail while products references that supplier. Parent-first delete is not allowed.
ROLLBACK;
-- P3.01 strict after date, not inclusive.
SELECT * FROM orders WHERE order_date>'2006-03-24' ORDER BY id;
-- P3.02 line amount uses historical unit_price, not current list_price.
SELECT p.product_code,d.unit_price,d.quantity,d.unit_price*d.quantity*(1-d.discount) AS value
FROM order_details d JOIN products p ON p.id=d.product_id WHERE d.order_id=31 ORDER BY p.id;
-- P3.03 only orders with detail rows; P3.04 deliberately keeps empty orders.
SELECT o.id,o.order_date,c.company,d.unit_price*d.quantity*(1-d.discount) AS value
FROM orders o JOIN customers c ON c.id=o.customer_id JOIN order_details d ON d.order_id=o.id
WHERE o.order_date>'2006-03-24' ORDER BY o.id,d.product_id;
-- P3.04 all orders after date; empty subtotal=0 by explicit reporting convention.
SELECT o.id,o.order_date,c.company,COALESCE(SUM(d.unit_price*d.quantity*(1-d.discount)),0) AS sub_total
FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN order_details d ON d.order_id=o.id
WHERE o.order_date>'2006-03-24' GROUP BY o.id,o.order_date,c.company ORDER BY o.id;
-- P3.05 subtotal >= 800.
SELECT o.id,o.order_date,c.company,SUM(d.unit_price*d.quantity*(1-d.discount)) AS sub_total
FROM orders o JOIN customers c ON c.id=o.customer_id JOIN order_details d ON d.order_id=o.id
WHERE o.order_date>'2006-03-24' GROUP BY o.id,o.order_date,c.company
HAVING SUM(d.unit_price*d.quantity*(1-d.discount))>=800 ORDER BY o.id;
-- P3.06 all orders, no date filter; strict >1000; use employee id to disambiguate names.
SELECT e.id,CONCAT(e.first_name,' ',e.last_name) AS full_name,SUM(d.unit_price*d.quantity*(1-d.discount)) AS sale
FROM employees e JOIN orders o ON o.employee_id=e.id JOIN order_details d ON d.order_id=o.id
GROUP BY e.id,e.first_name,e.last_name HAVING SUM(d.unit_price*d.quantity*(1-d.discount))>1000
ORDER BY sale DESC,e.id;
-- P3.07 categories.
SELECT DISTINCT category FROM products ORDER BY category;
-- P3.08 population conventions.
SELECT MIN(standard_cost),MAX(standard_cost),AVG(standard_cost),STDDEV_POP(standard_cost),VAR_POP(standard_cost) FROM products;
-- P3.09 mean list price by category.
SELECT category,AVG(list_price) AS avg_price FROM products GROUP BY category ORDER BY category;
-- P3.10 NULL fees omitted by aggregates; optionally report COUNT(shipping_fee) to expose denominator.
SELECT ship_city,MAX(shipping_fee) AS max_fee,AVG(shipping_fee) AS avg_fee FROM orders GROUP BY ship_city ORDER BY ship_city;
-- P3.11 n rows with deterministic tie break. n>=1 required; validation in stored procedure.
DROP PROCEDURE IF EXISTS top_categories;
DELIMITER $$
CREATE PROCEDURE top_categories(IN p_n INT)
BEGIN
 IF p_n IS NULL OR p_n<1 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='n must be a positive integer';
 END IF;
 SELECT category,AVG(list_price) AS avg_price FROM products
 GROUP BY category ORDER BY avg_price DESC,category LIMIT p_n;
END$$
DELIMITER ;
CALL top_categories(2);
-- P3.12 a derived table forms the first level; nesting MIN(AVG()) directly is invalid here.
SELECT MIN(t.avg_price) AS minimum_category_average
FROM (SELECT category,AVG(list_price) AS avg_price FROM products GROUP BY category) AS t;
-- P3.13 left join approver so unapproved purchase order remains visible.
SELECT p.id,CONCAT(c.first_name,' ',c.last_name) AS created_by_name,
 CONCAT(a.first_name,' ',a.last_name) AS approved_by_name
FROM purchase_orders p JOIN employees c ON c.id=p.created_by LEFT JOIN employees a ON a.id=p.approved_by ORDER BY p.id;
-- P3.14 retain each partner record; type is part of output.
SELECT company,CONCAT_WS(' ',first_name,last_name) AS full_name,email_address,'C' AS type FROM customers
UNION ALL
SELECT company,CONCAT_WS(' ',first_name,last_name),email_address,'S' AS type FROM suppliers
ORDER BY type,company;
-- P3.15 purchased at least once and never sold; existence avoids duplicate multiplication.
SELECT p.id,p.product_name FROM products p
WHERE EXISTS(SELECT 1 FROM purchase_order_details b WHERE b.product_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM order_details s WHERE s.product_id=p.id) ORDER BY p.id;
