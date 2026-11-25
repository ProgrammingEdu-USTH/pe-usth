# USTH03 · SQL, Company và các thao tác cần tự làm

Học cùng AD01, AD10–AD12; ôn F02 và các bài SQL nền theo kết quả đầu vào. Phần này bổ sung Lecture3 USTH trang5–8,12–15,17–34,38,45,48,52,58–62,67,70–71. Bài dài trong tài liệu để tra cứu; trên web được chia theo kỹ năng và mỗi lượt chỉ mở fixture cần dùng. SQL dưới dùng MySQL8.4/InnoDB trừ ví dụ đối chiếu dialect được ghi rõ. Dữ liệu và policy thêm là của PE.

Bạn chạy được một SELECT nhưng chưa chắc đã biết nó đổi dữ liệu hay chỉ trả kết quả. Khi đổi sang ALTER, INSERT SELECT hoặc DELETE, khác biệt này quyết định phải kiểm điều gì trước và sau. Ta bắt đầu bằng tên gọi/cú pháp, rồi dựng một schema có vòng foreign key và tự sửa các lệnh trên dữ liệu nhỏ.

## SQL, DBMS và phần mềm dùng để gửi lệnh

SQL là Structured Query Language; nguồn gốc SEQUEL ở nghiên cứu IBM thập niên1970 được nhắc trong USTH01. Nó có query,DDL,DML,transaction và quyền theo phần được engine hỗ trợ. Mô tả “ít hơn100 từ” trong slide không là giới hạn hình thức của ngôn ngữ; số keyword/features thay theo chuẩn và dialect. SQL không phải hệ điều hành, cũng không phải tên chung của một sản phẩm database.

MySQL,PostgreSQL,SQL Server,Oracle Database,Db2 là các hệ quản trị; Linux,Windows,Android,iOS,macOS thuộc môi trường hệ điều hành; một editor/client gửi SQL và hiện kết quả. Logo ghép trong slide6 không có nghĩa tất cả đều là DBMS hay chạy cùng câu SQL. Browser của khóa là client; backend quản lý connection tới engine, người học không cài server cá nhân.

