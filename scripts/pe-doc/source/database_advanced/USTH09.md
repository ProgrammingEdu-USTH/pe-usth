# USTH09 · Từ yêu cầu của người dùng đến database được kiểm bằng use case

Học cùng AD09, AD11–AD12, AD58 và AD60. Lecture 9 đặt database trong quá trình xây dựng hệ thống thông tin. Phần báo cáo Northwind ở trang 28–36 được thực hành đầy đủ trong USTH11; ở đây ta tập trung vào cách tìm, thiết kế và kiểm yêu cầu.

Phòng đào tạo muốn “xem được điểm sinh viên”. Nếu bắt đầu ngay bằng Student và Grade, nhóm dev có thể bỏ sót lần học lại, người được sửa điểm và lịch sử sửa. Trước khi tạo bảng, cần hỏi điểm của lần học nào, ai được xem/sửa và báo cáo phải hiện cả người chưa có điểm hay không.

## SDLC tạo ra kết quả gì ở mỗi bước?

Systems analysis and design là quá trình tạo và duy trì hệ thống thông tin. SDLC trong slide gồm system definition, requirements analysis, component design, implementation, maintenance. Hình mũi tên có đường quay lại từ nhu cầu thay đổi; không có nghĩa phát hiện yêu cầu sai ở cuối thì phải giữ nguyên thiết kế đầu.

| Bước | Đầu vào → đầu ra | Ví dụ việc làm cho hệ thống học vụ AMS |
|---|---|---|
| System definition | Nhu cầu hỗ trợ nghiệp vụ → project plan | Chốt goals/scope, khả thi về chi phí/lịch/kỹ thuật/tổ chức, đội dự án, dependencies và lịch thực hiện |
| Requirements analysis | Project plan → user requirements được duyệt | Phỏng vấn, đọc hệ thống cũ/forms/reports/queries, xác định chức năng và security, thống nhất acceptance |
| Component design | Requirements → system design | Thiết kế hardware, software, database, quy trình nghiệp vụ và vai trò người vận hành |
| Implementation | Design → hệ thống được cài và hoạt động | Xây từng phần, component tests, tích hợp/tests, chuyển dữ liệu và chuyển người dùng sang hệ mới |
| Maintenance | Hệ thống đang chạy → bản cập nhật hoặc vòng phát triển mới | Patch/release, ghi và ưu tiên yêu cầu thay đổi, đánh giá lại khi scope tăng |

Ví dụ “mỗi giảng viên chỉ nhập điểm lớp được phân công” là requirement. Bảng Teaching cùng authorization check là một phần design. Thử tài khoản giáo viên khác lớp và bị chặn là implementation test. Đổi policy cho trợ giảng rồi sửa quyền là maintenance. Không dùng tên một bảng làm bằng chứng requirement đã được đáp ứng.

## Hệ thống thông tin có năm thành phần

Database là phần data trong hệ thống gồm hardware, software, data, procedures, people. Ở bước design, chọn cấu hình phần cứng; quyết định phần mềm có sẵn hay code cần viết; thiết kế dữ liệu/ứng dụng; thiết kế quy trình dùng và vận hành; mô tả công việc. Ở implementation, mua/cấp và kiểm hardware; cấp quyền/cài/test software; tạo database, nạp và kiểm dữ liệu; viết tài liệu/đào tạo/thử quy trình; đào tạo hoặc tuyển người phù hợp. Sau đó kiểm tích hợp và startup.

Ví dụ query điểm đúng nhưng cán bộ nhập nhầm kỳ vì form không ghi rõ academic year vẫn làm hệ thống sai. DDL không thay được quy trình nhập, vai trò duyệt và hướng dẫn người dùng. Đây là lý do acceptance cần một use case đi xuyên form, quyền và database.

## Tìm requirement từ nhiều nguồn

Nguồn gồm phỏng vấn, forms, reports, queries, application programs, website, use cases và business rules. Một screenshot báo cáo giúp phát hiện cột cần có nhưng chưa nói hết semantics của số liệu. Một câu trong phỏng vấn cũng cần được xác nhận lại thay vì tự coi là schema cuối.

