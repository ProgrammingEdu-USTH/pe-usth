# USTH10 · Ba practice USTH trên web: dựng schema, query và giữ trạng thái sau lỗi

Học cùng USTH03–USTH05 và AD60. Bài này giữ sáu nhiệm vụ Company của Practice 1 cùng 15 nhiệm vụ mỗi Practice 2/3. Các ảnh thao tác cài đặt/kết nối được chuyển thành kiến thức client–server và thao tác tương ứng trên web; học viên không phải cài MySQL, XAMPP hay Workbench.

Một query có thể đúng ở lượt đầu nhưng sai ở lượt sau vì bạn đã thêm một supplier và sản phẩm. Khi đọc expected, cần biết fixture nào đang dùng và những thao tác trước đã commit hay rollback. Vì vậy mỗi lượt trong bài có schema/seed riêng và nút reset phục hồi đúng phiên bản fixture.

## Từ màn hình Workbench đến web editor

MySQL Server giữ và thực thi trên dữ liệu; mysql CLI, MySQL Workbench và phpMyAdmin là các cách tương tác với server. Trình duyệt của khóa gửi yêu cầu tới backend, backend dùng connection tới sandbox; đóng tab không tự chứng minh transaction đã được rollback.

Kết nối cần host, port, user và thông tin xác thực. Classic protocol thường dùng port 3306 nhưng cấu hình có thể đổi; tên connection trong Workbench chỉ là nhãn lưu cấu hình, không phải tên database. Test Connection kiểm đường kết nối/xác thực, chưa chứng minh schema hay mọi quyền đúng. [MySQL: connection options](https://dev.mysql.com/doc/refman/8.4/en/connection-options.html).

Nguồn Practice 1 giới thiệu official installer hoặc XAMPP, mở xampp-control, bật dịch vụ rồi mở phpMyAdmin; cũng minh họa tạo connection Workbench, nhập thông số và chạy phần SQL được chọn bằng Ctrl+Enter/nút Run. Trên web, các bước tương ứng là cấp environment, probe kết nối, chọn database của lượt, chạy statement/selection và xem rows/errors. Chi tiết vận hành server thuộc backend của khóa. XAMPP có thể dùng MariaDB dù giao diện gọi dịch vụ là MySQL; phải kiểm `SELECT VERSION()` thay vì coi tên nút là bằng chứng engine. [Apache Friends: XAMPP FAQ](https://www.apachefriends.org/faq_linux).

```sql
SELECT VERSION() AS engine_version,DATABASE() AS current_database;
```

Đây là probe bạn có thể chạy trong editor của đúng lượt. `SHOW DATABASES` trong nguồn liệt kê database theo quyền tài khoản; ở khóa này không yêu cầu tài khoản quản trị. Client CLI có chế độ interactive nhận từng lệnh và chế độ batch đọc SQL đã chuẩn bị; cả hai vẫn gửi công việc tới server. Prompt `mysql>` là của client CLI, không phải phần phải chép vào SQL. Các lệnh shell cài/chạy service chỉ được giảng để hiểu kiến trúc, không là bước nộp bài của học viên.

## Company: nhìn cả cột lẫn constraint

Hình Practice 1 trang 5 có sáu tables: Employee, Department, DeptLocations, Project, WorksOn, Dependent. Minit là cột riêng của Employee; Ssn là chuỗi định danh giữ số 0 đầu. Dependent_name chỉ phân biệt trong Employee theo giả định nguồn. WorksOn có grain cặp employee/project và Hours thuộc cặp đó.

Employee trỏ Department, Department trỏ Employee quản lý: tạo bảng có vòng FK cần hai bước; nạp dữ liệu còn cần thứ tự phù hợp. Mẫu dưới cho manager NULL lúc bootstrap rồi cập nhật sau khi Employee tồn tại. Đây là lựa chọn nạp dữ liệu, không phải suy mọi Department nghiệp vụ đều được thiếu manager vĩnh viễn. Các CHECK/NOT NULL ngoài hình là policy PE được ghi trong DDL.

Partner_ssn là yêu cầu thêm cột, NULL khi độc thân. FK chỉ kiểm người được trỏ có thật; nó chưa ngăn self-partner, nhiều người cùng trỏ hoặc thiếu symmetry. Nếu brief bổ sung các quy tắc đó, cần model/transaction kiểm đủ như USTH06/AD60.

## Northwind: dùng đúng fixture và đúng cột

Practice 2/3 được thử trên bản PE `baseline/fixtures/northwind_pe.sql`, đã dựng lại vì không có dump lớp. Schema dùng `product_name`, `supplier_id`, `orders.id` để thống nhất các tên khác nhau trong đề. Nó khác fixture u9_* của USTH11; không trộn expected hai bộ.

Backend tạo database mới và nạp **phần CREATE TABLE/INSERT** của fixture, bỏ các lệnh CREATE/USE/DROP hướng tới tên dùng chung. Khi gọi reset, backend chỉ thay sandbox của lượt. Learner không chạy script quản trị raw của bản baseline trên một server chứa dữ liệu khác. SQL đầy đủ và rows được giữ ở cuối bài để bản PDF/Markdown vẫn tự đọc được.

Top 4 lấy đúng bốn rows, giá tăng rồi ID để phá hòa. “Tên bắt đầu A” trong lời giải chọn first_name, theo collation sandbox. Giá 15–25 gồm hai đầu. “Sau 2006-03-24” dùng > trên DATE. Giá trị line là unit_price×quantity×(1-discount), không phải list_price hiện tại và không gồm shipping_fee. Population STD/VAR dùng STDDEV_POP/VAR_POP. NULL fee chưa biết không được đổi thành 0 để tính AVG mà không đổi yêu cầu.

Ví dụ đơn 31 có hai line trị giá 540 và 500, subtotal 1040. Order 34 chưa có detail vẫn hiện subtotal 0 khi brief yêu cầu mọi đơn. PO 81 chưa duyệt vẫn hiện approver NULL khi report yêu cầu mọi PO. Hai ví dụ này dùng LEFT JOIN có chủ ý; INNER JOIN vẫn phù hợp khi chỉ cần những đối tượng có con.

## Luyện tập

1. **P1.01:** Viết SQL tạo database Company; chỉ ra backend web cấp/chọn namespace của lượt như thế nào.
2. **P1.02:** Chọn Company làm default working database, rồi probe để biết connection đang ở database nào. Phân biệt nhãn connection, database, client/server và kết nối thành công với query đúng.
3. **P1.03:** Từ hình sáu bảng, viết đủ columns/types/PK và tám FK nguồn; giữ Minit. Giải thích thứ tự tạo bảng và nạp vòng Employee–Department.
4. **P1.04:** Thêm Partner_ssn, NULL khi độc thân. Nêu điều FK làm được và ba quy tắc nó chưa tự làm.
5. **P1.05:** Nạp sample hợp lệ vào sáu tables, có mã giữ số 0, Minit và NULL. Đọc lại fields để kiểm round-trip; thử một FK không hợp lệ.
6. **P1.06:** Xóa các bảng của sandbox Company theo dependency, xử lý FK vòng mà không tắt kiểm FK toàn server. Chỉ thực hiện trên lượt được cấp cho bài xóa.
7. **P2.01:** Lấy id và product_name của products discontinued.
8. **P2.02:** Lấy bốn sản phẩm rẻ nhất theo policy top 4 của bài.
9. **P2.03:** Lấy id/name/list_price giá từ 15 tới 25, gồm hai đầu.
10. **P2.04:** Trả id và full_name ghép first_name/last_name của employees.
11. **P2.05:** Tìm employees có first_name bắt đầu bằng A; ghi collation.
12. **P2.06:** Đếm city đã biết khác nhau của employees.
13. **P2.07:** Trả ship_name của orders không lặp.
14. **P2.08:** Tính MIN/MAX list_price.
15. **P2.09:** Đếm products hiện hành, discontinued=0.
16. **P2.10:** Tính AVG/STDDEV_POP list_price; nói rõ population.
17. **P2.11:** Dùng subquery lấy product_name/list_price lớn hơn AVG toàn danh mục.
18. **P2.12:** Thêm supplier Habeco, last_name Nguyễn, first_name Hồng Linh, city Hanoi, country_region Vietnam; giữ ID sinh ra trong cùng connection.
19. **P2.13:** Thêm product TBTruc Bach, giá 22, discontinued=0, category Beverages, tham chiếu đúng Habeco vừa thêm.
20. **P2.14:** Đổi standard_cost của Truc Bach thành 18 bằng điều kiện định danh.
21. **P2.15:** Thử xóa supplier Habeco, dự đoán FK error và kiểm trạng thái; rollback chuỗi 18–21 để phục hồi fixture.
22. **P3.01:** Lấy orders sau 2006-03-24.
23. **P3.02:** Trả product_code/unit_price/quantity/value cho details của order 31, có discount.
24. **P3.03:** Với orders sau mốc, trả order id/date/customer company và value từng line.
25. **P3.04:** Trả cùng thông tin nhưng một subtotal/order; giữ order chưa có line theo policy PE.
26. **P3.05:** Report trên chỉ giữ subtotal>=800, dùng HAVING.
27. **P3.06:** Employees có tổng sale mọi đơn >1000, full_name/sale giảm dần; dùng ID để phân biệt người trùng tên.
28. **P3.07:** Categories không lặp, xếp alphabet.
29. **P3.08:** MIN/MAX/AVG/STDDEV_POP/VAR_POP standard_cost.
30. **P3.09:** AVG list_price mỗi category.
31. **P3.10:** MAX/AVG shipping_fee mỗi ship_city; nói rõ mẫu số có NULL.
32. **P3.11:** Procedure nhận n, trả đúng n category AVG giá cao nhất theo tie-break đã chốt, từ chối n NULL/không dương.
33. **P3.12:** Lấy giá trị nhỏ nhất trong các AVG category, dùng hai tầng aggregate.
34. **P3.13:** Mỗi PO trả ID/full_name người tạo/người duyệt, giữ PO chưa duyệt.
35. **P3.14:** Gộp customers/suppliers thành company/full_name/email_address/type C hoặc S; giữ hai vai dù trùng tên.
36. **P3.15:** Lấy products đã mua ít nhất một lần nhưng chưa từng bán.

## Gợi ý

Ghi grain trước SELECT. Kiểm tên schema/fixture và trạng thái transaction trước khi so expected. Tách prediction, thao tác chạy, output và lời giải thích; lỗi FK được dự kiến có thể là kết quả đúng của bài.

## Đáp án và lập luận

1. SQL khái niệm là `CREATE DATABASE Company;`. Trên web, backend map Company tới sandbox mới của lượt hoặc cấp instance chỉ chứa bài này; không cấp quyền quản lý database dùng chung. Tạo xong database chưa tự làm nó thành default của connection.
2. Dùng `USE Company; SELECT DATABASE();` trên namespace đã được cấp. Nhãn connection chỉ đặt tên cấu hình client; database là nơi chứa objects được chọn trong session; client gửi lệnh, server thực thi. Kết nối thành công chưa chứng minh mọi query đúng. Backend giữ cùng connection/session; pool không được tráo connection giữa hai bước rồi báo người học chọn sai database. Trong fixture nạp sẵn của bài query, backend đã chọn đúng database và chỉ cần probe.
3. Một DDL đầy đủ ở dưới; tám FK nguồn chưa tính Partner_ssn bổ sung. Department được tạo trước chưa có FK manager; sau Employee thì ALTER thêm. Có vòng tham chiếu nhưng MySQL không trì hoãn FK tới COMMIT theo cách deferred của một số hệ khác.

```sql
-- P1.03: run only in a new empty Company sandbox
CREATE TABLE department(
 dnumber INT PRIMARY KEY,dname VARCHAR(60) NOT NULL,
 mgr_ssn CHAR(9) NULL,mgr_start_date DATE
) ENGINE=InnoDB;
CREATE TABLE employee(
 ssn CHAR(9) PRIMARY KEY,fname VARCHAR(50) NOT NULL,minit CHAR(1) NULL,
 lname VARCHAR(50) NOT NULL,bdate DATE,address VARCHAR(150),sex CHAR(1),
 salary DECIMAL(12,2) NOT NULL CHECK(salary>=0),
 super_ssn CHAR(9) NULL,dno INT NOT NULL,
 FOREIGN KEY(super_ssn) REFERENCES employee(ssn),
 FOREIGN KEY(dno) REFERENCES department(dnumber)
) ENGINE=InnoDB;
ALTER TABLE department ADD CONSTRAINT fk_dept_manager
 FOREIGN KEY(mgr_ssn) REFERENCES employee(ssn);
CREATE TABLE dept_locations(
 dnumber INT,dlocation VARCHAR(60),PRIMARY KEY(dnumber,dlocation),
 FOREIGN KEY(dnumber) REFERENCES department(dnumber)
) ENGINE=InnoDB;
CREATE TABLE project(
 pnumber INT PRIMARY KEY,pname VARCHAR(80),plocation VARCHAR(60),dnum INT NOT NULL,
 FOREIGN KEY(dnum) REFERENCES department(dnumber)
) ENGINE=InnoDB;
CREATE TABLE works_on(
 essn CHAR(9),pno INT,hours DECIMAL(5,1) CHECK(hours>=0),PRIMARY KEY(essn,pno),
 FOREIGN KEY(essn) REFERENCES employee(ssn),FOREIGN KEY(pno) REFERENCES project(pnumber)
) ENGINE=InnoDB;
CREATE TABLE dependent(
 essn CHAR(9),dependent_name VARCHAR(60),sex CHAR(1),bdate DATE,relationship VARCHAR(30),
 PRIMARY KEY(essn,dependent_name),FOREIGN KEY(essn) REFERENCES employee(ssn)
) ENGINE=InnoDB;
```

4. Thêm nullable column và FK nếu policy yêu cầu spouse phải có trong Employee. Self-pair, symmetry và unique partner xuyên vai chưa được FK giữ; nêu rõ giới hạn thay vì nhận kết quả PASS cho cả policy.

```sql
-- P1.04
ALTER TABLE employee ADD partner_ssn CHAR(9) NULL,
 ADD CONSTRAINT fk_employee_partner FOREIGN KEY(partner_ssn) REFERENCES employee(ssn);
```

5. Mẫu có đủ sáu tables; manager được cập nhật sau bootstrap. SELECT lại Minit='T'/NULL và ssn chín ký tự. Dữ liệu SSN là mã giả lập.

```sql
-- P1.05
START TRANSACTION;
INSERT INTO department VALUES(1,'Research',NULL,NULL),(2,'Operations',NULL,NULL);
INSERT INTO employee(ssn,fname,minit,lname,salary,super_ssn,dno) VALUES
 ('000000001','An','T','Nguyen',25000,NULL,1);
INSERT INTO employee(ssn,fname,minit,lname,salary,super_ssn,dno) VALUES
 ('000000002','Binh',NULL,'Le',18000,'000000001',1),
 ('000000003','Chi',NULL,'Tran',20000,'000000001',2);
UPDATE department SET mgr_ssn='000000001' WHERE dnumber=1;
UPDATE department SET mgr_ssn='000000003' WHERE dnumber=2;
UPDATE employee SET partner_ssn='000000003' WHERE ssn='000000002';
UPDATE employee SET partner_ssn='000000002' WHERE ssn='000000003';
INSERT INTO dept_locations VALUES(1,'Hanoi'),(1,'Hue'),(2,'Hanoi');
INSERT INTO project VALUES(10,'Portal','Hanoi',1),(20,'Booking','Hanoi',2);
INSERT INTO works_on VALUES('000000001',10,8),('000000002',10,20),
 ('000000002',20,10),('000000003',20,18);
INSERT INTO dependent VALUES('000000001','Mai','F','2015-01-01','child');
COMMIT;
SELECT ssn,minit FROM employee ORDER BY ssn;
```

6. Chỉ dùng trong sandbox bài xóa. Bỏ FK manager từ Department tới Employee, xóa các bảng con rồi Employee/Department. DROP TABLE khác DELETE rows; DDL có implicit commit nên không hứa nút rollback một transaction sẽ khôi phục schema.

```sql
-- P1.06: learner-owned isolated deletion exercise only
ALTER TABLE department DROP FOREIGN KEY fk_dept_manager;
DROP TABLE dependent;
DROP TABLE works_on;
DROP TABLE project;
DROP TABLE dept_locations;
DROP TABLE employee;
DROP TABLE department;
```

7. **P2.01:** Product 3 (Old Notebook). Filter discontinued=1; không coi mọi product có giá thấp là ngừng bán.

```sql
-- P2.01
SELECT id,product_name FROM products WHERE discontinued=1;
```

8. **P2.02:** ID theo thứ tự là 5,7,3,4. Cùng giá được phá hòa bằng ID; policy này lấy đúng bốn rows.

```sql
-- P2.02
SELECT id,product_name,list_price FROM products ORDER BY list_price,id LIMIT 4;
```

9. **P2.03:** IDs 1,2,3,4; BETWEEN gồm cả 15 và 25.

```sql
-- P2.03
SELECT id,product_name,list_price FROM products WHERE list_price BETWEEN 15 AND 25 ORDER BY id;
```

10. **P2.04:** Ghép first_name, khoảng trắng và last_name; tên là hiển thị, ID là identity. Các phần tên NOT NULL trong fixture này.

```sql
-- P2.04
SELECT id,CONCAT(first_name,' ',last_name) AS full_name FROM employees ORDER BY id;
```

11. **P2.05:** IDs 1 và 3 theo collation đã chọn; lời giải tìm first_name. Muốn full name hay case-sensitive phải chốt yêu cầu khác.

```sql
-- P2.05
SELECT id,first_name,last_name FROM employees WHERE first_name LIKE 'A%' ORDER BY id;
```

12. **P2.06:** Có 2 city đã biết khác nhau; COUNT DISTINCT bỏ NULL.

```sql
-- P2.06
SELECT COUNT(DISTINCT city) AS known_cities FROM employees;
```

13. **P2.07:** Hanoi Lab, Hue Studio, PE School. DISTINCT bỏ bản lặp; ORDER BY mới hứa thứ tự.

```sql
-- P2.07
SELECT DISTINCT ship_name FROM orders ORDER BY ship_name;
```

14. **P2.08:** MIN=5, MAX=200.

```sql
-- P2.08
SELECT MIN(list_price) AS min_price,MAX(list_price) AS max_price FROM products;
```

15. **P2.09:** Có 6 product hiện hành.

```sql
-- P2.09
SELECT COUNT(*) AS current_products FROM products WHERE discontinued=0;
```

16. **P2.10:** AVG=285/7, STDDEV_POP khoảng 65.379582. Dùng VAR_POP rồi căn hoặc công thức population để đối chiếu; số 200 làm mức phân tán tăng.

```sql
-- P2.10
SELECT AVG(list_price) AS avg_price,STDDEV_POP(list_price) AS std_price FROM products;
```

17. **P2.11:** Machine/200. AVG toàn Products khác AVG trong từng category.

```sql
-- P2.11
SELECT product_name,list_price FROM products WHERE list_price>(SELECT AVG(list_price) FROM products) ORDER BY id;
```

18. **P2.12:** Bắt đầu transaction và giữ LAST_INSERT_ID trên cùng connection; không hard-code ID mà auto increment vừa cấp.

```sql
-- P2.12
START TRANSACTION;
INSERT INTO suppliers(company,last_name,first_name,city,country_region) VALUES('Habeco','Nguyễn','Hồng Linh','Hanoi','Vietnam');
SET @habeco_id=LAST_INSERT_ID();
```

19. **P2.13:** Sản phẩm dùng @habeco_id, giá 22, category Beverages và discontinued=0; product_name được thêm làm tên hiển thị nhất quán.

```sql
-- P2.13
INSERT INTO products(product_code,product_name,supplier_id,list_price,discontinued,category) VALUES('TBTruc Bach','Truc Bach',@habeco_id,22,0,'Beverages');
```

20. **P2.14:** UPDATE theo product_code unique; không sửa mọi sản phẩm vì thiếu WHERE.

```sql
-- P2.14
UPDATE products SET standard_cost=18 WHERE product_code='TBTruc Bach';
```

21. **P2.15:** DELETE supplier bị FK từ Products chặn (MySQL error 1451). Sau khi xem trạng thái, ROLLBACK toàn chuỗi thêm/sửa để các câu khác trở lại fixture ban đầu.

```sql
-- P2.15
-- Run separately and observe expected FK error; do not stop before cleanup.
DELETE FROM suppliers WHERE id=@habeco_id;
-- Send ROLLBACK as the following statement even after the expected DELETE error.
ROLLBACK;
```

22. **P3.01:** IDs 31,32,34. Dấu > giữ đúng sau mốc, không gồm chính ngày 24.

```sql
-- P3.01
SELECT * FROM orders WHERE order_date>'2006-03-24' ORDER BY id;
```

23. **P3.02:** Hai line TEA và COF có value 540 và 500. Giá lịch sử/discount của line quyết định kết quả.

```sql
-- P3.02
SELECT p.product_code,d.unit_price,d.quantity,d.unit_price*d.quantity*(1-d.discount) AS value
FROM order_details d JOIN products p ON p.id=d.product_id WHERE d.order_id=31 ORDER BY p.id;
```

24. **P3.03:** Ba rows ở grain line của orders 31,32; order 34 chưa có line nên không xuất hiện trong report từng line.

```sql
-- P3.03
SELECT o.id,o.order_date,c.company,d.unit_price*d.quantity*(1-d.discount) AS value
FROM orders o JOIN customers c ON c.id=o.customer_id JOIN order_details d ON d.order_id=o.id
WHERE o.order_date>'2006-03-24' ORDER BY o.id,d.product_id;
```

25. **P3.04:** 31→1040,32→1200,34→0. LEFT JOIN giữ order trống; COALESCE là policy hiển thị, SUM tập rỗng tự nó là NULL.

```sql
-- P3.04
SELECT o.id,o.order_date,c.company,COALESCE(SUM(d.unit_price*d.quantity*(1-d.discount)),0) AS sub_total
FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN order_details d ON d.order_id=o.id
WHERE o.order_date>'2006-03-24' GROUP BY o.id,o.order_date,c.company ORDER BY o.id;
```

26. **P3.05:** Orders 31 và 32 qua biên subtotal>=800. WHERE lọc ngày; HAVING lọc group subtotal.

```sql
-- P3.05
SELECT o.id,o.order_date,c.company,SUM(d.unit_price*d.quantity*(1-d.discount)) AS sub_total
FROM orders o JOIN customers c ON c.id=o.customer_id JOIN order_details d ON d.order_id=o.id
WHERE o.order_date>'2006-03-24' GROUP BY o.id,o.order_date,c.company
HAVING SUM(d.unit_price*d.quantity*(1-d.discount))>=800 ORDER BY o.id;
```

27. **P3.06:** Minh Tran/1200 rồi Anh Nguyen/1055. Đây là mọi đơn, không thêm filter ngày của câu trước. Group theo ID để không gộp hai người trùng tên.

```sql
-- P3.06
SELECT e.id,CONCAT(e.first_name,' ',e.last_name) AS full_name,SUM(d.unit_price*d.quantity*(1-d.discount)) AS sale
FROM employees e JOIN orders o ON o.employee_id=e.id JOIN order_details d ON d.order_id=o.id
GROUP BY e.id,e.first_name,e.last_name HAVING SUM(d.unit_price*d.quantity*(1-d.discount))>1000
ORDER BY sale DESC,e.id;
```

28. **P3.07:** Beverages, Equipment, Stationery theo collation của sandbox.

```sql
-- P3.07
SELECT DISTINCT category FROM products ORDER BY category;
```

29. **P3.08:** MIN=2, MAX=140, AVG=192.5/7=27.5; STD/VAR dùng population trên standard_cost. Kiểm numeric tolerance thay vì chuỗi số thực.

```sql
-- P3.08
SELECT MIN(standard_cost),MAX(standard_cost),AVG(standard_cost),STDDEV_POP(standard_cost),VAR_POP(standard_cost) FROM products;
```

30. **P3.09:** Beverages=20, Equipment=200, Stationery=25/3. Không join lines làm product bán nhiều lần có trọng số lớn hơn.

```sql
-- P3.09
SELECT category,AVG(list_price) AS avg_price FROM products GROUP BY category ORDER BY category;
```

31. **P3.10:** Hanoi MAX/AVG=10/10, Hue=20/20; các fee NULL không góp vào mẫu số.

```sql
-- P3.10
SELECT ship_city,MAX(shipping_fee) AS max_fee,AVG(shipping_fee) AS avg_fee FROM orders GROUP BY ship_city ORDER BY ship_city;
```

32. **P3.11:** n=2 cho Equipment/200 và Beverages/20. Body là một statement, CALL ở statement riêng; n=NULL/0/âm bị SIGNAL. n lớn hơn số nhóm trả tất cả nhóm sẵn có.

```sql
-- P3.11
CREATE PROCEDURE top_categories(IN p_n INT)
BEGIN
 IF p_n IS NULL OR p_n<1 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='n must be a positive integer';
 END IF;
 SELECT category,AVG(list_price) AS avg_price FROM products
 GROUP BY category ORDER BY avg_price DESC,category LIMIT p_n;
END;
```

```sql
CALL top_categories(2);
```

33. **P3.12:** Giá trị nhỏ nhất trong AVG categories là 25/3. Derived table tạo query block đầu, MIN đọc các AVG ở block sau.

```sql
-- P3.12
SELECT MIN(t.avg_price) AS minimum_category_average
FROM (SELECT category,AVG(list_price) AS avg_price FROM products GROUP BY category) AS t;
```

34. **P3.13:** PO80 có creator Anh Nguyen, approver Minh Tran; PO81 creator An Le, approver NULL. INNER JOIN approver sẽ làm mất PO81.

```sql
-- P3.13
SELECT p.id,CONCAT(c.first_name,' ',c.last_name) AS created_by_name,
 CONCAT(a.first_name,' ',a.last_name) AS approved_by_name
FROM purchase_orders p JOIN employees c ON c.id=p.created_by LEFT JOIN employees a ON a.id=p.approved_by ORDER BY p.id;
```

35. **P3.14:** Có 6 records của hai vai C/S. UNION ALL giữ record; full_name không là khóa để khử người trùng tên.

```sql
-- P3.14
SELECT company,CONCAT_WS(' ',first_name,last_name) AS full_name,email_address,'C' AS type FROM customers
UNION ALL
SELECT company,CONCAT_WS(' ',first_name,last_name),email_address,'S' AS type FROM suppliers
ORDER BY type,company;
```

36. **P3.15:** Products 3 (Old Notebook) và 7 (Ruler). EXISTS/NOT EXISTS giữ đúng grain Product, không nhân khi có nhiều dòng mua.

```sql
-- P3.15
SELECT p.id,p.product_name FROM products p
WHERE EXISTS(SELECT 1 FROM purchase_order_details b WHERE b.product_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM order_details s WHERE s.product_id=p.id) ORDER BY p.id;
```


## Biến thể và cách kiểm

Luân phiên chọn rows, sắp predicate, điền aggregate, sửa join làm mất NULL rồi tự viết code không scaffold. Các 36 nhiệm vụ là ngân hàng nội dung; dev chia thành các lượt ngắn theo kỹ năng, không bắt đọc nguyên bài rồi làm hết. Giữ source code P1/P2/P3 để truy vết khi đổi thứ tự. Ca chấm có ties, date boundary, cột NULL, người trùng tên, parent không con, product mua nhiều lần và lỗi FK.

## Học trên web

Provision/reset là thao tác backend được giới hạn vào attempt, không nhận tên host/database bất kỳ do client gửi. Statement CREATE PROCEDURE được giữ nguyên body; không gửi DELIMITER tới server hay split body bằng dấu chấm phẩy. Các bước giữ LAST_INSERT_ID/@habeco_id dùng cùng session. Sau lỗi FK, hiển thị transaction còn active hay đã rollback; trước lượt khác reset fixture để expected đúng. Bài xóa bảng dùng sandbox riêng và kết thúc bằng kiểm metadata, không ảnh hưởng bài của người khác.

## Fixture Northwind đầy đủ

Đây là phần tables/rows PE của fixture baseline, không có lệnh quản trị CREATE/USE/DROP hướng tới tên dùng chung. Backend chọn database mới trước khi nạp. Constraint UNIQUE(company) của Supplier là lựa chọn fixture PE, khác business unique email ở brief Lecture 9; không gộp hai mô hình.

```sql
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
```

## Nguồn và đối chiếu

Đã đọc Practice 1 đủ 5 trang, Practice 2 một trang và Practice 3 đủ 4 trang, gồm hình Company/Minit và các output screenshots. Bài giữ 6+15+15 nhiệm vụ; đáp án/fixture là PE dựng lại, không khẳng định khớp rows của dump gốc chưa được cung cấp. Z01/Z02 baseline được giữ nguyên để truy vết; AD60 là phần vận dụng nâng cao nối tiếp, không tính đọc lời giải thành lượt tự làm.
