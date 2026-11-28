# USTH11 · Northwind: định nghĩa báo cáo rồi tự viết query

Học cùng USTH04, AD10, AD60 và USTH09. Bài này triển khai đủ nhóm reports của Lecture 9 trang 28–36 bằng fixture PE mới. Đây không phải dữ liệu gốc Northwind; không lấy các số trong biểu đồ nguồn làm expected output cho fixture khác.

Một đơn có hai dòng Tea và Coffee. Đếm các dòng sau join sẽ cho 2, nhưng số đơn vẫn là 1. Trước mỗi query, viết một câu nói rõ một dòng kết quả đại diện cho sản phẩm, đơn, nhân viên hay nhóm địa lý. Đây là cách tránh đổi nghĩa phép đếm khi thêm join.

## Dữ liệu và quy ước của bài

Backend nạp `fixtures/usth09_northwind.sql` vào database trống riêng cho lượt làm. Bản SQL đầy đủ ở cuối bài để PDF/Markdown vẫn tự học được. Tiền dùng DECIMAL, discount trong [0,1]. `unit_price` là giá lịch sử ở line, `list_price` là giá danh mục hiện tại. Product 1 từng bán giá 18 dù list_price là 20.

Các reports doanh số mặc định tính mọi dòng đơn hiện có, gồm Open; đây là policy của bài. Nếu chỉ tính Closed thì phải đổi predicate và expected cùng nhau. Shipping fee tách khỏi tiền hàng. Đơn không line có subtotal 0 theo quy ước báo cáo; khách/nhân viên không đơn vẫn có count 0 khi đề yêu cầu mọi người. AVG bỏ NULL; không tự coi phí chưa biết là phí 0.

“Bán nhiều nhất” ở bài 2 là tổng quantity, không phải số đơn chứa sản phẩm hay doanh thu. “Chênh lệch giá” ở bài 1 là list_price-standard_cost, không phải trị tuyệt đối. Top/max giữ mọi người đồng hạng, trừ khi đề nói rõ lấy đúng một. STDDEV dùng population; bài sample phải đổi hàm và mẫu số. [MySQL: aggregate functions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html).

## Làm thử trên một đơn

```sql
SELECT product_id,quantity,unit_price,discount,
       quantity*unit_price*(1-discount) AS line_value
FROM u9_order_line WHERE order_id=31 ORDER BY product_id;
```

Hai giá trị là 200 và 54; subtotal đơn 31 là 254. Thay bằng giá danh mục hiện tại có thể làm sai đơn khác: dòng Tea ở đơn 33 là 100×18=1800, không phải 100×20=2000.

Ta tạo hai view hỗ trợ, một row mỗi Order và một row mỗi Employee. Chúng giúp nhìn rõ grain; bạn có thể thay bằng CTE/query tương đương khi tự làm.

```sql
CREATE VIEW u9_order_total AS
SELECT o.id,COALESCE(SUM(l.quantity*l.unit_price*(1-l.discount)),0) AS subtotal
FROM u9_orders o LEFT JOIN u9_order_line l ON l.order_id=o.id
GROUP BY o.id;
```

```sql
CREATE VIEW u9_employee_order_count AS
SELECT e.id,COUNT(o.id) AS order_count
FROM u9_employee e LEFT JOIN u9_orders o ON o.employee_id=e.id
GROUP BY e.id;
```

Employee 3 không có đơn. LEFT JOIN tạo một row mở rộng NULL; COUNT(o.id)=0 nhưng COUNT(*)=1. View thứ hai dùng COUNT trên key đơn thật để không tạo ra một đơn giả.

## Đọc biểu đồ cũng là xác nhận requirement

Biểu đồ nguồn gồm doanh thu annualized so với 12 tháng, doanh thu theo sales rep, số khách theo region/country và số đơn theo region/country; trang 32/33 lặp cùng một loại chart. Trước khi vẽ cần chốt khoảng ngày, ngày ghi nhận, đơn vị tiền, status, refunds, grain và cách xử lý nhóm chưa có đơn. “Customer theo country” đếm khách; “Order theo country” đếm đơn và cần đường join tới thuộc tính địa lý, không đếm lại khách sau join.

Ví dụ mới: doanh thu 75 trong 10 tháng, annualize tuyến tính thành 75/10×12=90; doanh thu thật của 12 tháng khác là 108. 90 là số quy đổi, không phải quan sát đủ 12 tháng và không chứng minh tăng trưởng nếu các kỳ/mùa/status khác nhau. Không đọc chiều cao hai cột thành quan hệ nhân quả.