Với AMS, người dùng muốn thông tin sinh viên/giảng viên/môn tập trung, trao đổi thuận tiện, theo dõi tiến độ/điểm/điểm danh, phân bổ phòng và giảng viên, giảm nhập lặp, bảo vệ dữ liệu. Phạm vi chức năng gồm user/roles, hồ sơ, đăng ký, lịch môn/lớp, attendance/grading và báo cáo. Các từ “nhanh”, “real-time”, “an toàn”, “mở rộng” cần tiêu chí có thể thử, không giữ như lời quảng bá.

Một ghi chú phỏng vấn nên có ngày, vai trò người cung cấp, tình huống hiện tại, điều họ cần, bằng chứng/form mẫu, câu hỏi còn mở và người xác nhận. Ví dụ do PE biên soạn: “Academic assistant cần lọc lớp theo academic year; Teacher chỉ nhập attendance cho session của lớp mình; Student xem điểm từng attempt của chính mình.” Đổi ba câu ấy thành use cases và negative tests cụ thể.

Slide 17–18 có biên bản minh họa, không phải cuộc phỏng vấn do nhóm PE thực hiện. Phần này nhắc yêu cầu mã hóa, role-based access, audit khi sửa hồ sơ/đăng ký/điểm, đào tạo/chuyển đổi, mobile access và scalability. FERPA/GDPR là các tên được nêu trong ví dụ nguồn; bài không mặc định mọi dự án AMS đều có cùng phạm vi áp dụng pháp lý. Đặc tả dự án phải ghi chính sách/điều kiện thực sự được xác nhận, rồi truy vết tới thiết kế và bài kiểm tương ứng.

## AMS: từ use case tới dữ liệu và quyền

Các đối tượng cần khảo sát gồm AcademicYear, Department, Building/Room, Student, Teacher, Subject, Class, Session, Enrollment, Attendance, Assessment/Result. Subject là môn danh mục; Class là một lần mở Subject trong năm học; Session là buổi của Class. Nếu gộp cả ba vào một row, không giữ được môn mở hai lớp hoặc một lớp có nhiều buổi điểm danh.

InternalTeacher thuộc Department theo brief, Adjunct có thông tin riêng. Có thể dùng Teacher root và subtype, nhưng phải hỏi có overlap hay thay loại theo thời gian không. Student thuộc Department theo mô tả này; đừng tự coi Department là Program chỉ vì cả hai xuất hiện ở case khác.

| Actor trong use case | Việc cần hỗ trợ | Dữ liệu và ca kiểm minh họa |
|---|---|---|
| System administrator | Users, academic years, departments, classrooms | Quyền tạo/sửa danh mục; người không có role bị từ chối |
| Academic assistant | Subjects, classes, sessions, enrollment, reports | Một Subject có hai Class; một Class nhiều Session; người chưa enroll không bị điểm danh như đã học |
| Teacher | Xem danh sách lớp, attendance, nhập assessment | Teaching theo lớp; Teacher khác lớp không sửa; Result có attempt/assessment identity |
| Student | Profile, timetable, academic result | Chỉ đọc/sửa trường hồ sơ được phép; không đọc điểm người khác hoặc tự sửa điểm |

Login/logout, profile, timetable và academic result là các use cases chia sẻ theo quyền từng actor, không có nghĩa mọi actor đều được mọi thao tác dữ liệu nền. Hình source trang 20 gắn “Extends” với một số thao tác quanh quản lý lớp. Trong đặc tả hành vi, extend mô tả phần mở rộng có điều kiện của use case; nó không là FK hoặc quy tắc tự kế thừa quyền. Ghi điều kiện, actor và output của từng thao tác bằng lời trước khi triển khai.

Ví dụ schema nhỏ giữ đúng grain: Class(class_id,subject_id,academic_year_id), Session(session_id,class_id,starts_at,room_id), Enrollment(student_id,class_id), Attendance(student_id,session_id,status), Teaching(teacher_id,class_id). PK/FK bảo vệ identity và tồn tại. Để Attendance chỉ chứa người enroll đúng Class của Session, cần constraint/giao thức kiểm thêm hoặc thiết kế composite keys phù hợp; hai FK tới Student và Session riêng không tự giữ điều này.

## Northwind: phỏng vấn phải làm rõ giá và chứng từ

