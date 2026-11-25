# USTH04 · Join, phép tập hợp và báo cáo theo nhóm

Học sau USTH02/USTH03 hoặc các bài nền tương ứng; nối AD01/AD10 với Lecture4 USTH. Bài dùng dữ liệu PE nhỏ để bạn tự tính trước khi chạy SQL. SQL dành cho MySQL8.4; phép đại số được diễn đạt riêng khi cần set semantics.

Một báo cáo “mọi phòng và số người” vẫn phải giữ phòng chưa có ai. Đổi INNER JOIN thành LEFT JOIN là một bước, nhưng COUNT(*),điều kiện WHERE và hàng trùng còn có thể làm báo cáo sai. Ta theo từng hàng qua query thay vì chỉ nhớ tên các kiểu join.

## Từ hai bảng tới từng cặp hàng

```sql
CREATE TABLE u4_room (id INT PRIMARY KEY,label VARCHAR(20));
CREATE TABLE u4_member (id INT PRIMARY KEY,name VARCHAR(20),room_id INT);
INSERT INTO u4_room VALUES(1,'Blue'),(2,'Green'),(3,'Quiet');
INSERT INTO u4_member VALUES(10,'An',1),(11,'Binh',1),(12,'Chi',2),(13,'Dung',NULL);
```

Không khai báo FK room_id trong fixture này để có thể thêm ca tham chiếu thiếu khi luyện. CROSS JOIN tạo3×4=12 cặp; thêm điều kiện bằng nhau giữ ba cặp(1,10),(1,11),(2,12). Join không đồng nghĩa mỗi hàng trái chỉ có một hàng phải: Room1 xuất hiện hai lần vì có hai witness.

```sql
SELECT r.id AS room_id,r.label,m.id AS member_id,m.name
FROM u4_room AS r
INNER JOIN u4_member AS m ON m.room_id=r.id
ORDER BY r.id,m.id;
```

Comma FROM với predicate equality có thể biểu diễn cùng inner join ở ví dụ đơn giản này; viết JOIN ON giúp nhìn ranh giới. Qualification r.id/m.id phân biệt các cột cùng tên, còn alias output room_id/member_id phân biệt schema kết quả. Cartesian product có thể là điều cần thật, chẳng hạn tạo mọi tổ hợp lịch/phòng; chỉ coi đó là lỗi khi brief cần một quan hệ nối mà query đã bỏ predicate.

Trong set algebra, theta join là selection trên product rồi projection các cột cần. Ký hiệu selection là σ, không phải δ loại trùng. INNER JOIN bao gồm cả equijoin và non-equijoin; nhãn “Non-INNER JOIN” của slide7–8 đang mô tả **non-equijoin**, không phải đối lập inner/outer.

Ví dụ xếp hạng dùng `mark>=lo AND mark<hi`: một điểm ở đúnglo thuộc khoảng, đúnghi không thuộc khoảng đó. Với bands[0,50),[50,80),[80,101), điểm50 vào band2,100 vào band3. Nếu đặt cả hai phía<=,điểm50 có thể khớp hai band. Nếu source có band cuối[80,100),điểm100 không có match; cần quyết định đó có đúng brief không, không đổ cho INNER JOIN.

## Giữ hàng không có cặp phù hợp

Room LEFT JOIN Member giữ ba cặp match và một hàng(3,Quiet,NULL,NULL). Member RIGHT JOIN Room là cách đảo hai phía để giữ Room, nhưng Room RIGHT JOIN Member giữ mọi Member: có ba cặp match và hàng(NULL,NULL,13,Dung). SQL với dấu= không cho hai NULL join key tự khớp nhau.

Full outer join giữ phần match và unmatched ở **cả** hai phía. MySQL8.4 không có cú pháp FULL OUTER JOIN native; dưới đây là cách hợp thành đúng bag cho predicate bằng, với room.id NOT NULL làm dấu nhận biết không có match:

```sql
SELECT r.id AS room_id,r.label,m.id AS member_id,m.name
FROM u4_room AS r LEFT JOIN u4_member AS m ON m.room_id=r.id
UNION ALL
SELECT r.id,r.label,m.id,m.name
FROM u4_member AS m LEFT JOIN u4_room AS r ON m.room_id=r.id
WHERE r.id IS NULL;
```

