# USTH07 · Index, view, procedure và trigger trong đúng hệ quản trị

Học cùng AD27–AD30, AD53 và AD85. Bài này nối Lecture 7 USTH với phần thực hành MySQL 8.4. Những ví dụ dùng `EXEC`, `inserted` và `deleted` được đặt ở nhánh SQL Server riêng vì chúng có cách thực thi khác.

Một cửa hàng cần tìm sản phẩm theo giá, xem doanh thu từng đơn, đếm khách theo thành phố và ghi lại lần đổi giá. Cả bốn việc đều liên quan đến bảng, nhưng không cần giải quyết bằng cùng một loại object. Index hỗ trợ tìm dữ liệu; view đặt tên cho một query; procedure gom thao tác có thể gọi lại; trigger tự chạy khi sự kiện đã khai báo xảy ra.

## Dữ liệu để thử

Chạy fixture trong schema luyện tập mới. Mỗi bài thay đổi dữ liệu phải được reset riêng trước lần thử tiếp theo.

```sql
CREATE TABLE u7_product (
  id INT PRIMARY KEY,
  price DECIMAL(10,2) NULL,
  stock INT NOT NULL CHECK (stock >= 0)
);
CREATE TABLE u7_line (
  line_id INT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (product_id) REFERENCES u7_product(id)
);
CREATE TABLE u7_customer (
  id INT PRIMARY KEY,
  city VARCHAR(255) NOT NULL
);
INSERT INTO u7_product VALUES (1,10,10),(2,20,20),(3,NULL,7);
INSERT INTO u7_line VALUES (1,501,1,3,10),(2,501,2,2,20),(3,502,1,1,10);
INSERT INTO u7_customer VALUES (1,'Hue'),(2,'Hanoi'),(3,'Hue');
```

`unit_price` là giá đã chốt của dòng đơn hàng. Đổi `u7_product.price` không tự viết lại giá lịch sử. Ba dòng đơn ban đầu được nạp **trước** khi tạo trigger trừ kho ở phần sau; trigger không chạy ngược cho dữ liệu đã có.

## Index giảm phần dữ liệu cần tìm như thế nào?

Nếu dò một danh sách chưa sắp xếp từ đầu, tìm thành công ở vị trí thứ k cần k lần kiểm. Khi mọi vị trí có xác suất được hỏi như nhau, trung bình là (1+2+…+n)/n = (n+1)/2; tối đa n. Công thức này đếm lần kiểm theo mô hình đã chọn, chưa phải số mili giây hay số page I/O. Tìm một giá trị không có có thể phải đọc hết n mục.

Với danh sách đã sắp xếp, binary search so phần tử giữa rồi bỏ một nửa khoảng tìm kiếm. Dùng 22 phần tử, chỉ số giữa lấy phần nguyên xuống, số lần kiểm khi tìm thành công có phân bố: 1 phần tử cần 1 lần, 2 cần 2, 4 cần 3, 8 cần 4 và 7 cần 5. Trung bình là 84/22, tối đa 5. Các số `log2(n)-1` và `log2(n)` trong slide 6 chỉ gợi ý độ tăng logarithmic; chúng không cho số lần so sánh chính xác 3.5 và 4.5 trong mọi lần tìm.

B-tree/B+ tree của database không phải binary search trên một array. Một node chứa nhiều key và các nhánh; đi từ root qua intermediate nodes tới leaf theo các khoảng key. Fan-out lớn làm cây thấp. AD28 giải thích đầy đủ split, merge và range scan. Hình B-tree ở slide 11–13 cho thấy các tầng và phần leaf, không cung cấp công thức thời gian cố định cho mọi query.

Index có thể chứa một hoặc nhiều cột. Một entry giữ key cùng thông tin để tìm row; thông tin ấy không luôn là số thứ tự row trong bảng. Với InnoDB, clustered index chứa row ở leaf; secondary index chứa key phụ và primary key để tìm tiếp trong clustered index. Mỗi bảng có một clustered index. InnoDB ưu tiên PK, rồi một unique index có toàn bộ cột NOT NULL phù hợp, nếu thiếu sẽ tạo khóa ẩn. Query vẫn cần `ORDER BY` khi yêu cầu thứ tự kết quả. [MySQL: clustered và secondary indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html).

```sql
CREATE INDEX u7_price_ix ON u7_product(price);
EXPLAIN SELECT id,price FROM u7_product WHERE price >= 15;
```