Fixture dùng region/country hiện tại của Customer cho báo cáo địa lý. Nếu cần địa chỉ tại lúc bán, thêm snapshot/geographic key ở Order và đổi query; đừng tự đổi dữ liệu lịch sử khi khách cập nhật hồ sơ. Những thứ tự alphabet trong bài phụ thuộc collation đã khai báo cho sandbox.

## Luyện tập

1. Trả mọi cột của sản phẩm có chênh lệch list_price-standard_cost lớn nhất; giữ ties.
2. Tìm sản phẩm có tổng quantity được đặt nhiều nhất; ghi tổng và xử lý đồng hạng.
3. Tính AVG list_price trên mỗi sản phẩm trong danh mục.
4. Tính AVG và STDDEV_POP list_price theo category, không nhân sản phẩm theo số lần bán.
5. Đếm nhân viên trong mỗi city; ghi cách xử lý city chưa biết.
6. Đếm sản phẩm trong mỗi category.
7. Trả các category cùng AVG giá, xếp tăng theo AVG, phá hòa trình bày theo category.
8. Tìm product_name chưa từng có order line.
9. Trả mỗi Customer ID cùng số đơn, giữ khách chưa có đơn.
10. Tìm mọi Employee ID có số đơn cao nhất.
11. Trả last_name của các nhân viên ở câu 10; không group theo last_name để tìm người.
12. Tính subtotal của từng Order ID bằng công thức dòng; giữ đơn chưa có line.
13. Trả các Order ID có subtotal>1500, xếp subtotal giảm dần.
14. Đếm số đơn mỗi Employee ID, kể cả người có 0.
15. Trả Product ID, Product Name, Sale cho mỗi sản phẩm; sale là tiền dòng sau discount, không cộng phí vận chuyển.
16. Trả các sản phẩm có list_price lớn hơn AVG toàn danh mục.
17. Với orders status Closed, tính AVG shipping_fee mỗi ship_city, giữ nhóm AVG>=100 và xếp AVG tăng dần.
18. Trả Product Name, List Price, Category, AVG Price of Category cho sản phẩm đắt hơn AVG category của chính nó.
19. Tính số ngày xử lý trung bình của mỗi Employee từ order_date đến shipped_date; chỉ các đơn có shipped_date góp vào mẫu số. Giữ người chưa có mẫu bằng NULL.
20. Trả Customer Company, Employee Last Name, Order Date, Order Status Name cho mỗi đơn.
21. Quy đổi ví dụ 75/10 tháng sang annualized; nêu ba thông tin còn thiếu trước khi so với 108/12 tháng.
22. Viết report doanh thu theo Employee để cấp dữ liệu chart sales rep; giữ người chưa có đơn và nói rõ status được tính.
23. Viết hai reports số Customers theo region và theo country. Một khách có ba đơn có bị đếm ba lần không?
24. Viết hai reports số Orders theo region và theo country của Customer, giữ nhóm địa lý chưa có đơn nếu có Customer. So sánh grain với câu 23.

## Gợi ý

Đếm key của sự kiện cần đếm. GROUP BY ID trước rồi thêm tên hiển thị. Muốn giữ đối tượng chưa có con, bắt đầu ở bảng cha và kiểm predicate đặt ở ON hay WHERE. Đưa tổng về đúng grain trước khi join một quan hệ nhiều dòng khác.

## Đáp án và lập luận

1. Product 5 (Machine), gap 80. So với MAX giữ mọi tie; ORDER BY chỉ quyết định trình bày.

```sql
-- L9.R01
SELECT p.* FROM u9_product p
WHERE p.list_price-p.standard_cost=
 (SELECT MAX(list_price-standard_cost) FROM u9_product)
ORDER BY p.id;
```

2. Product 1, quantity 110. Đây là tổng số đơn vị được đặt, không phải số line hay tiền.

```sql
-- L9.R02
WITH q AS (SELECT product_id,SUM(quantity) AS units
 FROM u9_order_line GROUP BY product_id)
SELECT p.id,p.product_name,q.units FROM q
JOIN u9_product p ON p.id=q.product_id
WHERE q.units=(SELECT MAX(units) FROM q) ORDER BY p.id;
```

3. AVG=220/6=110/3. Query chỉ đọc Product, không join lines.

```sql
-- L9.R03
SELECT AVG(list_price) AS average_price FROM u9_product;
```

4. A: AVG 25, STD 5; B: AVG 70/3, STD khoảng 18.856181; C: AVG 100, STD 0. Một product có nhiều line không được góp nhiều lần.

```sql
-- L9.R04
SELECT category,AVG(list_price) AS avg_price,STDDEV_POP(list_price) AS std_price
FROM u9_product GROUP BY category ORDER BY category;
```

5. Hanoi=2, Hue=1, NULL=1. Nhóm NULL là những city chưa biết, không phải một thành phố có tên “NULL”.

