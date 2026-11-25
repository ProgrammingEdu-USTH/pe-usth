# USTH01 · Đọc kiến trúc DBMS và chọn đúng công cụ

Học cùng AD67; nối Lecture1 USTH trang15–19,23,28,31,33–36 với các bảo đảm đã học. Đây là phần bổ sung cho những nội dung slide cần ví dụ và hoạt động riêng. Khi đã làm được một kỹ năng, có thể chuyển thẳng tới bài kiểm tương ứng; PDF giữ toàn bộ để tra cứu.

Một ứng dụng kiểm kê ảnh dùng rất ít bảng nhưng vẫn cần phục hồi sau mất điện. Một bộ điều khiển đọc cảm biến chỉ có một người dùng nhưng phải phản ứng đúng hạn. Cả hai đều nhỏ; quyết định dùng DBMS của chúng vẫn khác nhau vì yêu cầu khác nhau. Kích thước dữ liệu hay số người dùng riêng lẻ chưa đủ chọn kiến trúc.

## Đọc lịch sử theo sự thay đổi của cách truy cập

Các hệ file buộc chương trình biết cách tổ chức dữ liệu. Hệ phân cấp và network dùng đường liên kết đã định; mô hình quan hệ chuyển trọng tâm sang quan hệ và phép tính trên giá trị. SQL cho người dùng mô tả kết quả rồi để hệ tìm cách thực thi. Object, XML, NoSQL và các kiến trúc phân tán mở thêm lựa chọn về kiểu dữ liệu, giao diện và cách triển khai; chúng không đồng nghĩa hệ mới thay thế mọi hệ trước.

| Mốc trong phần lịch sử | Cách đọc sau khi đối chiếu |
|---|---|
| Bachman/network, IMS cuối thập niên1960 | IDS/network của Bachman có gốc từ đầu thập niên1960; không lấy1969 làm năm phát minh mọi mô hình network. IMS có mốc hoạt động/thương mại năm1968. |
| Codd và relational model | Bài báo của Codd công bố năm1970 đặt cơ sở mô hình quan hệ. |
| IBM, SQL, System R | SEQUEL/SQL và System R là công việc nghiên cứu của thập niên1970. Bài tổng kết System R năm1981 không có nghĩa dự án bắt đầu năm1981. |
| Oracle Version2 | Oracle ghi nhận bản SQL-based thương mại V2 năm1979; “first” cần nói rõ loại sản phẩm/mốc phát hành đang xét. |
| ANSI và SQL-92 | SQL có chuẩn ANSI năm1986;1992 là một revision lớn, không phải lần đầu SQL được chuẩn hóa. |
| Object/XML/NoSQL từ các giai đoạn sau | Phân biệt một họ mô hình, một định dạng, một chuẩn ngôn ngữ với tên/phiên bản sản phẩm. Danh sách trong slide là minh họa lịch sử. |