Kết quả dữ liệu là sản phẩm 2 có giá 20 trên fixture ban đầu. `EXPLAIN` cho biết phương án engine chọn; ba row quá nhỏ nên engine có thể chọn scan. Tạo index thành công không chứng minh query đã dùng nó hay đã nhanh hơn.

Index cần chỗ lưu và phải được duy trì khi ghi. Ước lượng `số row × số byte key trung bình` trong slide 9 mới tính payload key: 10,000 key, mỗi key 8 byte, cho 80,000 byte. Còn locator, header, node trong cây, khoảng trống page và cách mã hóa. Index trên cột nhiều giá trị trùng vẫn có thể hữu ích cho predicate chọn ít row, range hoặc covering query. Bảng ít ghi cũng không có lý do để thêm mọi index; đo workload đọc/ghi và dung lượng trước khi giữ một index.

Các tên `ntext`, `image`, `varchar(max)` trong slide 8 thuộc SQL Server. Với MySQL, phải kiểm giới hạn kiểu, độ dài key và quy tắc prefix/FULLTEXT của loại index cụ thể; không đổi tên kiểu rồi coi các giới hạn giống nhau.

## View giữ query, không giữ một bản báo cáo cố định

Mỗi lần cần doanh thu, ứng dụng lại viết cùng `SUM(quantity*unit_price)`. Đặt tên cho query giúp các chỗ gọi dùng cùng một cách tính:

```sql
CREATE VIEW u7_sales AS
SELECT order_id,SUM(quantity*unit_price) AS total
FROM u7_line
GROUP BY order_id;

SELECT order_id,total FROM u7_sales ORDER BY order_id;
```

Kết quả là `(501,70)` và `(502,10)`. Đây là view thường: định nghĩa được lưu, còn kết quả được tính từ dữ liệu nền khi đọc theo semantics của transaction. Nó không phải materialized view được giữ lại và refresh theo lịch.

Một view có thể dựa vào view khác hoặc query có subquery:

```sql
CREATE VIEW u7_large_sales AS
SELECT order_id,total FROM u7_sales WHERE total >= 50;

CREATE VIEW u7_above_average AS
SELECT id,price FROM u7_product
WHERE price > (SELECT AVG(price) FROM u7_product);
```

View thứ nhất cho `(501,70)`; view thứ hai cho `(2,20)`, vì AVG bỏ NULL và bằng 15. Muốn sắp xếp đầu ra, ghi `ORDER BY` ở query sử dụng view. Không dựa vào thứ tự tình cờ hoặc `ORDER BY` nằm sâu trong định nghĩa.

View giúp rút gọn query, tính cột dẫn xuất, giữ giao diện cột cũ khi schema đổi và giới hạn dữ liệu được cấp quyền. Muốn dùng nó để che cột nhạy cảm còn phải cấu hình quyền phù hợp; nếu người dùng vẫn đọc trực tiếp bảng nền thì view không ngăn được đường đó. Đổi bảng nền có thể làm view hỏng, và view phức tạp vẫn có chi phí thực thi.