Chuẩn ANSI SQL1986,ISO1987 và revision1992 được phân biệt với thời điểm ra đời một engine. SQL:1999 mở rộng recursion/procedural/object features;2003 có window/XML/sequences;2006 đi sâu SQL/XML;2008 tiếp tục sửa/mở rộng ngôn ngữ. Một feature được chuẩn hóa không có nghĩa phiên bản engine trong runner đã hỗ trợ đầy đủ hoặc cùng syntax. Đây là diễn tiến trong bảng slide, không tuyên bố2008 là chuẩn mới nhất. [PostgreSQL historical SQL background](https://www.postgresql.org/docs/6.5/sql.htm) ghi lại các mốc đầu; [DSC7e và các bài AD10/AD68] cung cấp phần kỹ thuật. Khi chạy, capability/version của runner mới quyết định câu nào thực thi được.

## Statement, clause, keyword, identifier, literal

```sql
SELECT ssn, salary * 12 AS annual_salary
FROM u3_employee
WHERE dno = 4
ORDER BY annual_salary DESC, ssn;
```

Cả đoạn tới dấu; là một statement. SELECT,FROM,WHERE,ORDER BY là các clause; SELECT,AS,WHERE,DESC là keyword ở vị trí ấy; ssn,u3_employee,annual_salary là identifier;4,12 là numeric literal. Keyword không đồng nghĩa mọi từ có vai trò trong ngôn ngữ đều reserved trong mọi context/version. Chọn tên tránh reserved words và nhất quán giúp ít phụ thuộc quoting.

Keyword SELECT và select có cùng nghĩa, nhưng identifier/table name không được suy luôn case-insensitive: trong MySQL còn phụ thuộc loại object,OS và cấu hình lower_case_table_names. Bài dùng lowercase_snake_case cho bảng/cột, UPPER CASE cho keyword. Đó là convention đọc, không phải requirement ngữ pháp cho mọi dự án. [MySQL identifier case](https://dev.mysql.com/doc/refman/8.4/en/identifier-case-sensitivity.html).

Thụt dòng làm lộ cấu trúc query, không tạo một thuật toán mới. Với query lồng, mỗi SELECT/FROM/WHERE ở dòng phù hợp, thụt phần subquery; không đổi literal hoặc token trong lúc “format”. Dấu; bên trong string không tự kết thúc statement.

```sql
SELECT '-- not a comment' AS marker; -- Ghi chú tới cuối dòng
/* Ghi chú giải thích lý do chọn predicate, không lặp lại tên cột. */
SELECT ssn FROM u3_employee WHERE salary >= 20000;
```

MySQL cần whitespace/control character sau hai dấu-- để mở kiểu comment đó. `/* ... */` ở đây là block comment thường; đừng coi mọi dạng comment MySQL đều luôn vô tác dụng, vì có dạng executable comment/hint riêng. Chuỗi `'-- not a comment'` là literal. [MySQL comments](https://dev.mysql.com/doc/refman/8.4/en/comments.html).

## Chọn kiểu và cách so sánh

ID như000001 phải giữ0 đầu nên thường dùng CHAR/VARCHAR. INT/SMALLINT có miền hữu hạn; DECIMAL(p,s) lưu số thập phân theo precision/scale; FLOAT/DOUBLE là xấp xỉ. DECIMAL(3,1) chứa44.5 nhưng không chứa444.5;0.32 không biểu diễn chính xác ở scale1 và cần policy làm tròn/cắt/cảnh báo của engine, không chỉ nói nó là một số “bị cấm” trong mọi mode. [MySQL DECIMAL](https://dev.mysql.com/doc/refman/8.4/en/fixed-point-types.html).

Bit string biểu diễn một dãy bit, chẳng hạn b'0101' có bốn vị trí; integer5 là số có phép tính số học. Chúng có thể được chuyển đổi nhưng không cùng ý nghĩa miền. Một domain/type do người dùng định nghĩa là khả năng của ngôn ngữ/hệ cụ thể; runner MySQL có thể dùng kiểu nền kèm CHECK cho yêu cầu này, không nhận `CREATE DOMAIN` của PostgreSQL là MySQL syntax. DATE cho ngày sinh/ngày bắt đầu, TIME cho giờ trong ngày theo policy; DATETIME/TIMESTAMP có quy tắc time zone/range khác cần chọn rõ. Ví dụ giờ bắt đầu09:30:00 không cần gán một ngày giả chỉ để thành date-time.

Trong MySQL, BOOL/BOOLEAN là alias TINYINT(1), không tự giới hạn dữ liệu chỉ0 và1; dùng `CHECK(flag IN (0,1))` cùng NULL policy khi brief cần. FLOAT(p) dùng p theo precision nhị phân để chọn cách lưu, không đọc p là số chữ số thập phân sau dấu chấm. [MySQL numeric types](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html).

CHAR có độ dài khai báo cố định, VARCHAR có độ dài thay đổi; hành vi khoảng trắng khi lưu/đọc và so sánh cần phân biệt. Với VARCHAR dùng collation PAD SPACE, `'ab'` và `'ab '` có thể bằng; với NO PAD như utf8mb4_0900_ai_ci chúng khác vì khoảng trắng cuối có ý nghĩa. CHAR có thể bỏ khoảng trắng cuối khi lấy ra, nên kết quả byte/độ dài cũng cần xem kiểu. Không học quy tắc “SQL luôn bỏ mọi padding khi so chuỗi” từ slide. [MySQL CHAR/VARCHAR](https://dev.mysql.com/doc/refman/8.4/en/char.html).

## Đọc đúng sáu quan hệ Company

Sơ đồ Company của slide18 có các miền quan hệ sau; đây là schema để hiểu key và FK, không phải toàn bộ business policy có thể suy từ hình:

| Relation | Thuộc tính | Primary key |
|---|---|---|
| Employee | Fname,Minit,Lname,Ssn,Bdate,Address,Sex,Salary,Super_ssn,Dno | Ssn |
| Department | Dname,Dnumber,Mgr_ssn,Mgr_start_date | Dnumber |
| Dept_Locations | Dnumber,Dlocation | (Dnumber,Dlocation) |
| Project | Pname,Pnumber,Plocation,Dnum | Pnumber |
| Works_On | Essn,Pno,Hours | (Essn,Pno) |
| Dependent | Essn,Dependent_name,Sex,Bdate,Relationship | (Essn,Dependent_name) |

Có tám cạnh FK: Employee.Super_ssn→Employee.Ssn; Employee.Dno→Department.Dnumber; Department.Mgr_ssn→Employee.Ssn; Dept_Locations.Dnumber→Department.Dnumber; Project.Dnum→Department.Dnumber; Works_On.Essn→Employee.Ssn; Works_On.Pno→Project.Pnumber; Dependent.Essn→Employee.Ssn. Super_ssn là self-reference, còn Employee–Department tạo vòng schema. Một FK manager không tự kiểm manager thuộc đúng department; hình cũng không tự bắt supervisor khác chính employee hoặc cấm chu trình quản lý.

Một Department có nhiều location nên Dnumber riêng không là key của Dept_Locations. Một employee làm nhiều project và một project có nhiều employee, nên Works_On cần cả Essn,Pno. Tên dependent chỉ phân biệt trong từng employee, không unique toàn công ty. Minit là cột trong hình gốc; partner_ssn ở fixture cũ PE là mở rộng, không thuộc sáu quan hệ của sơ đồ nguồn.

## Tạo vòng FK bằng ALTER và nạp dữ liệu hợp lệ

Ví dụ DDL sau tạo Employee trước khi thêm FK dno. ID mẫu là chuỗi9 ký tự; policy sex không bị suy từ hình. Department name unique và CHECK thời gian là lựa chọn PE có ghi rõ; không nhận là mọi ràng buộc mặc định của diagram.

```sql
CREATE TABLE u3_employee (
 ssn CHAR(9) PRIMARY KEY,
 fname VARCHAR(30) NOT NULL, minit CHAR(1), lname VARCHAR(30) NOT NULL,
 bdate DATE, address VARCHAR(120), sex CHAR(1),
 salary DECIMAL(10,2), super_ssn CHAR(9), dno INT,
 CONSTRAINT u3_emp_super FOREIGN KEY(super_ssn) REFERENCES u3_employee(ssn)
   ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE u3_department (
 dnumber INT PRIMARY KEY, dname VARCHAR(40) NOT NULL UNIQUE,
 mgr_ssn CHAR(9), created_date DATE NOT NULL, mgr_start_date DATE,
 CHECK(dnumber BETWEEN 0 AND 99),
 CHECK(mgr_start_date IS NULL OR created_date <= mgr_start_date),
 CONSTRAINT u3_dept_mgr FOREIGN KEY(mgr_ssn) REFERENCES u3_employee(ssn)
   ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
ALTER TABLE u3_employee ADD CONSTRAINT u3_emp_dept
 FOREIGN KEY(dno) REFERENCES u3_department(dnumber)
 ON DELETE SET NULL ON UPDATE CASCADE;
```

Tất cả bảng đang rỗng nên thêm FK kiểm được. Nạp Department với manager NULL trước, nạp employee tham chiếu department và supervisor đã có, rồi UPDATE manager. Không cần tắt foreign_key_checks. Nếu brief bắt manager và dno đều NOT NULL ngay từ bước tạo, cần chiến lược khác được engine hỗ trợ; không lén dùng dữ liệu vi phạm trong một transaction rồi giả MySQL sẽ defer tới COMMIT.

```sql
INSERT INTO u3_department VALUES (4,'Field lab',NULL,'2026-01-01',NULL);
INSERT INTO u3_employee VALUES
 ('000000101','Lan',NULL,'Do','1995-02-10','Hue','F',20000,NULL,4);
INSERT INTO u3_employee VALUES
 ('000000102','Minh','Q','Le','1998-03-11','Hanoi','M',18000,'000000101',4);
UPDATE u3_department
SET mgr_ssn='000000101',mgr_start_date='2026-02-01'
WHERE dnumber=4;
```

Đổi Department.dnumber4→5 cascade sang employee.dno theo FK này. Xóa supervisor101 có thể đặt super_ssn của102 và manager của Department về NULL nếu không có các child khác chặn. Đổi Ssn101 khi employee102 vẫn tham chiếu bị ON UPDATE RESTRICT chặn. Không hứa self-referential ON UPDATE CASCADE của InnoDB sẽ sửa đệ quy mọi supervisor; source33 còn nhầm PRIMARY KEY(ESSN) trong bảng chỉ khai báo SSN. DDL ở đây dùng tên đúng và policy rõ. SET DEFAULT được nhắc trong các họ referential action nhưng không là policy FK thực thi được của InnoDB ở bài này. [MySQL FK restrictions](https://dev.mysql.com/doc/refman/8.4/en/constraint-foreign-key.html).

Cascade delete manager→Department có nghĩa xóa cả department nếu policy đó được chọn, khác SET NULL giữ department nhưng bỏ manager. Nếu manager field NOT NULL, không chọn SET NULL mà vẫn mong lệnh xóa thành công. Default0 ở một FK không tự bảo đảm parent0 tồn tại. Business policy và tính hợp lệ dữ liệu là hai phần phải cùng kiểm.

## Thêm các quan hệ phụ thuộc và kiểm biên

```sql
CREATE TABLE u3_dept_locations (
 dnumber INT, dlocation VARCHAR(60), PRIMARY KEY(dnumber,dlocation),
 FOREIGN KEY(dnumber) REFERENCES u3_department(dnumber)
) ENGINE=InnoDB;
CREATE TABLE u3_project (
 pnumber INT PRIMARY KEY, pname VARCHAR(60), plocation VARCHAR(60), dnum INT,
 FOREIGN KEY(dnum) REFERENCES u3_department(dnumber)
) ENGINE=InnoDB;
CREATE TABLE u3_works_on (
 essn CHAR(9), pno INT, hours DECIMAL(4,1) NOT NULL,
 PRIMARY KEY(essn,pno), CHECK(hours BETWEEN 1 AND 56),
 FOREIGN KEY(essn) REFERENCES u3_employee(ssn),
 FOREIGN KEY(pno) REFERENCES u3_project(pnumber)
) ENGINE=InnoDB;
CREATE TABLE u3_dependent (
 essn CHAR(9), dependent_name VARCHAR(40), sex CHAR(1), bdate DATE,
 relationship VARCHAR(30), PRIMARY KEY(essn,dependent_name),
 FOREIGN KEY(essn) REFERENCES u3_employee(ssn)
) ENGINE=InnoDB;
```

Hours1 và56 được nhận;0,56.1 và NULL bị từ chối theo policy rõ của hoạt động này. PK composite ngăn thêm hai hàng cùng employee/project dù hours khác. CHECK không NOT NULL có thể nhận UNKNOWN; DDL đã thêm NOT NULL để tránh khoảng trống đó. Foreign key chỉ bảo đảm đối tượng được tham chiếu tồn tại; nó không tự hạn chế tổng giờ trên nhiều project.

Với cross-column CHECK `created_date <= mgr_start_date`, phải nói manager start có được NULL không. DDL trên cho phép chưa có manager date; khi có date, không được trước ngày thành lập. Ngày bằng nhau đạt. Việc đổi schema là phần của migration/evolution; không mặc định mọi ALTER chứng minh giai đoạn thiết kế trước làm sai như một câu khái quát trong slide.

## DDL trên web: nhìn schema thay đổi

Backend cấp schema riêng cho lượt làm. “Tạo lượt mới” có thể tương ứng CREATE DATABASE/connection selection ở backend. USE chọn default database của **connection** đó, không chuyển mọi connection khác. UI cần hiện tên/mã lượt và schema đang chọn trước khi chạy. SHOW DATABASES/SHOW TABLES phản ánh quyền và context của account; DESCRIBE/SHOW COLUMNS cho cấu trúc ở MySQL, không khẳng định lệnh DESCRIBE chỉ tồn tại duy nhất ở một hãng.

Ví dụ riêng trong schema mới, chưa có các tên sau:

```sql
CREATE TABLE u3_author (id INT PRIMARY KEY,name VARCHAR(40) NOT NULL);
CREATE TABLE u3_note (
 id INT PRIMARY KEY,author_id INT,
 description VARCHAR(120),hobby VARCHAR(60),birth_date DATE,
 FOREIGN KEY(author_id) REFERENCES u3_author(id)
);
CREATE TABLE u3_tag (id INT PRIMARY KEY,label VARCHAR(40));
INSERT INTO u3_author VALUES(1,'Ha');
INSERT INTO u3_note VALUES(8,1,'draft','walking','2000-01-02');
ALTER TABLE u3_note DROP COLUMN description;
ALTER TABLE u3_note DROP COLUMN hobby, DROP COLUMN birth_date;
RENAME TABLE u3_tag TO u3_label;
```

Sau ALTER, note còn id,author_id và hàng(8,1); ba giá trị của cột bị bỏ không còn trong bảng. RENAME đổi tên bảng chứ không copy nội dung. Khi thu hồi fixture, DROP TABLE u3_note trước u3_author vì FK; u3_label độc lập. DROP TABLE xóa cả definition và rows, DELETE xóa rows giữ definition. Lượt DDL có schema dùng một lần và backend cleanup đúng scope; không dựa vào ROLLBACK để hứa hoàn tác mọi MySQL DDL có implicit commit.

## Alias, ORDER BY và phần trăm đầu

Alias annual_salary trong SELECT đầu bài dùng ở ORDER BY. Alias có dấu cách được đặt trong backtick ở MySQL, như ví dụ sau; double quote phụ thuộc ANSI_QUOTES nên bài dùng alias đơn giản khi không cần heading có khoảng trắng. Literal chuỗi dùng single quote. Sửa alias không tự đổi tên cột bền trong table.

```sql
SELECT salary*12 AS `annual salary` FROM u3_employee;
```

`ORDER BY 2 DESC,ssn` trong SELECT(ssn,annual_salary) chọn output thứ2 làm sort key; vị trí là số nguyên dương,0 không là cột thứ0 hợp lệ. Cách dùng alias dễ giữ nghĩa hơn khi thay thứ tự SELECT list. ORDER BY chưa luôn là clause cuối vì LIMIT có thể theo sau trong MySQL. Nếu cần kết quả cắt top-k ổn định, thêm tie-breaker duy nhất như ssn theo brief.

TOP PERCENT trong slide là cú pháp họ SQL Server, không chạy nguyên văn trên MySQL. Chọn contract mới: lấy ceil(p*N/100) hàng sau filter, theo score DESC rồi id ASC, không nới ties. Với7 hàng và30%, lấy3 hàng. Nếu brief muốn mọi hàng cùng score tại biên, cần policy khác và có thể trả nhiều hơn3. [Microsoft TOP](https://learn.microsoft.com/en-us/sql/t-sql/queries/top-transact-sql?view=sql-server-ver17).

MySQL8.4 có thể biểu diễn contract không nới ties bằng window functions:

```sql
WITH ranked AS (
 SELECT id,score,
        ROW_NUMBER() OVER(ORDER BY score DESC,id) AS rn,
        COUNT(*) OVER() AS n
 FROM u3_score WHERE eligible=1
)
SELECT id,score FROM ranked
WHERE rn<=CEIL(30*n/100.0)
ORDER BY score DESC,id;
```

Ví dụ eligible có scores theo ID1..7 là90,90,85,85,80,75,70 thì result ID1,2,3. Không dùng LIMIT3 cho mọi dataset để giả nó luôn là30%. Khi filter rỗng,query trả rỗng; không cần sinh một hàng NULL để đủ số.

## INSERT SELECT, DELETE và UPDATE thay những hàng nào?

Fixture riêng cho DML:

```sql
CREATE TABLE u3_people (id INT PRIMARY KEY,name VARCHAR(30),city VARCHAR(30),dept_id INT);
CREATE TABLE u3_selected (id INT PRIMARY KEY,name VARCHAR(30));
INSERT INTO u3_people VALUES
 (1,'An','Hue',NULL),(2,'Binh','Hanoi',4),(3,'Chi','Hue',5),(4,'Dung','Danang',NULL);
INSERT INTO u3_selected(id,name)
SELECT id,name FROM u3_people WHERE city='Hue';
```

Target nhận(1,An),(3,Chi); danh sách cột và kiểu phải khớp. Chạy lại có thể lỗi PK duplicate, không tự thành idempotent vì lệnh dùng SELECT. Bài muốn copy một lần thì tạo target mới; bài muốn đồng bộ cần policy conflict riêng. Source không bị xóa bởi INSERT SELECT.

Từ cùng trạng thái ban đầu, `DELETE FROM u3_people WHERE dept_id IS NULL` xóa1,4 và còn2,3; `DELETE FROM u3_people` xóa cả bốn nhưng giữ bảng. `UPDATE u3_people SET dept_id=8 WHERE dept_id IS NULL` chỉ đổi1,4; bỏ WHERE đổi cả1..4 thành8. Mỗi nhánh hoạt động dùng fixture mới để so kết quả; không chạy nối tiếp rồi hỏi như thể cùng trạng thái đầu. Predicate `=NULL` không thay IS NULL.

## Luyện tập

1. Phân loại MySQL,Linux,SQL,editor web. Trong SELECT đầu bài, đánh dấu statement,clause,keyword,identifier,literal; chữ hoa/thường của keyword có bảo đảm bảng Employee và employee giống trên mọi cấu hình không?
2. Format `SELECT id FROM (SELECT id FROM u3_people WHERE city='Hue') AS q ORDER BY id;` thành nhiều dòng mà giữ token/meaning. Phân loại `'/*x*/'`, `-- x`, `/*x*/`; sửa `--x` nếu muốn comment MySQL. Mốc SQL-92 khác chuẩn đầu tiên và feature support ở runner như thế nào?
3. Chọn kiểu cho ID000101,giá44.5,giờ09:30,bitmask0101 và flag chỉ0/1. Vì sao DECIMAL(3,1) không giữ chính xác0.32? FLOAT(12) có đồng nghĩa12 chữ số sau dấu chấm không?
4. Với VARCHAR dùng PAD SPACE và NO PAD, dự đoán `'ab'='ab '` theo từng contract. Vì sao cần xem cả CHAR/VARCHAR và collation thay vì quy tắc “bỏ mọi khoảng trắng”? Chọn cách kiểm metadata khi chưa biết collation.
5. Từ bảng Company, ghi đủ tám FK và ba composite keys. Self-reference nào có thể trỏ về cùng relation? FK manager có tự bảo đảm manager thuộc department đó không? Chỉ rõ cột Minit và phần mở rộng partner của PE.
6. Sắp Employee/Department/ALTER/nạp dữ liệu trong ví dụ thành thứ tự hợp lệ. Tự viết ALTER ADD CONSTRAINT cho employee.dno. Chọn hai ca CHECK date: bằng nhau,trước ngày thành lập,NULL và nêu policy.
7. Tạo Works_On theo schema đã nêu rồi thử hours0,1,56,56.1,NULL trên các lượt riêng với parent có sẵn. Dự đoán ca được nhận/lỗi và PK khi thêm cùng employee/project hai lần.
8. Trên dữ liệu101 quản lý102,department4 do101 quản lý, trace riêng: đổi dnumber4→5; xóa101; đổi Ssn101 khi102 vẫn tham chiếu. Chọn policy SET NULL/CASCADE/RESTRICT và giải thích vì sao không lấy nguyên source33 làm MySQL code đúng.
9. Tự viết schema ba bảng author,note,tag có một FK, thêm ba cột phụ rồi bỏ,rename tag,label và drop tất cả theo thứ tự hợp lệ. Ghi row/schema sau ALTER; backend chọn schema khác khác gì USE trên connection hiện tại?
10. Cho u3_score như ví dụ7 hàng, tính top30% không nới ties và query bằng window. Nếu thêm eligibility filter còn6 hàng, cần bao nhiêu? Sửa ORDER BY theo alias và theo ordinal dương cho annual_salary; ORDER BY0 có được coi là cột đầu không?
11. Tự viết INSERT SELECT vào u3_selected để chỉ lấy Hue. Trace target,source khi chạy một lần và dự đoán chạy lặp. Đổi fixture có hai người trùng name nhưng ID khác: cần DISTINCT(name) không?
12. Từ fixture u3_people mới mỗi nhánh, viết delete NULL,delete all,update NULL→8,update all→8. Ghi IDs còn và dept_id cuối; sửa `WHERE dept_id = NULL`.

## Gợi ý

Với DDL, chụp schema và trạng thái FK trước/sau, không chỉ số hàng. Với DML, xác định predicate chọn ID nào trước khi viết SET/DELETE. Với SELECT top-percent, tính N **sau filter** và quyết định ties trước khi cắt. Một kiểu hoặc keyword cùng tên có thể có semantics khác giữa engine.

## Đáp án và lập luận

1. MySQL là DBMS,Linux là OS,SQL là ngôn ngữ,editor là client. Statement gồm cả SELECT tới; các clause tách SELECT/FROM/WHERE/ORDER BY; ssn/table/alias là identifier,4/12 là literal. Identifier case cần config/OS/type cụ thể, không suy từ SELECT=select.
2. Xuống dòng SELECT/FROM/WHERE trong subquery,thụt subquery và để ORDER BY ngoài; không đổi token. Chuỗi là literal;-- có space và block thường là comment; sửa--x thành-- x. SQL-92 là revision, chuẩn ANSI đầu1986; không lấy năm chuẩn làm chứng cứ engine hiện tại hỗ trợ một feature.
3. CHAR/VARCHAR,DECIMAL theo range/scale,TIME,BIT(4) hoặc kiểu phù hợp,BOOLEAN/TINYINT kèm CHECK0/1 và NULL policy. Scale1 không chứa phần trăm đơn vị của0.32 nên cần chuyển đổi có thể mất chi tiết; FLOAT(p) không là số chữ số sau dấu thập phân.
4. Theo hai contract đã nêu: PAD SPACE cho bằng,NO PAD cho khác. CHAR retrieval còn có thể bỏ padding nên phải xem dữ liệu thật/type. Kiểm INFORMATION_SCHEMA.COLUMNS,COLLATIONS và PAD_ATTRIBUTE cùng SQL mode/type trước khi kết luận. Đây là task theo manual; chưa nhận model chuỗi đơn giản là engine test.
5. Tám cạnh là danh sách trong lời giảng; key Dept_Locations(Dnumber,Dlocation),Works_On(Essn,Pno),Dependent(Essn,Dependent_name). Employee.Super_ssn self-reference. Manager FK chỉ kiểm existence; policy cùng department cần rule khác. Minit thuộc source; partner không thuộc source diagram.
6. CREATE Employee không FKdno,CREATE Department tham chiếu Employee,ALTER Employee thêm FKdno,INSERT department managerNULL,INSERT supervisor rồi subordinate,UPDATE manager. ALTER và CHECK đầy đủ đã ở DDL. Date bằng được nhận,trước bị từ chối,NULL được nhận theo policy PE;created_date không NULL.
7. Chỉ1,56 được nhận;0,56.1 ngoài range vàNULL bị NOT NULL chặn. PK(essn,pno) từ chối cặp trùng dù hours khác; parent thiếu vẫn lỗi FK ngay cả khi hours hợp lệ. Dùng DDL đầy đủ ở phần quan hệ phụ thuộc.
8. Đổi dnumber làm dno của101,102 thành5; xóa101 đặt super_ssn của102 và manager vềNULL trong fixture không có child khác chặn; đổi ssn101 bị self-FK RESTRICT. Source33 khai báo SSN nhưng primary ESSN sai; SET DEFAULT và self-update cascade không được suy là engine sẽ thực hiện theo ý. DDL chọn policy rõ, không disable FK.
9. Dùng toàn bộ ví dụ author/note/tag ở lời giảng; sau ALTER note chỉ(id,author_id) và row(8,1);rename tạo tênlabel thaytag. Đáp án cleanup: `DROP TABLE u3_note; DROP TABLE u3_author; DROP TABLE u3_label;` trong schema dùng một lần. UI/backend cấp lượt khác;USE chỉ chọn default DB cho một connection, không đổi mọi session.
10. ceil(2.1)=3,ID1,2,3; khi còn6 hàng thì ceil(1.8)=2. Query window đầy đủ ở lời giảng,COUNT OVER trên tập sau filter. `ORDER BY annual_salary DESC,ssn` hoặc `ORDER BY 2 DESC,ssn` trên SELECT đúng thứ tự;0 không là ordinal hợp lệ. Alias có khoảng trắng dùng quoting theo dialect, không sửa literal thành identifier tùy tiện.
11. `INSERT INTO u3_selected(id,name) SELECT id,name FROM u3_people WHERE city='Hue';` nhận1,3;source giữ nguyên. Lặp lại có thể lỗi PK. Hai name trùng nhưng ID khác vẫn là hai người; DISTINCT(name) vừa đổi schema vừa có thể làm mất người, không đáp ứng target(id,name).
12. `DELETE FROM u3_people WHERE dept_id IS NULL;` còn2,3;delete không WHERE còn0row. `UPDATE u3_people SET dept_id=8 WHERE dept_id IS NULL;` cho(1,8),(2,4),(3,5),(4,8);bỏWHERE cho cả bốn8. IS NULL thay= NULL. Các câu giữ/xóa đúng theo trạng thái đầu riêng từng nhánh, không dự đoán từ bảng đã bị xóa ở nhánh trước.

## Biến thể và cách kiểm

Luân phiên phân loại code, sửa syntax, kéo thứ tự DDL, dự đoán FK transition, điền output rồi viết SQL trên fixture đổi ID. Query checker kiểm types/NULL/bag/order theo brief; migration checker nhìn schema và thử ca hợp lệ/vi phạm. Statement khác cùng hành vi có thể đúng; không so whitespace hoặc một đáp án string duy nhất. Lỗi syntax,permission,constraint và timeout là các kết quả riêng.

## Học trên web

Người học bấm tạo fixture,thực hiện trong SQL editor rồi xem schema diff/result/error; không chạy lệnh shell. Runner chỉ cấp quyền trong lượt riêng, cleanup nhận chính xác schemaID của lượt. Nút xem đáp án giữ lịch sử hỗ trợ. Các snippet có CREATE/DROP dùng fixture độc lập; dev không nối tất cả code block thành một script production. Bảng so dialect là hoạt động lý thuyết; chỉ result có artifact engine/version mới gắn nhãn thực thi thật.

## Nguồn và đối chiếu

Lecture3 USTH các trang nêu đầu bài,Company diagram và hai-session/schema contract của bộ Advanced. Lỗi spelling CRATE/DROP TALBE/ESSN được sửa; DATE thay manager date CHAR trong adaptation; keyword case,CHAR padding,TOP,BOOLEAN,FLOAT,FK actions được diễn đạt theo dialect. Các primary docs MySQL8.4/Microsoft đã mở kiểm ngày05/11/2026. Nội dung mới tiếp nối AD01/AD10–AD12; không sửa snapshot85 bài nền hoặc nhận fixture PE là dump USTH nguyên bản.