Kết quả có5 hàng: ba match,phòng3 và member13. Nhánh thứ hai chỉ lấy unmatched để không nhân phần match; UNION thay UNION ALL có thể xóa các hàng trùng có ý nghĩa trong query khác. Nếu cột dùng đánh dấu match có thể NULL dù đã match, `WHERE marker IS NULL` không còn đủ đúng; dùng khóa không NULL hoặc NOT EXISTS theo predicate phù hợp.

Projection chỉ lấy m.name từ full join không còn hiện mã/nhãn phòng trống: nó vẫn có thể thêm hàng nameNULL nhưng người đọc không biết phòng nào. Danh sách cột phải đáp ứng brief, không xem ảnh output SELECT* trong slide là đúng schema của mọi query chỉ SELECT một cột.

Đặt predicate vào ON hay WHERE có thể đổi outer join. `ON m.room_id=r.id AND m.name='An'` vẫn giữ tất cả Room,kèm An nếu có. LEFT JOIN rồi `WHERE m.name='An'` loại các hàng bổ sung NULL và các member khác, chỉ còn phòng1/An. Nên nói rõ đang lọc witness hay lọc kết quả sau join.

## Self-join là hai vai của cùng một bảng

Với Employee(id,manager_id), bản e là người được quản lý,bản boss là quản lý. `e.manager_id=boss.id` nối hai vai; LEFT JOIN giữ cả người chưa có manager. Muốn hiển thị chuỗi ở MySQL dùng CONCAT theo policy NULL,không dùng dấu+ của một dialect khác như phép nối chuỗi mặc định.

```sql
SELECT e.id AS employee_id,boss.id AS manager_id,
       CONCAT(e.id,' managed by ',COALESCE(CAST(boss.id AS CHAR),'none')) AS note
FROM u4_employee AS e
LEFT JOIN u4_employee AS boss ON e.manager_id=boss.id
ORDER BY e.id;
```

Thêm row tự tham chiếu có thể hợp FK nhưng chưa chắc hợp business rule. Self-join không tự phát hiện mọi chu trình; bài graph/recursive query có nhiệm vụ khác. Tương tự, domain là các giá trị được phép,khác tập key thực sự xuất hiện ở một instance. Việc một room chưa có Member nói về instance và yêu cầu giữ phía nào,không thay định nghĩa domain.

## UNION không có cùng contract với UNION ALL

Cho hai bag một cột: A=[x,x,y],B=[x,z]. UNION cho[x,y,z] một bản mỗi giá trị; UNION ALL giữ ba x,một y,một z. INTERSECT DISTINCT cho[x],EXCEPT DISTINCT A−B cho[y]. Với ALL, multiplicity của union là a+b,intersection là min(a,b),difference là max(a−b,0): INTERSECT ALL có một x,EXCEPT ALL có một x và một y.

Các input phải có cùng số cột và kiểu tương thích theo engine; ý nghĩa cột và tên output cũng cần xác định. Khóa phân biệt toàn tuple được chọn: thêm một cột vào SELECT có thể làm hai hàng trước giống nhau trở nên khác. DISTINCT không giữ một “hàng tùy chọn” trong mỗi group; nó loại các output tuple bằng nhau theo semantics so sánh của hệ. NULL được coi không phân biệt cho loại trùng của phép tập hợp/DISTINCT,khác biểu thức `NULL=NULL` cho UNKNOWN.