Northwind trong slide là công ty giả lập nhập/xuất hàng; chi tiết văn phòng là context của case, không phải thông tin cần tra cứu về một doanh nghiệp đang hoạt động. Người dùng quản lý Suppliers, Customers, Products, PurchaseOrders, Orders, Shippers, Invoices, Employees. Employee phụ trách đơn bán, chọn shipper và theo dõi xử lý; PO có người tạo/duyệt theo bài lab.

Product có ID/name/list price/category. Customer và Supplier có contact/email unique theo brief. OrderCode unique; mỗi order có order date và các lines(product,quantity,unit price). PO có ordinal chỉ unique trong Supplier, creation date, payment method và lines(product,quantity,unit cost). OrderLine/POLine giữ giá tại giao dịch; đổi Product.list_price không được tự sửa lịch sử đơn đã phát hành.

Một schema tham khảo dùng các mã nội bộ ổn định cho Customer/Supplier/Employee/Shipper; giữ business UNIQUE email/order_code/(supplier_id,ordinal). Orders có FKs tới Customer, Employee và Shipper theo optionality đã chốt. PO có supplier_id, created_by, approved_by; hai vai creator/approver cùng trỏ Employee nhưng không đổi chỗ. OrderLine và POLine có full parent keys cùng product_id/line_no theo policy về lặp sản phẩm. Invoice trỏ Order và lưu issued_at; phải hỏi có một hay nhiều invoices/credit notes thay vì tự đoán.

Nghiệp vụ cần CRUD danh mục/chứng từ, in chứng từ sau ghi thành công, báo cáo cho quản lý và chặn xóa Product/Employee/Customer/Supplier/Shipper đã tham gia chứng từ. Có thể dùng FK RESTRICT cùng đường ghi được kiểm soát để giữ lịch sử, hoặc trạng thái inactive cho danh mục ngừng dùng. Không dùng CASCADE cho mọi FK để làm nút Xóa luôn xanh. In chứng từ phải đọc giao dịch đã commit; lỗi in không đồng nghĩa đơn chưa được tạo để client tự tạo lại không có idempotency key.

## Ba bước ra ERD rồi mapping

Đầu tiên, chọn danh từ cần quản lý thành entity sets và thuộc tính đơn giản. “Giá” có thể là attribute, “Order Detail” là sự kiện nối Order với Product; không phải mọi danh từ đều cần một bảng. Tiếp theo, đọc động từ để đề xuất relationships và hỏi cả min/max. Cuối cùng, xem lại weak/strong, key nghiệp vụ, surrogate ID và các báo cáo phải làm được. Thêm ID không xóa UNIQUE/participation cần giữ.

Ví dụ PO số 1 của Supplier S1 và số 1 của S2 là hai chứng từ. Full business key là (supplier_id,ordinal); po_id toàn cục giúp FK gọn nhưng phải giữ UNIQUE cặp. Kiểm reports qua PO/OrderLine làm lộ ngay việc đặt unit_cost/unit_price vào sai bảng. ERD đề xuất ở slide 41 chưa đủ attributes; sơ đồ giản lược ở trang 42 cũng chưa diễn đạt đủ Employees/Shippers/Invoices và mọi nghiệp vụ. Chúng là bước thiết kế, không phải bằng chứng đã có schema cuối hoàn chỉnh.

Mapping tiếp: entity sets thành tables; M:N thành table nối có attributes của relationship; 1:N đặt full FK ở phía N; 1:1 thêm uniqueness đúng phía. Schema cuối liệt kê columns/types/PK/FK/UNIQUE/NULL/CHECK, quy tắc chưa biểu diễn declaratively và lý do. Physical design chọn indexes, tổ chức lưu, partition khi có workload; không đổi logical facts chỉ để một screenshot query nhanh.

## Dùng mọi use case để kiểm thiết kế

Với AMS, cho Teacher thử điểm danh, sửa điểm, Student xem lịch/kết quả, Assistant mở Class/Session và chạy reports trên prototype. Với Northwind, thử Order không line, Product chưa bán, hai Orders của cùng Customer và PO chưa duyệt. Hiện form/report mẫu để người dùng xác nhận semantics; hỏi một output sai cụ thể thay vì chỉ hỏi “ERD đẹp chưa?”.