```sql
-- L9.R05
SELECT city,COUNT(*) AS employees FROM u9_employee GROUP BY city ORDER BY city;
```

6. A=2, B=3, C=1.

```sql
-- L9.R06
SELECT category,COUNT(*) AS products FROM u9_product GROUP BY category ORDER BY category;
```

7. B trước A trước C: 70/3,25,100.

```sql
-- L9.R07
SELECT category,AVG(list_price) AS avg_price FROM u9_product
GROUP BY category ORDER BY avg_price,category;
```

8. Product 6, Ruler. NOT EXISTS không bị một NULL ở subquery biến thành bẫy NOT IN.

```sql
-- L9.R08
SELECT p.id,p.product_name FROM u9_product p
WHERE NOT EXISTS(SELECT 1 FROM u9_order_line l WHERE l.product_id=p.id)
ORDER BY p.id;
```

9. Customer 21→3,22→2,23→1,24→0.

```sql
-- L9.R09
SELECT c.id,COUNT(o.id) AS order_count FROM u9_customer c
LEFT JOIN u9_orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY c.id;
```

10. Employee 2 có 4 đơn. View count đã có một row/người; so với MAX giữ ties.

```sql
-- L9.R10
SELECT id,order_count FROM u9_employee_order_count
WHERE order_count=(SELECT MAX(order_count) FROM u9_employee_order_count)
ORDER BY id;
```

11. Employee 2, Le. Hai người có cùng last_name vẫn phải được xem là hai người.

```sql
-- L9.R11
SELECT e.id,e.last_name FROM u9_employee e
JOIN u9_employee_order_count n ON n.id=e.id
WHERE n.order_count=(SELECT MAX(order_count) FROM u9_employee_order_count)
ORDER BY e.id;
```

12. Orders 31→254,32→2000,33→1850,34→80,35→225,36→0. SUM tập rỗng được đổi thành 0 trong view theo policy.

```sql
-- L9.R12
SELECT id,subtotal FROM u9_order_total ORDER BY id;
```

13. 32/2000 rồi 33/1850. >1500 khác >=1500 khi thêm ca đúng biên.

```sql
-- L9.R13
SELECT id,subtotal FROM u9_order_total WHERE subtotal>1500
ORDER BY subtotal DESC,id;
```

14. Employee 1→2,2→4,3→0,4→0. COUNT(*) sau LEFT JOIN sẽ sai ở người chưa có đơn.

```sql
-- L9.R14
SELECT id,order_count FROM u9_employee_order_count ORDER BY id;
```

15. Product 1→2000,2→134,3→50,4→225,5→2000,6→0. Hai sản phẩm cùng sale vẫn là hai rows.

```sql
-- L9.R15
SELECT p.id,p.product_name,COALESCE(SUM(l.quantity*l.unit_price*(1-l.discount)),0) AS sale
FROM u9_product p LEFT JOIN u9_order_line l ON l.product_id=p.id
GROUP BY p.id,p.product_name ORDER BY p.id;
```

16. Product 4 giá 50 và Product 5 giá 100.

```sql
-- L9.R16
SELECT id,product_name,list_price FROM u9_product
WHERE list_price>(SELECT AVG(list_price) FROM u9_product) ORDER BY id;
```

17. Hanoi/100, Hue/100, Paris/125. WHERE chọn đơn trước khi GROUP; HAVING lọc AVG sau group. Phí NULL không được coi là 0.

```sql
-- L9.R17
SELECT o.ship_city,AVG(o.shipping_fee) AS average_fee
FROM u9_orders o JOIN u9_status s ON s.id=o.status_id
WHERE s.name='Closed' GROUP BY o.ship_city
HAVING AVG(o.shipping_fee)>=100 ORDER BY average_fee,o.ship_city;
```

18. Coffee/30/A/25 và Notebook/50/B/70/3. Machine bằng AVG của category C nên không qua dấu >.

```sql
-- L9.R18
WITH a AS (SELECT category,AVG(list_price) AS avg_price
 FROM u9_product GROUP BY category)
SELECT p.product_name,p.list_price,p.category,a.avg_price
FROM u9_product p JOIN a ON a.category=p.category
WHERE p.list_price>a.avg_price ORDER BY p.id;
```

19. Employee 1→3.5 ngày,2→2 ngày,3/4→NULL. DATEDIFF chỉ dùng phần ngày; nếu cần thời lượng theo giờ/giây thì phải đổi định nghĩa, không coi hai phép tính tương đương. [MySQL: DATEDIFF](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html).

```sql
-- L9.R19
SELECT e.id,AVG(DATEDIFF(o.shipped_date,o.order_date)) AS average_days
FROM u9_employee e LEFT JOIN u9_orders o
ON o.employee_id=e.id AND o.shipped_date IS NOT NULL
GROUP BY e.id ORDER BY e.id;
```