Oracle có tên MINUS trong ví dụ của slide; EXCEPT/INTERSECT và các ALL variants cần kiểm capability/dialect. Bài khóa dùng MySQL8.4 theo [manual set operations](https://dev.mysql.com/doc/refman/8.4/en/set-operations.html). Với A={x,y},B={y,z},union là{x,y,z},intersection{y},A−B{x}; tô vùng ngoài phần giao rồi gọi đó là intersection sẽ sai. Hình Venn chỉ minh họa set,không cho biết số bản của bag.

## Aggregate giữ một kết quả cho mỗi group

Fixture mới này tách việc đếm hàng khỏi đếm amount đã biết:

```sql
CREATE TABLE u4_pay (id INT PRIMARY KEY,dept VARCHAR(10),job VARCHAR(10),amount DECIMAL(8,2));
INSERT INTO u4_pay VALUES
 (1,'A','dev',10),(2,'A','dev',20),(3,'A','ops',NULL),
 (4,'B','dev',5),(5,'B','ops',5),(6,NULL,'dev',NULL);
SELECT dept,COUNT(*) AS rows_n,COUNT(amount) AS known_n,
       SUM(amount) AS total,AVG(amount) AS mean_value,MIN(amount),MAX(amount)
FROM u4_pay GROUP BY dept;
```

GroupA có rows_n3,known_n2,total30,mean15,min10,max20. GroupB có2,2,10,5,5,5. GroupNULL có1,0,NULL,NULL,NULL,NULL. NULL group keys được gom cùng nhau cho GROUP BY; nó không biến `WHERE dept=NULL` thành đúng.

COUNT(*) đếm hàng kể cả hàng có amountNULL;COUNT(amount) đếm amount không NULL. SUM/AVG/MIN/MAX bỏ NULL input trong các ví dụ này. Với bảng/filter rỗng và **không GROUP BY**,COUNT trả0,các hàm còn lại trảNULL nhưng query vẫn có một hàng aggregate; có GROUP BY thì không có group nên không có hàng. “Mọi aggregate đều bỏ NULL” cần ngoại lệ COUNT(*) và phải xét hàm cụ thể,không là định nghĩa bao quát mọi extension.

SUM(DISTINCT amount) của groupB là5,khác SUM(amount)=10;COUNT(DISTINCT dept) toàn fixture là2 vì bỏ NULL. AVG không tự chia cho số hàng kể cả NULL. MIN/MAX so dữ liệu theo kiểu và ordering/collation,không áp một thứ tự số cho mọi chuỗi/ngày.

Độ phân tán cần ghi population hay sample. Với giá trị[2,4,6],mean4,tổng bình phương độ lệch8: VAR_POP=8/3,STDDEV_POP=sqrt(8/3);VAR_SAMP=4,STDDEV_SAMP=2 vì chia n−1. Một mẫu duy nhất không có sample variance xác định theo công thức này,nhưng population variance bằng0. MySQL STDDEV/VARIANCE là các alias population; dùng tên _POP/_SAMP khi brief cần rõ. [MySQL aggregate functions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html).

GROUP BY dept,job tạo group theo cả cặp;hai group khác nhau có thể cho cùng aggregate value. Cột grouping không bắt buộc xuất hiện trong SELECT,nhưng bỏ nó làm người đọc không biết kết quả thuộc group nào. Ngược lại,đưa một cột bất kỳ như id vào SELECT khi nó không được xác định trong group làm query không rõ nghĩa hoặc lỗi dưới ONLY_FULL_GROUP_BY; chọn bất kỳ một ID không phải lời giải. Functional dependency được engine nhận có thể cho phép một số cột ngoài GROUP BY,không dùng ngoại lệ đó để bỏ mọi kiểm semantics.

## WHERE rồi GROUP BY rồi HAVING

```sql
SELECT dept,SUM(amount) AS total
FROM u4_pay
WHERE job='dev'
GROUP BY dept
HAVING SUM(amount)>15
ORDER BY total DESC,dept;
```

Sau WHERE còn A10,A20,B5 vàNULL-group/NULL;group sums là A30,B5,NULL. HAVING giữA30. Đổi WHERE thành `amount>10` làm chỉ còn A20 trước khi nhóm,kết quảA20. Điều kiện aggregate không được tùy tiện kéo xuống lọc từng row. Đây là thứ tự **logic** để giải nghĩa; optimizer có thể thực hiện vật lý khác khi chứng minh tương đương.

Trong runner MySQL,viết GROUP BY trước HAVING rồi ORDER BY. Nhận xét về cú pháp cho phép đổi vị trí HAVING ở một hệ khác trong slide43 không là grammar MySQL. HAVING cũng có thể áp group ngầm khi query không có GROUP BY theo semantics hệ;phải phân biệt với WHERE row-level.

Muốn “giá trị lớn nhất trong các mean theo department”,không gửi `MAX(AVG(amount))` cùng query block rồi suy mọi engine cho lồng aggregate sâu2. Tạo tầng group rồi aggregate tầng ngoài:

```sql
SELECT MAX(dept_mean) AS max_dept_mean
FROM (
 SELECT dept,AVG(amount) AS dept_mean
 FROM u4_pay GROUP BY dept
) AS g;
```

Kết quả15. Nếu cần cả department đạt mean lớn nhất,còn phải xử lý ties bằng join/window/subquery phù hợp;query chỉ MAX chưa trả identity của group. Nói rõ output schema và tie contract trước khi sửa code.

## Luyện tập

1. Trên Room/Member, tính CROSS và inner join trước khi chạy. Viết query với alias output room_id/member_id và biểu thức set algebra tương ứng. Thêm member 14 có room_id=99 thì phần inner đổi không?
2. Viết LEFT, RIGHT và full-emulation giữ các phía; ghi các tuple và số hàng. Đặt m.name='An' trong ON so với WHERE khác gì? Nếu chỉ SELECT name, có còn hiển thị được nhãn phòng 3 không?
3. Dựng bands [0,50), [50,80), [80,101) và marks 49,50,80,100. Viết non-equijoin; đổi dấu < ở đầu trên thành <= và chỉ ra boundary bị nhân. Đây có phải vẫn là INNER JOIN không?
4. Employee có (1,NULL),(2,1),(3,1). Viết self-join giữ cả người không có manager, hiện text bằng CONCAT. Qualification và alias khác nhiệm vụ gì? Thêm (4,4) có tự bị join loại vì không hợp nghiệp vụ không?
5. Với A=[x,x,y], B=[x,z], tính sáu phép UNION/INTERSECT/EXCEPT với DISTINCT/ALL. Đưa phản ví dụ cho việc thay UNION ALL bằng UNION khi brief cần giữ số bản.
6. Tính aggregate theo dept và theo (dept,job) trên Pay. So COUNT(*), COUNT(amount), COUNT(DISTINCT dept), SUM(DISTINCT amount) cho B. Query không GROUP BY trên tập rỗng khác query có GROUP BY thế nào?
7. Viết query chỉ lấy job='dev', sau đó nhóm theo dept và giữ total>15. Đổi yêu cầu thành mỗi department có MAX(amount)>15, không lọc job. Ghi outputs và giải thích vì sao WHERE/HAVING không thay nhau được.
8. Viết query max của các mean theo department và query nhóm chỉ SELECT AVG mà không hiện dept. Vì sao SELECT id,AVG(amount) GROUP BY dept không được giải thích là chọn ID đại diện bất kỳ? Tính population/sample variance cho [2,4,6].

## Gợi ý

Với join, liệt kê các cặp match rồi mới thêm hàng unmatched có NULL; không dùng Venn để đếm bag. Với group, giữ danh sách row mỗi nhóm, đánh dấu input NULL và predicate loại row/group ở đúng bước. Tách “mean lớn nhất” với “department nào có mean ấy”.

## Đáp án và lập luận

1. CROSS có 12 hàng; inner có ba cặp (1,10),(1,11),(2,12). Query đầy đủ ở ví dụ đầu. Set expression project r.id,r.label,m.id,m.name từ selection m.room_id=r.id trên product hai bản đã rename. Member 14/99 không có Room nên inner vẫn ba cặp, CROSS thành 15. Predicate/alias không làm room 99 tự tồn tại.
2. LEFT có 4 hàng, RIGHT giữ Member có 4, full có 5 theo fixture đầu. LEFT thêm room 3/member NULL; RIGHT thêm room NULL/member 13; full thêm cả hai. Full-emulation SQL ở lời giảng. ON name='An' giữ room1/An,room2/NULL,room3/NULL; WHERE name='An' chỉ giữ room1/An. SELECT name không trả nhãn Quiet dù có hàng NULL của phòng trống.
3. `SELECT s.id,b.label FROM u4_mark s JOIN u4_band b ON s.mark>=b.lo AND s.mark<b.hi;` cho 49/band1,50/band2,80/band3,100/band3. Dùng <=hi làm 50 khớp band1 và band2, 80 khớp band2 và band3. Đây vẫn là INNER JOIN với điều kiện không chỉ equality; nhãn “non-INNER” trong slide cần sửa.
4. Query ở lời giảng với e,boss cho 1/none,2/1,3/1. Qualification chọn cột từ vai nào; output alias đặt tên kết quả. Row (4,4) tự match nếu dữ liệu cho phép; business rule cấm tự làm supervisor cần được kiểm riêng. Dấu + không thay CONCAT để nối chuỗi trong MySQL.
5. UNION DISTINCT: x,y,z; UNION ALL: x,x,x,y,z; INTERSECT DISTINCT: x; INTERSECT ALL: x; EXCEPT DISTINCT: y; EXCEPT ALL: x,y. Các thứ tự chỉ để trình bày. Giữ ba x khi brief cần ba sự kiện khác nhau khác việc gom chúng thành một x. So sánh toàn tuple với semantics NULL/type của hệ.
6. Group theo dept như lời giảng. Group theo cặp có A/dev=30,A/ops=NULL,B/dev=5,B/ops=5,NULL/dev=NULL. COUNT(DISTINCT dept)=2; B có SUM DISTINCT=5 và SUM=10. Query rỗng không group có một hàng COUNT=0,SUM=NULL; query rỗng có GROUP BY không có hàng. COUNT(*) trên LEFT JOIN cần xét hàng bổ sung NULL, không tự là số child.
7. Query lọc dev giữ A30 theo ví dụ. Query mới: `SELECT dept,MAX(amount) AS top_amount FROM u4_pay GROUP BY dept HAVING MAX(amount)>15;` trả A20. WHERE amount>15 trước SUM chỉ giữ 20, làm total khác 30. HAVING lọc group sau khi tính cả 10 và 20. WHERE job lọc loại đóng góp trước aggregate.
8. Derived-table query MAX của mean ở lời giảng trả 15. `SELECT AVG(amount) FROM u4_pay GROUP BY dept;` có ba hàng 15,5,NULL, không định thứ tự. ID không được xác định theo dept trên fixture; cần bỏ ID hoặc đổi yêu cầu/aggregate/tie policy. SQL mode không làm dữ liệu thiếu nghĩa trở nên đúng. Population variance=8/3, std=sqrt(8/3); sample variance=4, std=2. Cần brief nói population hay mẫu.

## Biến thể và cách kiểm

Luân phiên ghép hàng, đếm multiplicity, sửa join predicate, điền bảng group rồi tự viết query mới. Ca kiểm có zero-child, nhiều witness, NULL key, điểm ngoài range, giá trị ở biên và nhóm toàn NULL. Oracle so typed bag/order theo hợp đồng; SELECT* với số cột sai không đạt chỉ vì số hàng đúng. Các phép ALL có bộ đếm số bản riêng.

## Học trên web

Editor đi cùng hai bảng hoặc các nhóm đang hình thành. Người học nộp dự đoán trước khi mở trace cặp hàng/group; phần tự viết dùng fixture mới. Runner thật chịu trách nhiệm capability của cú pháp MySQL. Canvas giải thích dữ liệu không được gắn nhãn đã chạy SQL tùy ý. Khi chấm sai, chỉ ra cặp/hàng bị mất hoặc bị nhân trước khi mở toàn đáp án.

## Nguồn và đối chiếu

Lecture 4 USTH, 47 trang đã đọc cả text và hình; trang 1,3,25 là bìa/tiêu đề tham chiếu. Đã sửa cách diễn đạt inner=equijoin, non-inner thay non-equijoin, ký hiệu selection, nối chuỗi, dialect FULL/nested aggregate và COUNT(*)/NULL. Screenshot nguồn không được nhận là lượt chạy của bài PE; ví dụ mới giữ schema, giả định và expected riêng.