Mỗi requirement cần đường truy vết: requirement → entity/constraint → transaction/query → result/negative test. Ví dụ “giữ người chưa có đơn” dẫn tới LEFT JOIN và COUNT(order.id), rồi test một Customer không Order. Query đúng trên một sample không thay bước xác nhận định nghĩa nghiệp vụ. Những phản hồi mới có thể quay lại sửa requirement hoặc thiết kế.

SQL cho DBMS thật gồm DDL database/tables/constraints/indexes và objects cần thiết; DML CRUD/queries cho các use cases. Lưu SQL thành file có version để review/tái lập. Trên web, editor và backend thực hiện các bước này trong sandbox; lệnh cài hoặc thao tác vận hành trong nguồn không là bài bắt buộc trên máy người học. Chuyển đổi phải có nạp dữ liệu, kiểm đếm/keys/values, kế hoạch rollback phù hợp và hướng dẫn người dùng, không chỉ có CREATE TABLE thành công.

## Luyện tập

1. Với yêu cầu “Teacher chỉ sửa điểm lớp mình”, chỉ ra artifact của từng bước SDLC, input/output và một thay đổi ở maintenance. Lập project scope/feasibility/tasks/dependencies nhỏ, không đưa con số tiến độ chưa đo.
2. Cho năm thành phần hardware/software/data/procedures/people: ghi một quyết định design và một việc implementation cho mỗi phần; đề xuất một integrated test xuyên chúng.
3. Soạn một ghi chú phỏng vấn AMS, dùng thêm ít nhất hai nguồn form/report/business rule. Chuyển “real-time”, “an toàn” hoặc “dễ dùng trên mobile” thành requirement có cách kiểm; ghi điều chưa được xác nhận.
4. Phân biệt Subject/Class/Session, enrollment/attendance/assessment. Vẽ actor/use case cho bốn roles ở bảng và thêm một negative authorization test. Hai FK Student/Session đã giữ enrollment chưa?
5. Vẽ schema Northwind có Suppliers/Customers/Products/Orders/POs/Shippers/Invoices/Employees; ghi giá nào ở đâu, email/ordercode/PO ordinal unique trong phạm vi nào và creator/approver theo hai roles.
6. Dựng hai PO ordinal 1 của hai Suppliers, hai dòng giá lịch sử khác list price. Phân biệt weak business key với surrogate ID và nêu một ca mà chỉ thêm ID vẫn làm mất quy tắc.
7. Đề xuất đường ghi/xóa/in chứng từ và ca kiểm rollback/retry. Vì sao CASCADE mọi bảng không đáp ứng yêu cầu giữ chứng từ? Lỗi in sau commit có nên tự INSERT lại order không?
8. Thực hiện ba bước chọn nouns/attributes, verbs/cardinality, refine/weak IDs trên một đoạn brief mới. Tách logical/physical design và một index cần đo, không hứa luôn nhanh.
9. Lập bảng truy vết ít nhất ba use cases tới schema/query/test. Dùng prototype form/report để tìm một requirement còn mơ hồ; ghi cách phản hồi quay lại SDLC thay vì chấm ERD bằng hình thức.
10. Chuẩn bị cấu trúc SQL/files và kế hoạch implementation→maintenance cho web: setup riêng, dữ liệu giả lập, component/integration checks, conversion, training, version và change requests. Phân biệt phần đã chạy với đặc tả cần dev triển khai.

## Gợi ý

Chọn một thao tác có actor và output cụ thể rồi lần ngược tới dữ liệu. Với mỗi quyết định, hỏi ai xác nhận, trạng thái lỗi nào cần chặn và artifact nào chứng minh đã làm. Đừng tự suy key/cardinality chỉ từ tên bảng.

## Đáp án và lập luận