20. Có 6 rows tương ứng 6 đơn, với đúng bốn cột đề yêu cầu. ORDER BY o.id giúp đối chiếu fixture mà không cần đưa ID vào projection.

```sql
-- L9.R20
SELECT c.company,e.last_name,o.order_date,s.name AS status_name
FROM u9_orders o JOIN u9_customer c ON c.id=o.customer_id
JOIN u9_employee e ON e.id=o.employee_id
JOIN u9_status s ON s.id=o.status_id ORDER BY o.id;
```

21. Annualized=90. Cần ít nhất khoảng ngày/cohort, quy tắc status/returns và đơn vị tiền/cách annualize. Mùa vụ hoặc 10 tháng khác 12 tháng có thể làm phép so chưa cùng cơ sở. 90 là số quy đổi; 108 là quan sát của kỳ khác trong ví dụ, không phải số từ fixture.

22. Employee 1→2254,2→2155,3/4→0 theo policy mọi dòng đơn. Muốn Closed-only phải lọc Order và tính lại, không giữ expected cũ.

```sql
-- L9.R22
SELECT e.id,e.last_name,COALESCE(SUM(t.subtotal),0) AS sale
FROM u9_employee e LEFT JOIN u9_orders o ON o.employee_id=e.id
LEFT JOIN u9_order_total t ON t.id=o.id
GROUP BY e.id,e.last_name ORDER BY e.id;
```

23. Regions Asia=2, Europe=1, North America=1; countries France=1, USA=1, Vietnam=2. Chỉ đọc Customer nên một khách có ba đơn vẫn đếm một lần.

```sql
-- L9.R23a
SELECT region,COUNT(*) AS customers FROM u9_customer GROUP BY region ORDER BY region;
```

```sql
-- L9.R23b
SELECT country,COUNT(*) AS customers FROM u9_customer GROUP BY country ORDER BY country;
```

24. Regions Asia=4, Europe=2, North America=0; countries France=2, USA=0, Vietnam=4. Đếm o.id vì nhóm có Customer chưa có Order vẫn phải là 0. Nếu yêu cầu cả vùng chưa có Customer thì cần bảng dimension vùng làm gốc, không chỉ nhóm Customer.

```sql
-- L9.R24a
SELECT c.region,COUNT(o.id) AS orders FROM u9_customer c
LEFT JOIN u9_orders o ON o.customer_id=c.id GROUP BY c.region ORDER BY c.region;
```

```sql
-- L9.R24b
SELECT c.country,COUNT(o.id) AS orders FROM u9_customer c
LEFT JOIN u9_orders o ON o.customer_id=c.id GROUP BY c.country ORDER BY c.country;
```

## Biến thể và cách kiểm

Đổi dữ liệu có ý nghĩa: hai nhân viên trùng tên, người đồng hạng, một order đúng biên 1500, hai lines bằng tiền, giá danh mục đổi, fee NULL và người chưa có con. Chấm bag/schema, thứ tự khi đề yêu cầu và numeric tolerance phù hợp hàm thống kê. Reference query chạy trong bản fixture độc lập; code người học không được sửa expected.

## Học trên web

Trước khi mở editor trống, luân phiên dự đoán rows, chọn grain, sửa một query sai COUNT/WHERE/HAVING, rồi tự viết report mới. Output ghi engine/version/seed và fixture hash. Với chart, browser nhận dữ liệu của query đã chạy, không thay chart chuẩn bị thành log giả. Giữ phần reminder đúng kỹ năng đang thiếu; kết quả tự làm ghi riêng với lượt có gợi ý.

## Fixture đầy đủ

Các constraint NOT NULL/CHECK/UNIQUE và một invoice mỗi order là lựa chọn PE được nêu cho fixture này; chúng chưa là toàn bộ business policy. Ví dụ issued_at và status Closed liên bảng chưa tự được FK Invoice thực thi. Mô hình M:N lines ở đây chỉ cho mỗi product một line/order; brief cho lặp phải thêm line identity như USTH08.

```sql
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

```

## Nguồn và đối chiếu

Lecture 9 trang 28–36, gồm đủ 20 requests chữ và các nhóm chart trang 28–34; trang 32/33 lặp cùng loại report. Fixture/query/giải thích được viết cho PE; không có nguyên bản dump hay bằng chứng khớp các số trong ảnh gốc. USTH09 giải thích quy trình xác nhận requirement; USTH04 và AD10 cung cấp nền join/group/window. Việc chạy engine chọn lọc được ghi riêng trong báo cáo QA, không suy từ một SQL block có trong tài liệu.