MySQL có `ALGORITHM=MERGE`, `TEMPTABLE` và `UNDEFINED`. MERGE ghép query gọi với định nghĩa; TEMPTABLE dùng kết quả tạm trong lần thực thi; UNDEFINED để engine lựa chọn. Aggregate, GROUP BY, DISTINCT, LIMIT và một số cấu trúc khác ngăn merge. Không đọc chữ “subquery” trong slide 19 thành lệnh cấm mọi subquery: vị trí và sự phụ thuộc của nó có ý nghĩa. Bảng tạm này cũng không biến ordinary view thành một báo cáo lưu bền. [MySQL: view algorithms](https://dev.mysql.com/doc/refman/8.4/en/view-algorithms.html).

## Ghi qua view và WITH CHECK OPTION

View có aggregate như u7_sales không cho phép sửa `total` như sửa một row gốc: 70 là tổng nhiều row, chưa biết phải sửa dòng nào. View đơn giản có tương ứng row rõ ràng có thể cho phép UPDATE. Việc insert còn phụ thuộc các cột bắt buộc của bảng nền và các quy tắc riêng. Một số inner-join view có thể updatable; cột expression tự nó không ghi được nhưng không có nghĩa mọi cột khác của mọi view ấy đều bị cấm. `IS_UPDATABLE` cũng chưa phải giấy phép cho mọi kiểu INSERT. [MySQL: updatable và insertable views](https://dev.mysql.com/doc/refman/8.4/en/view-updatability.html).

```sql
CREATE VIEW u7_hue_customers AS
SELECT id,city FROM u7_customer
WHERE city='Hue'
WITH CHECK OPTION;
```

`INSERT INTO u7_hue_customers VALUES (4,'Hue')` được chấp nhận trên fixture mới. Đổi thành `(4,'Danang')` hoặc sửa một khách đang thấy thành city='Danang' qua view sẽ bị từ chối. Nếu tài khoản được quyền ghi thẳng u7_customer, nó vẫn có thể thêm khách Danang ở bảng nền; CHECK OPTION kiểm đường ghi qua view này. Khi view lồng nhau, LOCAL và CASCADED quy định phạm vi kiểm; mặc định là CASCADED, còn constraint đã được khai báo ở view bên dưới vẫn cần xét khi dùng LOCAL. [MySQL: CHECK OPTION](https://dev.mysql.com/doc/refman/8.4/en/view-check-option.html).

Để quản lý, dùng `SHOW CREATE VIEW u7_hue_customers`, `ALTER VIEW`, `CREATE OR REPLACE VIEW` hoặc `DROP VIEW IF EXISTS u7_hue_customers` trong schema luyện tập. Danh sách view nên lọc đúng schema:

```sql
SELECT table_name,is_updatable
FROM information_schema.views
WHERE table_schema=DATABASE();
```

## Procedure nhận input và trả output

Procedure lưu định nghĩa một nhóm thao tác trong catalog để ứng dụng gọi lại. Với khách ở Hue, ta muốn truyền tên thành phố và nhận một số đếm, thay vì mỗi chỗ gọi tự viết query:

```sql
CREATE PROCEDURE u7_count_city(IN p_city VARCHAR(255), OUT p_n BIGINT)
BEGIN
  SELECT COUNT(*) INTO p_n
  FROM u7_customer AS c
  WHERE c.city=p_city;
END;
```

Trong web runner, gửi toàn bộ CREATE PROCEDURE trên thành **một statement**. Sau đó gọi hai statement dưới trên cùng connection:

```sql
CALL u7_count_city('Hue',@n);
SELECT @n AS customer_count;
```

Kết quả là 2 trên fixture ban đầu; truyền 'Danang' nhận 0. IN đưa dữ liệu vào, OUT đưa giá trị ra, INOUT làm cả hai. Một procedure cũng có thể trả result set bằng SELECT, khác với output parameter. `p_city` tách rõ tham số với `c.city`. Ví dụ MySQL ở slide 33 có chữ `AS` thừa trước BEGIN; cú pháp trên đã bỏ chữ đó.

`DELIMITER` là lệnh của client mysql để client không cắt procedure ở dấu chấm phẩy bên trong. Nó không phải SQL gửi tới server. Web API nhận cả body không cần chèn DELIMITER; parser của dev cũng không được tách body bằng `split(';')`. [MySQL: định nghĩa stored programs](https://dev.mysql.com/doc/refman/8.4/en/stored-programs-defining.html).

Ở nhánh SQL Server, cú pháp tương ứng dùng `CREATE OR ALTER PROCEDURE ... @city ... AS ...` và gọi bằng `EXEC`. Ví dụ một procedure đã được định nghĩa là `dbo.pe_find @city nvarchar(255)=N'Hue', @min_id int=0` có thể được gọi theo tên, theo vị trí hoặc dùng default:

```sql
EXEC dbo.pe_find @min_id=2, @city=N'Hue';
EXEC dbo.pe_find N'Hue',2;
EXEC dbo.pe_find @min_id=2;
```

Ba lời gọi này cần procedure SQL Server với đúng định nghĩa nói trên, không chạy trực tiếp ở MySQL. Đặt tên tham số giúp đọc và tránh đổi nhầm thứ tự; khi đã bắt đầu dùng cách truyền theo tên, các tham số sau cũng dùng cách đó. Không đặt tên procedure ứng dụng bắt đầu bằng `sp_` vì SQL Server dành convention này cho system procedures; một tên có prefix ấy không tự biến code tự viết thành system procedure. `master` và nhóm system/local trong slide 29 cũng là ngữ cảnh SQL Server. [Microsoft: parameters](https://learn.microsoft.com/en-us/sql/relational-databases/stored-procedures/specify-parameters), [CREATE PROCEDURE](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-procedure-transact-sql?view=sql-server-ver17).

Procedure có thể giảm số lần trao đổi mạng, dùng lại logic và giới hạn quyền thao tác. Đổi lại, logic trong database cần versioning, test và công cụ debug. Vòng lặp từng row có thể tốn CPU hơn query theo tập. Sơ đồ “SQL thường luôn compile lại, procedure không bao giờ compile lại” ở slide 28 là giản lược: prepared statements cũng có cache; metadata đổi có thể làm server parse lại phần bị ảnh hưởng. Tính nhanh/chậm cần đo cùng workload, không suy từ tên object. [MySQL: statement caching](https://dev.mysql.com/doc/refman/8.4/en/statement-caching.html).

## Trigger chạy theo sự kiện; phân biệt row với statement

Trigger được gắn với table/event/timing, tự chạy khi thao tác phù hợp diễn ra. Không gọi trigger bằng CALL như procedure. “Special SP” trong slide là cách liên hệ để học; trigger là một loại object có quy tắc kích hoạt riêng.

| Hệ | Dữ liệu mới/cũ | Phạm vi của một lần chạy |
|---|---|---|
| MySQL | NEW cho row mới, OLD cho row cũ | FOR EACH ROW; một statement có thể kích hoạt nhiều lần |
| SQL Server, DML trigger trong bài | inserted/deleted là các tập row | Một lần kích hoạt phải xử lý được cả tập bị tác động |

INSERT có dữ liệu mới, DELETE có dữ liệu cũ, UPDATE có cả hai. MySQL cho thay NEW trong BEFORE trigger khi quy tắc cho phép; AFTER đã đi qua bước thay row. Với InnoDB, trigger lỗi làm statement gọi nó thất bại và các thay đổi của statement được rollback. Không đồng nhất điều này với việc mọi transaction của người gọi đã luôn được rollback toàn bộ. [MySQL: trigger syntax](https://dev.mysql.com/doc/refman/8.4/en/trigger-syntax.html).

Ứng dụng trigger gồm audit, duy trì dữ liệu dẫn xuất, validation phức tạp và một số nghiệp vụ cascade. Với toàn vẹn cơ bản, ưu tiên PK/FK/UNIQUE/CHECK/DEFAULT nếu chúng diễn đạt đủ yêu cầu. Trigger liên bảng hoặc liên database còn phải giải quyết concurrent writes và phạm vi transaction; riêng một SELECT kiểm tồn tại chưa chứng minh toàn vẹn dưới mọi interleaving.

## Ba ví dụ cần kiểm nhiều row

### Trừ kho cho dòng đơn mới

Trên fixture MySQL, tạo trigger sau khi đã nạp ba dòng ban đầu:

```sql
CREATE TRIGGER u7_take_stock
AFTER INSERT ON u7_line
FOR EACH ROW
UPDATE u7_product
SET stock=stock-NEW.quantity
WHERE id=NEW.product_id;
```

Thêm hai dòng mới có product_id=1, quantity lần lượt 3 và 4 làm stock từ 10 còn 3. Hai lần kích hoạt chạy trong statement insert. Nếu tổng cần 11 thì CHECK stock>=0 làm statement thất bại trên InnoDB; cần kiểm cả line và stock sau lỗi. Mẫu này chỉ xử lý INSERT: sửa/xóa đơn cần policy bổ sung; không gọi nó là hệ thống quản lý kho hoàn chỉnh.

Với SQL Server, không trừ bằng cách join Products trực tiếp với từng inserted row rồi mong mỗi lần khớp tự cộng dồn. Một product có thể xuất hiện nhiều lần. Gom delta trước:

```sql
CREATE OR ALTER TRIGGER dbo.pe_take_stock
ON dbo.pe_line AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  UPDATE p SET stock=p.stock-d.qty
  FROM dbo.pe_product AS p
  JOIN (
    SELECT product_id,SUM(CAST(quantity AS bigint)) AS qty
    FROM inserted GROUP BY product_id
  ) AS d ON d.product_id=p.id;
END;
```

Nhánh này cần bảng pe_product/pe_line cùng ý nghĩa fixture, stock/quantity có constraint và FK, cùng kiểm rollback trên engine SQL Server. Ví dụ quantity 3 và 4 phải trừ 7, không phải chỉ một trong hai. Đây là lỗi mà fixture chỉ insert một row ở slide 40 chưa bộc lộ. [Microsoft: trigger xử lý nhiều row](https://learn.microsoft.com/en-us/sql/relational-databases/triggers/create-dml-triggers-to-handle-multiple-rows-of-data?view=sql-server-ver17).

### Ghi thay đổi giá, kể cả NULL

```sql
CREATE TABLE u7_price_audit (
  product_id INT NOT NULL,
  changed_at TIMESTAMP(6) NOT NULL,
  old_price DECIMAL(10,2) NULL,
  new_price DECIMAL(10,2) NULL
);
```

```sql
CREATE TRIGGER u7_audit_price
AFTER UPDATE ON u7_product
FOR EACH ROW
BEGIN
  IF NOT (OLD.price <=> NEW.price) THEN
    INSERT INTO u7_price_audit
    VALUES (NEW.id,CURRENT_TIMESTAMP(6),OLD.price,NEW.price);
  END IF;
END;
```

`<=>` là phép so bằng có xét NULL của MySQL. Đổi 10→12 tạo một audit row, 10→10 không tạo, NULL→12 và 12→NULL đều tạo. Dùng riêng `old_price <> new_price` sẽ bỏ sót hai trường hợp NULL vì predicate khi ấy là UNKNOWN.

Ở SQL Server, dùng `INSERT ... SELECT` join inserted với deleted bằng **key ổn định** rồi lọc `i.price<>d.price OR (i.price IS NULL AND d.price IS NOT NULL) OR (i.price IS NOT NULL AND d.price IS NULL)`. Nếu cho đổi chính key join, cần cơ chế identity khác; không ghép nhầm row trước/sau. INSERT lấy inserted, DELETE lấy deleted; UPDATE dùng cả hai. Các bảng chuyển tiếp là do engine quản lý, không phải bảng audit lưu bền tự có. [Microsoft: inserted/deleted](https://learn.microsoft.com/en-us/sql/relational-databases/triggers/use-the-inserted-and-deleted-tables?view=sql-server-ver17).

### Chặn một lệnh UPDATE tác động hơn hai row

Bài ở slide 39 đòi giới hạn **mỗi statement**, nên giữ nhánh SQL Server:

```sql
CREATE OR ALTER TRIGGER dbo.pe_limit_update
ON dbo.pe_product AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF (SELECT COUNT_BIG(*) FROM inserted)>2
  BEGIN
    ROLLBACK TRANSACTION;
    THROW 51000,N'Update at most two rows per statement.',1;
  END;
END;
```

Statement tác động 0,1,2 row được qua; 3 row bị từ chối. Đây là số row của statement, kể cả UPDATE gán lại cùng giá trị. Mẫu rollback toàn transaction hiện tại; runner phải cho thấy tác động này nếu người học đã mở transaction có nhiều lệnh. Không thay bằng một bộ đếm session không reset trong MySQL row trigger rồi coi hai hệ tương đương. Nhánh MySQL muốn policy này nên cung cấp procedure/API batch được kiểm soát đầy đủ và khóa đường ghi khác, hoặc chọn hệ có statement-level trigger.

Slide 42 còn dùng `(SELECT ProductID FROM deleted)` như một scalar: nó không xử lý được deleted có nhiều row. Nếu chỉ cần chặn xóa sản phẩm đang có dòng đơn, FK đã là cách phù hợp trong fixture. Khi phân tích thuật toán trigger theo tập, thay scalar bằng EXISTS join deleted với lines; để triển khai thay FK còn phải chứng minh cách xử lý concurrency. Một AFTER trigger cũng không được dùng để “sửa” vi phạm mà FK đã từ chối trước đó.

Trigger làm việc trong transaction gọi nó, có thể chạm thêm bảng, giữ khóa lâu hơn và làm DML chậm. Dữ liệu chuyển tiếp ở memory không bảo đảm mọi trigger nhanh. Đo số row, query plan, index cho phép kiểm liên bảng, thời gian giữ khóa và đường lỗi; không chỉ đo một insert đơn lẻ.

## Luyện tập

1. Với 22 phần tử, tính trung bình/tối đa của dò tuần tự thành công đều xác suất. Vì sao binary search không có “4.5 lần so sánh” trong một lần chạy? Đếm lại với mid lấy phần nguyên xuống.
2. Chỉ ra root/intermediate/leaf và đường tìm một khoảng key. Phân biệt clustered/secondary ở InnoDB. Ước lượng payload cho 10,000 key 8 byte có phải dung lượng index cuối không? Một index nhiều duplicate có luôn vô dụng không?
3. Chạy query u7_sales, u7_large_sales và u7_above_average trên fixture mới; ghi columns, rows. Sau khi thêm một line, ordinary view có giữ nguyên báo cáo cũ không? ORDER BY cần đặt ở đâu để hứa thứ tự?
4. Qua u7_hue_customers, thử insert Hue và Danang, rồi update Hue→Danang. So với ghi thẳng bảng nền. Vì sao u7_sales.total không ghi được; MERGE/TEMPTABLE và updatable khác nhau thế nào?
5. Viết procedure đếm khách theo city với IN/OUT, gọi cho Hue và Danang; giải thích connection, delimiter và lỗi AS trong ví dụ nguồn. Nếu trả cả danh sách khách thì dùng output scalar hay result set?
6. Đọc ba lời gọi pe_find trong bài: cái nào dùng tên, vị trí, default? Có chạy trên MySQL không? Nêu một lợi ích và một chi phí của procedure; bác câu “procedure không bao giờ parse lại”.
7. Trên fixture reset với stock=10, thêm hai line cùng product 1 có quantity 3,4. Dự đoán MySQL row trigger và SQL Server grouped trigger. Sửa biến thể SQL Server chỉ join inserted; thử tổng quantity=11 và kiểm cả hai bảng sau lỗi.
8. Audit phải ghi gì cho 10→12,10→10,NULL→12,12→NULL,NULL→NULL? Viết predicate cho MySQL và SQL Server; nêu điều kiện của key join trước/sau.
9. Viết/chọn trigger cho UPDATE tối đa hai row mỗi statement. Thử 0,1,2,3 row và UPDATE không đổi giá trị. Tại sao một MySQL row trigger nhìn NEW không tự biết statement đã tác động mấy row?
10. Hai sản phẩm bị xóa cùng lúc, một sản phẩm còn line: scalar deleted sai ở đâu? Chọn constraint cho fixture và nêu test nhiều row/concurrent write cần có. Vì sao “transition tables ở cache” chưa đủ kết luận trigger nhanh?

## Gợi ý

Trước khi dự đoán, ghi engine, grain của row và trạng thái fixture. Đọc body rồi tự hỏi nó đang giữ một giá trị, một row hay một tập row. Với lệnh có lỗi, kiểm trạng thái cuối của mọi bảng bị chạm thay vì chỉ đọc thông báo.

## Đáp án và lập luận

1. Dò tuần tự trung bình 11.5 lần, tối đa 22. Binary search mỗi lần kiểm là số nguyên; trong mô hình đã nêu, tổng độ sâu thành công là 84, trung bình 84/22, tối đa 5. Logarithm mô tả tăng trưởng, không phải số lần so sánh chính xác cho mọi n/biến thể.
2. Root chọn vùng, intermediate tiếp tục thu hẹp, leaf chứa entries/rows theo loại index. InnoDB clustered leaf giữ row, secondary có PK locator. 80,000 byte mới là key payload. Duplicate cần xét selectivity và workload; covering/range query vẫn có thể hưởng lợi. Index cũng làm tăng chi phí ghi.
3. u7_sales là (501,70),(502,10); u7_large_sales chỉ (501,70); u7_above_average là (2,20). Ordinary view đọc dữ liệu nền theo snapshot/transaction hiện tại, không giữ kết quả cũ bền vững. Sắp xếp ở SELECT ngoài. Các kết quả trên dùng fixture ban đầu, chưa áp dụng biến thể khác.
4. Hue insert được nếu ID mới và các constraint khác đúng; Danang bị CHECK OPTION chặn khi ghi qua view; sửa Hue→Danang qua view bị chặn. Bảng nền không bị view áp đặt city='Hue'. SUM chưa chỉ rõ sửa line nào nên tổng không tự updatable. Algorithm là cách xử lý view, không đồng nghĩa mọi thao tác ghi đều hợp lệ.
5. Dùng u7_count_city đã viết; Hue=2, Danang=0. CALL và đọc @n dùng cùng connection. Body là một statement; DELIMITER chỉ cho client mysql; bỏ AS trước BEGIN. Danh sách khách thường trả result set, khác với một OUT count. Reset fixture nếu trước đó đã thêm khách.
6. Lệnh đầu truyền theo tên, lệnh hai theo vị trí, lệnh ba bỏ city để dùng Hue mặc định. Chúng thuộc SQL Server. Dùng lại logic/giảm round trip có ích nhưng đổi lại cần test, deploy và debug. Metadata đổi có thể làm parse/reprepare; cần đo hiệu năng cùng workload.
7. Stock còn 3, hai line mới được giữ khi mọi constraint đúng. SQL Server cần SUM quantity theo product để không chọn tùy ý một inserted row. Tổng 11 vi phạm stock>=0; với môi trường transactional đã đặc tả, statement lỗi không được để lại line mới hay stock âm. Rollback statement/transaction cụ thể được xác nhận trên engine, không suy từ model số học.
8. Ghi cho 10→12,NULL→12,12→NULL; không ghi cho 10→10,NULL→NULL. MySQL dùng NOT(OLD.price<=>NEW.price); SQL Server dùng OR ba trường hợp đã nêu. Join theo ID chỉ đúng khi ID ổn định trong thao tác; cùng một UPDATE có nhiều row cần audit đủ từng row thay đổi.
9. Nhánh SQL Server dùng COUNT_BIG(*) từ inserted; 0/1/2 qua, 3 lỗi và mẫu rollback cả transaction hiện tại. Row không đổi giá trị vẫn thuộc tập affected của UPDATE. NEW trong MySQL chỉ đại diện một row; bộ đếm session tự chế có vấn đề reset, lỗi, pooling và đường ghi khác, nên không là bản dịch tương đương.
10. Scalar subquery có hai ProductID không cho một giá trị đơn; EXISTS join là cách kiểm theo tập. Fixture giữ FK u7_line.product_id→u7_product.id, chặn xóa cha còn con. Test cần nhiều parent, con có/không có, rollback và race với insert con; trigger thay FK cần cơ chế khóa/cô lập chứng minh riêng. Nhiều query/row/khóa trong trigger vẫn có thể tốn thời gian dù transition data ở memory.

## Biến thể và cách kiểm

Luân phiên đọc plan, dự đoán kết quả view, sửa dialect, viết procedure, tìm lỗi multirow và tự code một nghiệp vụ đổi giá. Không đổi dạng bài chỉ vì muốn ngẫu nhiên: bài đếm row cần thao tác trên tập; bài chọn index cần workload và plan. Hidden cases có NULL, zero rows, duplicate product trong batch, statement lỗi và reset fixture. Chấm trạng thái/query result và semantics của body, không chỉ so chuỗi SQL.

## Học trên web

Nhánh chính hiển thị MySQL 8.4/InnoDB; nhánh SQL Server chỉ hiện nút chạy khi backend báo capability thật, phiên bản và môi trường cô lập. Nếu chưa có engine ấy, cho phân tích tập inserted/deleted và gắn nhãn “mô hình”, không trả log engine giả. Code editor giữ nguyên body procedure/trigger thành một statement; CALL/OUT giữ cùng connection. Nhánh SQL Server có batch boundaries và policy rollback rõ, không gửi GO vào server như SQL.

Backend dùng schema riêng cho từng lượt thử, quyền tối thiểu và timeout; kết quả gồm rows trước/sau, lỗi từ engine, phạm vi rollback, engine/version và seed. Không cho script bài tập truy cập master, schema của học viên khác hay quyền quản trị. Demo tương tác hiện tại minh họa cách học; acceptance native cần chạy những ca engine trong contract riêng.

## Nguồn và đối chiếu

Lecture 7 USTH, 43 trang; toàn bộ body và hình đã được đọc. Ví dụ cửa hàng được biên soạn mới, không dùng dữ liệu Northwind hay chép bài mẫu nguyên văn. Các phần liên quan trong khóa là AD27–AD30, AD53 và AD85. Những phát biểu giản lược về log comparisons, row locator, cache, view và trigger nhiều row được nêu cùng điều kiện đúng và tài liệu chính thức ở ngay đoạn liên quan. QA model/SQLite không được xem là bằng chứng đã chạy MySQL hoặc SQL Server.