1. Definition chốt phạm vi/quyền và plan khả thi; analysis ghi role/assignment requirement được duyệt; design có Teaching cùng check quyền; implementation chạy ca đúng/sai trên form/API/database; maintenance xử lý policy trợ giảng mới. Artifacts có owner/dependency, không chỉ nhãn năm giai đoạn.
2. Hardware: cấu hình→cấp và test; software: chọn/build→cài và test; data: schema→tạo/nạp/kiểm; procedures: quy trình→tài liệu/đào tạo/thử; people: mô tả việc→đào tạo/tuyển. Integrated test cho một Teacher đúng role nhập điểm qua form rồi Student đọc đúng attempt và audit giữ actor/thay đổi.
3. Ghi chú cần ngày/role/context/requirements/evidence/open questions/confirmation. Ví dụ yêu cầu mobile có viewport/task và tiêu chí thao tác; latency có workload/ngưỡng do stakeholder chốt. Không tự đặt ngưỡng PE thành quy định USTH. Ghi requirement bảo vệ dữ liệu và chính sách áp dụng đã xác nhận, không suy phạm vi luật từ hai tên trong slide.
4. Subject là môn, Class là lần mở, Session là buổi. Mapping và actor table trong bài là một đáp án. Teacher khác lớp, Student khác người phải bị từ chối. FK Student/Session chỉ kiểm hai đối tượng tồn tại; enrollment cùng Class cần constraint/giao thức riêng.
5. Schema mô tả trong phần Northwind giữ đầy đủ tám nhóm đối tượng, lines bán/mua, hai employee roles và invoice link. Unit price/cost nằm ở lines, list price ở Product. Email theo từng entity set, OrderCode toàn Orders, PO ordinal trong Supplier. Multiplicity invoice/shipper phải ghi assumption.
6. (S1,1) khác (S2,1); po_id không thay UNIQUE(supplier,ordinal). Nếu bỏ unique, hai rows po_id khác nhau có thể cùng supplier và ordinal dù brief cấm. Giữ line price theo chứng từ tránh thay giá cũ khi sửa danh mục.
7. Commit chứng từ nguyên tử, in từ bản đã lưu, retry dùng cùng operation key hoặc tìm kết quả cũ. FK RESTRICT/inactive giữ lịch sử; CASCADE có thể xóa lines/chứng từ đã dùng. Lỗi in sau commit không là lý do tạo thêm Order; phải retry bước in/đọc cùng Order.
8. Danh từ là ứng viên, động từ gợi relationships, refine kiểm facts/keys/reports. Logical design giữ semantics; physical design tổ chức thực thi. Chọn index theo predicate/distribution và so plan/cost có điều kiện, không sửa nghĩa báo cáo để đo nhanh.
9. Ví dụ Customer không Order→LEFT JOIN→ca zero; PO chưa duyệt→nullable approver/LEFT JOIN→ca NULL; lịch sử giá→line unit_price→ca list price đổi. Prototype làm rõ grain, date boundary, ties và quyền. Phản hồi có thể sửa requirements/design rồi test lại.
10. Bàn giao có versioned DDL/fixture/queries/checkers, setup/reset cô lập và hướng dẫn web, conversion/rollback, tests và phân công vận hành. Maintenance ghi/prioritize change requests. File đặc tả không được gắn nhãn native execution; log thật cần engine/version/input/hash và phạm vi kiểm.

## Biến thể và cách kiểm

Luân phiên đọc brief, phỏng vấn giả lập, phân loại artifact, sửa một sơ đồ thiếu fact và bảo vệ thiết kế bằng use case mới. Rubric chấm semantics và bằng chứng: actor, requirement, key, transaction, output và lỗi. Thêm một báo cáo mới để kiểm chuyển giao; không chỉ đổi tên entity trong một sơ đồ đã thuộc.

## Học trên web

Workspace cho mở brief, ghi assumptions, vẽ model, dựng schema/query và nộp bảng truy vết. Form/report prototype nhận dữ liệu của đúng fixture/attempt. Các role tests chạy bằng quyền phía server; ẩn nút trên trình duyệt chưa là authorization. Những bài thiết kế mở dùng rubric/reviewer; không giả chấm mọi schema đúng chỉ bằng một query output.

## Nguồn và đối chiếu

Lecture 9 USTH, 48 trang: SDLC, năm thành phần, AMS interview/use cases, Northwind context/requirements, các report, ERD/mapping và SQL implementation. Đã đọc toàn bộ text/hình. USTH11 giữ nhóm báo cáo trang 28–36 thành các bài riêng có SQL/đáp án; các sơ đồ gợi ý chưa đầy đủ được nêu đúng vai trò. Biên bản/fixture mới do PE biên soạn, không nhận là phỏng vấn thực hay dữ liệu vận hành của USTH.