[CHM về Bachman](https://computerhistory.org/profile/charles-w-bachman/), [IBM về IMS](https://www.ibm.com/docs/en/zos-basic-skills?topic=now-history-ims-beginnings-nasa), [IBM System R](https://research.ibm.com/publications/a-history-and-evaluation-of-system-r), [IBM Standard SQL](https://publib.boulder.ibm.com/epubs/html/25122400/sqltmst45.htm) và [Oracle history](https://docs.oracle.com/en/database/oracle/oracle-database/21/cncpt/introduction-to-oracle-database.html) được dùng để sửa cách hiểu mốc của slide. Mỗi mốc giúp giải thích một thay đổi; bài kiểm không yêu cầu nhớ bảng năm rời rạc.

Ví dụ một ứng dụng đi theo đường `department→employee→project` phải sửa nhiều code khi đường truy cập đổi. Một query khai báo join theo khóa cho optimizer chọn access path khác mà vẫn giữ kết quả. Data independence giúp tách logic ấy khỏi layout, nhưng không hứa mọi migration schema đều miễn phí hay mọi query luôn nhanh hơn.

## Dữ liệu nhỏ hơn và hệ thống lớn hơn cùng tồn tại

DBMS có thể nằm trong một ứng dụng thiết bị, trên máy cá nhân hoặc sau một dịch vụ nhiều server. Thiết bị ưu tiên dung lượng, bộ nhớ, pin, offline và phục hồi khi nguồn ngắt. Một cụm phân tích ưu tiên scan lớn, phân phối công việc, skew và xử lý node lỗi. Song song thêm chi phí trao đổi và phối hợp; chia một query rất nhỏ qua nhiều node có thể chậm hơn làm tại chỗ.

Ví dụ máy ghi ảnh có metadata vài nghìn hàng và file ảnh lớn. Một embedded database có transaction cho metadata; ảnh có thể ở file/object storage với quy tắc liên kết và khôi phục. Đưa toàn ảnh vào một cột không tự làm việc ghi metadata và file ngoài atomic. Nếu yêu cầu “thành công” phải khôi phục cả hai sau crash, cần một protocol hoặc cơ chế đối soát được chỉ rõ.

Ở phía phân tích, ảnh vệ tinh cần giữ bản gốc, tọa độ, thời gian thu nhận và phiên bản hiệu chỉnh. Time series cảm biến cần timestamp, đơn vị, chất lượng đo và quy tắc resample. Audio/video cần codec, duration, kênh và cách tra đoạn. Lưu một BLOB giữ byte nhưng không tự tạo chỉ mục vị trí/thời gian hoặc giải thích ý nghĩa dữ liệu. Feature/embedding hay bản downsample là dữ liệu dẫn xuất; cần provenance để biết từ bản gốc và thuật toán nào.

Integration nối nguồn khác schema/định danh; warehouse giữ dữ liệu đã tổ chức cho phân tích; mining tìm pattern hay mô hình dự đoán. Ví dụ hai chi nhánh dùng mã khách khác nhau: hợp nhất identity là integration; xây bảng doanh thu ngày là warehouse; dự đoán nhu cầu tuần tới là mining. Query lấy doanh thu có thể tính chính xác theo data và contract; dự báo có sai số, cần đánh giá trên dữ liệu chưa dùng để học. Một sản phẩm có tính năng mining không làm mọi SELECT thành suy luận dự đoán.

## Ai chịu trách nhiệm phía sau một câu query?

Application developer viết nghiệp vụ, dùng transaction/API và xử lý kết quả. DBMS designer/implementer làm engine, storage, optimizer hoặc interface của DBMS. Tool developer làm schema designer, migration/analyzer hay công cụ hỗ trợ tối ưu. Operator/maintenance personnel duy trì môi trường máy, storage, service và vận hành. DBA chịu trách nhiệm quản trị dữ liệu theo tổ chức, có thể phối hợp hoặc kiêm nhiệm các vai trên; tên chức danh không thay việc phân công trách nhiệm cụ thể.

Ví dụ query đăng ký môn mất kết quả sau retry: dev ứng dụng kiểm request identity; lỗi thuật toán WAL thuộc nhóm engine; một công cụ khuyến nghị index sai thuộc nhóm tool; disk đầy và tiến trình không khởi động cần đội vận hành phối hợp DBA. Đổi màu dashboard không xử lý disk đầy; thêm một application server không tự kiểm chứng bản backup phục hồi được.

## Theo một yêu cầu qua các thành phần DBMS

Với `SELECT name FROM Student WHERE id='S7'`, query compiler phân tích cú pháp, phân giải tên và kiểu bằng catalog, rồi tạo plan. Execution engine chạy plan; index/file/record manager tìm record/page; buffer manager kiểm page trong buffer pool, yêu cầu storage manager đọc nếu thiếu. Row được đưa lên execution engine rồi trả client. Catalog và statistics là dữ liệu mà compiler/optimizer đọc, không phải một compiler thứ hai.

Với một UPDATE trong transaction, execution engine phối hợp concurrency control và transaction manager theo isolation. Log/recovery tạo record cần thiết, quản lý durability/WAL; page thay đổi trong buffer có thể được ghi ra sau theo chính sách. Commit response phụ thuộc contract bền được cấu hình. Không vẽ mũi tên từ UPDATE thẳng tới disk và suy rằng mọi ghi đã bỏ qua buffer, log và locks.

Trong hình31 của slide, hộp đơn là component có hành vi; hộp đôi như lock table và buffers là cấu trúc dữ liệu trong memory. Concurrency-control code truy cập lock table; lock table không tự chạy thuật toán. Buffer manager quản lý buffers; buffer pool là vùng chứa page, không phải disk. Nét liền biểu diễn control và data flow, nét đứt biểu diễn data flow: một mũi tên đưa metadata cho compiler không có nghĩa metadata tự gọi compiler. Cấu trúc chính xác từng engine có thể khác hình tổng quát này.

Một sơ đồ gọn cho lượt đọc là:

```text
Client -> Query compiler -> Execution engine
               ^                   |
        Catalog/statistics         v
                         Index/file/record manager
                                   |
                             Buffer manager
                              |         |
                         Buffer pool   Storage manager -> Disk
```

Đây là đường giải thích một lượt đọc, không vẽ hết mọi component của transaction. Với một UPDATE, người học phải bổ sung logging/recovery, concurrency control, lock table và transaction manager, đồng thời phân biệt lời gọi với dữ liệu mà chúng trao đổi.

## Quy tắc, suy luận và ràng buộc

Integrity constraint loại trạng thái không hợp lệ, chẳng hạn grade ngoài domain cho phép. Rule có thể suy quan hệ mới: `eligible(s,c)` khi sinh viên đã qua mọi prerequisite theo policy. Trigger có thể ghi một sự kiện nhắc nhở khi đủ điều kiện, với semantics và transaction boundary của nó. Suy luận không tự thực hiện tác động ngoài như gửi email đúng một lần; cần contract xử lý sự kiện và retry. Khả năng này phụ thuộc query/rule language và engine, không phải mọi DBMS đều có cùng rule system.

Tên DB2, SQL Server, Oracle9i, SQL Anywhere hay TeradataV2R5.0 ở slide33 cho thấy các ví dụ sản phẩm của tài liệu. Chúng không là bảng xếp hạng hay danh sách phiên bản được khóa khuyến nghị hiện nay. Khi cần feature, kiểm phiên bản và contract cụ thể thay vì suy từ tên hãng.

## Khi nào thêm DBMS có ích?

Một script đọc file tham số cố định, không cập nhật, không có truy cập đồng thời và luôn tái tạo được từ nguồn có thể dùng file đơn giản. Ngược lại, ứng dụng một người dùng vẫn có thể cần atomic update, chỉ mục và phục hồi khi crash. “Một user” không loại nhu cầu transaction.

Một vòng điều khiển phải đáp ứng trong2ms theo hard deadline cần phân tích worst-case; latency trung bình của query không chứng minh đáp ứng đúng hạn. Có thể giữ đường điều khiển riêng, ghi dữ liệu bất đồng bộ theo contract mất mát cho phép. Đây là yêu cầu thiết kế, không kết luận mọi DBMS đều quá chậm.

Capability mismatch khác overhead không cần thiết. Nếu yêu cầu query topology đường đi trên graph nhưng engine/interface được chọn chỉ hỗ trợ point read và ứng dụng không được tính bên ngoài, công cụ chưa đáp ứng yêu cầu. Nếu engine có đủ chức năng nhưng chi phí vận hành vượt lợi ích của một file ít thay đổi, đó là bài toán lựa chọn chi phí. Cần ghi cả dữ liệu, operations, độ trễ, chia sẻ, recovery và trách nhiệm vận hành trước khi kết luận.

## Luyện tập

1. Ghép ba thẻ “System R nghiên cứu”, “bài tổng kết System R1981”, “SQL-92” với vai trò: dự án, bài báo đánh giá, revision chuẩn. Sửa câu “SQL lần đầu được chuẩn hóa năm1992; System R bắt đầu năm1981”.
2. Chọn thiết kế cho máy ghi ảnh offline và cụm tổng hợp ảnh vệ tinh. Nêu một yêu cầu tài nguyên, một lỗi phải phục hồi và một trường hợp thêm song song không có lợi.
3. Nhãn nào đúng cho từng công việc: nối ID khách giữa hai hệ, xây fact doanh thu ngày, học mô hình dự báo? Vì sao lưu ảnh gốc, chuỗi nhiệt độ mỗi giây và embedding không có cùng contract?
4. Kéo từng lỗi tới vai chịu trách nhiệm chính: bug optimizer, tool sinh migration sai, volume đầy, API retry tạo đơn trùng. Giải thích một việc cần hai đội cùng xử lý.
5. Vẽ đường SELECT theo hình gọn rồi thêm các thành phần cho UPDATE trong transaction. Đánh dấu component, cấu trúc memory, dữ liệu bền; chỉ rõ hai mũi tên control/data và một mũi tên chỉ mang dữ liệu.
6. Với rule “đã đạt mọi môn tiên quyết thì đủ điều kiện”, chỉ ra dữ liệu suy ra, constraint và external action nếu hệ gửi thông báo. Thiết kế ca email trùng khi retry và cách lưu request/event identity.
7. Chọn DBMS hay file cho ba trường hợp: file cấu hình chỉ đọc/tái tạo được; nhật ký cá nhân một user cần phục hồi atomic; vòng điều khiển hard deadline2ms chưa có phân tích worst-case. Nêu điều kiện khiến lựa chọn cần thay đổi.
8. Một engine chỉ cho point lookup, brief bắt buộc ad-hoc join bên trong engine. Đây là overhead hay thiếu capability? Thay brief bằng chỉ đọc một giá trị cấu hình mỗi giờ thì đánh giá chi phí đổi thế nào?

## Gợi ý

Theo dõi vật được thay đổi: query result, state bền, file ảnh hay output ngoài hệ thống. Mỗi lựa chọn kiến trúc cần chỉ ra cơ chế nào bảo vệ vật ấy và điều gì xảy ra khi cơ chế dừng giữa chừng. Bài lịch sử kiểm ý nghĩa mốc, không chấm nhớ tên sản phẩm.

## Đáp án và lập luận

1. System R là dự án nghiên cứu của thập niên1970;1981 là mốc bài tổng kết đang được dẫn. ANSI SQL có chuẩn năm1986, SQL-92 là revision năm1992. Không suy ngày khởi đầu dự án từ ngày xuất bản bài đánh giá.
2. Máy ảnh cần ít RAM/offline và phục hồi liên kết metadata–file sau mất điện; cụm ảnh cần I/O/phân phối và xử lý node chết, giữ provenance/version. Query vài key có chi phí truyền/điều phối lớn hơn làm tại một node có thể không hưởng lợi song song; câu trả lời phải có workload để so.
3. Lần lượt integration,warehouse,mining. Ảnh gốc giữ byte/codec và metadata không gian; time series giữ timestamp/đơn vị/missingness; embedding là kết quả biến đổi cần model/version và không khôi phục mặc định mọi chi tiết bản gốc. Có thể lưu kết hợp nhưng phải định nghĩa những gì được giữ/mất.
4. Engine implementer,tool developer,operator và application developer. Volume đầy có thể cần operator mở rộng dung lượng, DBA kiểm growth/retention và dev tìm query tạo dữ liệu ngoài dự kiến; không chấm trách nhiệm chỉ qua chức danh.
5. SELECT đi qua compiler/plan/execution/access/buffer/storage; catalog/statistics cấp metadata. UPDATE thêm transaction manager,concurrency control,lock table,logging/recovery và WAL. Component có hành vi; pool/table là state. Một read-page request là điều khiển kèm địa chỉ, dữ liệu page trả về là luồng dữ liệu; metadata vào optimizer là dữ liệu. Chấp nhận layout khác nếu giải thích đúng trách nhiệm và không nhầm memory với disk.
6. `eligible` là dữ liệu suy ra; điều kiện grade/domain/FK bảo vệ dữ liệu gốc là constraint; email là external action. Ghi outbox/eventID trong transaction, worker và sink giữ dedup theo contract để retry không nhân hiệu ứng. Rule suy ra không tự bảo đảm exactly-once email.
7. File cấu hình có thể đủ nếu các giả định giữ; nhật ký có thể cần embedded DBMS/atomic protocol dù chỉ một user; hard deadline cần phân tích worst-case hoặc tách đường điều khiển. Bổ sung writer, yêu cầu recovery mới hoặc thay deadline có thể đổi lựa chọn. “Chỉ một user” và “dữ liệu nhỏ” chưa là chứng minh dùng file đủ.
8. Thiếu capability đối với brief ban đầu; không sửa được bằng cách gọi overhead thấp. Với point read ít đổi, engine có thể dư chức năng hoặc vận hành không đáng chi phí; vẫn phải xét độ bền/quyền/phục hồi của file thay thế.

## Biến thể và cách kiểm

Luân phiên phân loại mốc, gắn trách nhiệm, dựng sơ đồ và phản biện một lựa chọn. Rubric kiểm giải thích cơ chế, assumptions và lỗi, không đếm tên component được chép. Ví dụ mới đổi ảnh thành audio hoặc thiết bị y tế vẫn phải có dữ liệu/đơn vị/thời gian/provenance rõ; không chỉ thay danh từ.

## Học trên web

Dev chia bài thành các lượt ngắn theo kỹ năng: responsibility cards, đường đi query có nhãn, chọn dữ liệu cần giữ rồi một design task mới. Có nút xem lại đúng đoạn AD67 trước khi làm; mở hỗ trợ được ghi lại. Không bắt người học đọc toàn file này trước mọi lượt luyện. Không tuyên bố mô hình sơ đồ là trace của MySQL.

## Nguồn và đối chiếu

Lecture1 USTH trang15,16,18,19,23,28,31,33–36; kết hợp AD67 và các bài đã đối chiếu sách. Ví dụ và câu hỏi được biên soạn mới, lịch sử sai/lẫn mốc được ghi lại ở đầu bài. Các liên kết lịch sử đã mở kiểm ngày05/11/2026; không dùng danh sách sản phẩm cũ làm khuyến nghị mua/cài hiện nay.
