# USTH08 · Từ bốn ERD đến schema giữ đúng sự kiện

Học cùng AD09 và USTH06. Lecture 8 dùng Chen's notation và bốn tình huống Music, University, Flight, Northwind. Bài này giữ các yêu cầu đó, nêu rõ giả định về key rồi cho thử dữ liệu làm lộ một mapping sai.

Hai ca sĩ đều có album số 1. Nếu album_id chỉ được cấp trong danh mục của từng ca sĩ, row `(album_id=1)` chưa nói được đó là album nào. Đây là lý do hình Music vẽ Album là weak entity: cần cả artist_id và album_id để định danh.

## Đọc ký pháp trước khi đặt FK

Trong Chen's notation ở slide 4–7, hình chữ nhật đơn là strong entity, kép là weak entity; oval biểu diễn attribute. Key được gạch dưới; partial key của weak entity dùng gạch dưới nét đứt. Diamond đơn là relationship, diamond kép là identifying relationship; đường kép biểu diễn total participation. Nhãn 1/N/M cho biết giới hạn tối đa ở từng phía, không tự nói mọi entity đều phải có đối tác.

Mỗi cạnh phải nối đúng entity với relationship và giữ role riêng. Gộp hai đường vào một nhánh nhìn giống một dây chung có thể làm người đọc không biết đường kép hay cardinality thuộc vai nào. Không suy semantics từ việc nét vẽ chạm nhau.

Ví dụ Customer–Places–Order là 1:N: một khách đặt nhiều đơn, mỗi đơn thuộc một khách. Nếu Order bắt buộc có khách, mapping dùng customer_id NOT NULL FK ở Order. Điều đó chưa bắt mọi Customer có Order. Với 1:1, chỉ thêm FK chưa đủ: còn cần UNIQUE ở phía giữ FK, cùng NULL/NOT NULL theo participation. M:N cần relation nối; khóa phải phù hợp **sự kiện** được lưu, không luôn chỉ là hai ID.

## Music: key phải mang đủ owner

Theo brief, mỗi Album có đúng một Artist; Artist có ít nhất một Album. Mỗi Track thuộc đúng một Album; Album có ít nhất một Track. Artist, Album, Track có tên; Track có duration tính bằng giây. Played ghi thời điểm bắt đầu phát, chính xác tới giây, để đếm lượt và tìm lần phát gần nhất.

| Relation | PK | FK và ý nghĩa |
|---|---|---|
| Artist(artist_id,artist_name) | artist_id | Artist là strong entity |
| Album(artist_id,album_id,album_name) | (artist_id,album_id) | artist_id → Artist; album_id là partial key |
| Track(artist_id,album_id,track_id,track_name,duration_seconds) | (artist_id,album_id,track_id) | (artist_id,album_id) → Album; track_id chỉ unique trong Album |
| Played(artist_id,album_id,track_id,played_at) | cả bốn cột, theo giả định một lượt/track/giây | ba ID → Track; played_at là partial key của event |

Nếu identifying relationship có attribute riêng, như ngày đưa Album vào danh mục của Artist, nó có thể nằm trong row Album vì mỗi Album có đúng một owner occurrence. Không tạo thêm bảng lặp cùng key chỉ vì nguồn gọi nó là attribute của relationship.

Với Artist A và B đều có Album 1, hai Track `(A,1,1)` và `(B,1,1)` hợp lệ và khác nhau. FK chỉ dùng album_id=1 sẽ không chọn được owner đúng. Thêm surrogate album_pk là lựa chọn khác, nhưng vẫn cần UNIQUE(artist_id,album_id) nếu yêu cầu số album trong Artist không đổi.

Timestamp tới giây chưa tự là key. Hai thiết bị có thể phát cùng track trong cùng giây. Nếu điều này được phép, thêm play_id/event_id rồi giữ played_at như thời gian; không tự gộp hai lượt thành một. Schema Played ở slide 15 chỉ đúng với giả định không có hai event cùng key thời gian. Đây là câu hỏi cần chốt khi xác nhận brief.

Cho Played của track `(A,1,1)` ở 10:00:00 và 10:03:00, track `(A,1,2)` chưa phát: COUNT của track đầu là 2, MAX là 10:03:00; track sau có count 0, last_played NULL. Muốn giữ track chưa phát, dùng Track LEFT JOIN Played và COUNT trên một key event không NULL, không COUNT(*). Gom theo Artist/Album cho báo cáo lượt phát tương ứng. FK phía con không tự giữ điều “mọi Artist có Album” hoặc “mọi Album có Track”; đó là kiểm parent participation riêng.

## University: một lần học khác với một cặp student–course

Program có program_id, tên, số credits cần tốt nghiệp và năm mở. Student có student_id, given_names, surname, birth_date, year_enrolled và bắt buộc thuộc một Program. Given names như “John Paul” có thể được giữ trong một giá trị theo domain của bài, không cần tách chỉ vì có dấu cách.

Hình nguồn cho Course là weak theo Program: course_id được hiểu là mã cục bộ, full key `(program_id,course_id)`. Course giữ tên, credits và năm mở; quan hệ Contains còn có planned_year/planned_semester để xếp môn trong chương trình. Hai thuộc tính kế hoạch này cần được mapping vào Course khi mỗi course occurrence có đúng một owner; danh sách cột ở slide 20 chưa liệt kê chúng.

```text
Program(program_id PK,name,required_credits,commenced_year)
Student(student_id PK,given_names,surname,birth_date,year_enrolled,program_id FK NOT NULL)
Course(program_id PK/FK,course_id PK,name,credits,commenced_year,
       planned_year,planned_semester)
Attempt(student_id PK,program_id PK,course_id PK,attempt_year PK,
        attempt_semester PK,mark,grade)
```

Attempt tham chiếu full Course key và Student. Brief nói student chỉ học môn trong Program của mình: hai FK độc lập tới Student và Course chưa giữ quy tắc đó. Có thể cho Student UNIQUE(student_id,program_id), rồi dùng FK `(student_id,program_id)` từ Attempt và FK `(program_id,course_id)` tới Course. Program cần NOT NULL trong cả các key liên quan. Nếu cho chuyển Program theo thời gian, phải đổi sang enrollment history và kiểm Program của **lần học**, không sửa một cột hiện tại rồi làm sai lịch sử.

Ví dụ Student S1 học Course `(DA,101)` năm 2026 học kỳ 1 và học lại năm 2027 học kỳ 1. Key chỉ `(student_id,program_id,course_id)` ở danh sách cuối slide 20 không giữ được cả hai. Slide 19 đã gạch thêm year/semester; khi ghép lại schema phải giữ cùng grain. Nếu còn được thi lại nhiều lần trong cùng kỳ, thêm attempt_no hoặc event ID theo policy.

Mark/grade có thể NULL khi chưa hoàn thành. Mark 0 khác NULL chưa có điểm. Khoảng mark, tập grade và liên hệ mark–grade phải được yêu cầu xác nhận, không suy một thang điểm từ chữ “A/B” trong ví dụ. Tương tự, tổng credits tốt nghiệp không tự được kiểm chỉ vì Program có required_credits.

Nếu course_id là mã toàn trường và một Course được nhiều Programs dùng, dùng Course độc lập cùng ProgramCourse(program_id,course_id,planned_year,planned_semester). Đây là **brief khác** với Course weak trong hình; không trộn hai key assumptions vào một đáp án.

## Flight: đặt chỗ chưa đồng nghĩa đã cấp một ghế cụ thể

Airplane có registration_number duy nhất, model_number và capacity≥1. Flight trong brief có flight_number duy nhất, from/to airport, departure/arrival datetime và đúng một Airplane. Passenger có email duy nhất cùng given_names/surname. Một Passenger đặt được nhiều Flights và mỗi Flight có nhiều Passengers.

| Relation | Key/constraint |
|---|---|
| Airplane(registration_number,model_number,capacity) | PK registration_number; capacity≥1 theo brief |
| Flight(flight_number,from_airport,to_airport,departs_at,arrives_at,airplane_registration) | PK flight_number; NOT NULL FK Airplane; thời gian/airport cần validation đã chốt |
| Passenger(email,given_names,surname) | PK email theo brief; surrogate ID là biến thể cần giữ business unique |
| Booking(flight_number,passenger_email) | PK cặp; hai FK; một người tối đa một booking trên Flight trong mô hình này |

Bài nguồn gọi book a seat nhưng Booking không có seat_number. Nó biểu diễn việc có booking, chưa ngăn hai người được cấp cùng ghế cụ thể. Muốn cấp ghế, thêm seat_number với UNIQUE(flight_number,seat_number) cùng quan hệ ghế hợp lệ của Airplane; PK cặp vẫn giữ một booking/người/chuyến theo policy. Constraint liên row về capacity cần giao dịch cấp chỗ như AD59; đếm trước rồi insert không khóa có thể overbook.

Nếu flight_number thực tế lặp hằng ngày, nó không còn unique cho một chuyến diễn ra. Dùng flight_instance_id hoặc key gồm ngày theo brief mới, rồi đổi mọi FK Booking. Trong bài nguồn, giả định flight_number unique được giữ để giải đúng mô hình giản lược; phần mở rộng không được lén thay key của đáp án cũ.

## Northwind: giá bán thuộc dòng đơn, số PO thuộc supplier

Hình slide 11 phân biệt Customers đặt Orders và Suppliers cung ứng PurchaseOrders. Product có ID, tên, list_price, category; Customer/Supplier có tên, email, phone, address. OrderCode unique toàn tập Order. PO có ordinal_number chỉ unique trong từng Supplier, creation_date và payment_method. Order–Product và PO–Product là M:N với quantity; unit_price thuộc dòng bán, unit_cost thuộc dòng mua.

Một mapping theo hình là PO(supplier_id,ordinal_number,created_at,payment_method), PK cặp; POLine(supplier_id,ordinal_number,product_id,quantity,unit_cost) có PK ba cột và full FK tới PO. Có thể thêm po_id toàn cục rồi giữ UNIQUE(supplier_id,ordinal_number). Chỉ ordinal_number không đủ nếu hai suppliers cùng có PO số 1. Nhận định này không phụ thuộc việc email hay một mã nội bộ được chọn để định danh Supplier; trong code thực hành nên chốt mapping một lần.

OrderLine(order_id,product_id,quantity,unit_price) có PK cặp nếu mỗi product chỉ xuất hiện một lần trong một order. Nếu cùng product có hai mức discount hoặc hai đợt giao cần hai dòng riêng, dùng line_no/key khác. Không gắn unit_price chỉ vào Product vì giá niêm yết hiện tại có thể đổi sau khi bán. Mô hình đầy đủ và báo cáo được tiếp tục ở USTH09/USTH11.

## Luyện tập

1. Đọc một hình Chen: strong/weak entity, key/partial key, relationship/identifying relationship, đường đơn/kép và nhãn 1:N/M:N. Viết mapping Customer–Order và quan hệ 1:1 có cả UNIQUE/NULL policy. Vì sao không gộp đường nối tùy ý?
2. Viết bốn relations Music và full keys/FKs. Thêm hai Artist đều có Album 1/Track 1; kiểm chúng không bị gộp. Attribute ngày tham gia identifying relationship nằm ở đâu?
3. Với hai lần phát trong bài, dự đoán count/last_played ở grain track, album và artist, giữ track chưa phát. Nếu hai thiết bị phát cùng track trong một giây, key nào phải đổi?
4. Chuyển hình University thành schema gồm mọi thuộc tính, planned year/semester, attempted year/semester. Nêu vì sao Student FK và Course FK độc lập chưa giữ cùng Program.
5. Giữ hai lần học lại S1/DA101 khác năm. Cho phép thi lại cùng kỳ thì đổi key thế nào? Phân biệt NULL mark với 0 và đề xuất cách giữ lịch sử khi student đổi Program.
6. Chuyển Flight thành bốn bảng với key/FK/cardinality. Booking hiện tại có cấp số ghế không? Bổ sung ràng buộc ghế/capacity và chỉ ra một race của cách đếm trước rồi insert.
7. Thiết kế hai Suppliers cùng PO ordinal 1, có product ở nhiều dòng mua/bán. Viết full PO/POLine key và biến thể surrogate; giải thích unit_cost/unit_price/list_price khác nhau ở grain nào.
8. Chọn một thay đổi brief: Course dùng chung nhiều Programs, FlightNumber lặp theo ngày, hoặc cùng Product được hai lines trong Order. Đổi schema và mọi FK liên quan; nêu query/report cũ cần đổi và dữ liệu phản ví dụ để tự kiểm.

## Gợi ý

Đi từ occurrence cụ thể: “album 1 của ai?”, “lần học nào?”, “chuyến bay diễn ra ngày nào?”. Viết hai rows có cùng mã cục bộ trước khi chọn PK. Sau khi mapping, kiểm cả existence theo phía con và yêu cầu parent có ít nhất một con.

## Đáp án và lập luận

1. Rectangle đơn/kép, underline thường/nét đứt, diamond đơn/kép và đường kép có nghĩa như phần ký pháp. Customer PK riêng; Order.customer_id NOT NULL FK nếu mỗi đơn cần khách. Với 1:1, FK còn cần UNIQUE, nullable tùy min. Gộp đường làm mất role hoặc participation của từng cạnh.
2. Artist key đơn; Album key(artist,album); Track key(artist,album,track); Played thêm timestamp theo giả định ban đầu. Owner keys tham gia full PK/FK. (A,1,1) khác (B,1,1). Ngày tham gia owner có thể nằm ở weak row khi một occurrence có đúng một owner relationship ấy.
3. Track A/1/1 có 2 lượt, last 10:03; A/1/2 có 0, NULL. Album A/1 và Artist A có 2 lượt trong fixture đó. Dùng LEFT JOIN và COUNT key event. Hai lượt cùng giây cần event_id hoặc identity mạnh hơn; timestamp riêng không phân biệt được chúng.
4. Schema trong bài giữ đủ fields và composite Course key. Hai FK rời chỉ nói Student và Course đều tồn tại, vẫn có thể S1 thuộc DA học Course của SE. Composite Student/Program FK cùng full Course FK kiểm được sự trùng Program trong mô hình không chuyển ngành.
5. PK phải chứa attempt_year và attempt_semester hoặc attempt ID bảo toàn uniqueness tương ứng; cùng kỳ nhiều lần cần attempt_no. Điểm NULL là chưa biết, 0 là giá trị thật. Đổi Program cần Enrollment occurrence/history và Attempt trỏ enrollment, không sửa lịch sử bằng Program hiện tại.
6. Mapping bảng Flight giữ đúng một Airplane qua NOT NULL FK; Booking PK cặp/FKs. Thêm seat_number và unique theo Flight để cấp ghế; capacity còn là invariant khác. Hai phiên cùng thấy 9/10 ghế rồi đều insert có thể thành 11/10 nếu không serialize/cấp chỗ nguyên tử.
7. PO key(supplier_id,ordinal_number), POLine thêm product_id theo giả định một product/PO. Surrogate po_id vẫn giữ business UNIQUE. Mua ghi unit_cost ở dòng mua, bán ghi unit_price ở dòng bán, list_price là giá danh mục hiện tại. Không dùng một số giá thay cả ba lịch sử.
8. Course dùng chung cần ProgramCourse và planned slots ở cặp; Flight lặp cần flight_instance key rồi Booking đổi FK; lặp Product trong Order cần line_no/line_id và query GROUP BY phù hợp. Đáp án đạt khi rows trước/sau giữ cùng facts và counterexample mới không bị gộp; chỉ thêm ID rồi bỏ uniqueness nghiệp vụ chưa đủ.

## Biến thể và cách kiểm

Luân phiên đọc hình, điền full key, tạo rows phản ví dụ và tự mapping brief mới. Checker thử trùng mã khác owner, thiếu full FK, hai attempts khác kỳ, hai plays cùng giây và parent chưa có con. DDL tạo được bảng không tự chứng minh toàn bộ participation hay concurrency đã đúng.

## Học trên web

Cho xem Chen canvas cùng bảng rows tương ứng. Người học chuyển sang schema editor, chạy trong sandbox riêng rồi kiểm metadata/tuples. Tác vụ thiết kế chấm theo rubric và counterexample; mô hình seat race ghi rõ là computed-model nếu chưa nối hai-session engine. Không yêu cầu cài công cụ vẽ hoặc database trên máy học viên.

## Nguồn và đối chiếu

Lecture 8 USTH, 21 trang, đã đọc text và toàn bộ hình; Music trang 8/14–15, University trang 9/16/18–20 và Flight trang 10/21 được so full keys/attributes. Đã giữ planned slots bị bỏ khỏi danh sách cuối, year/semester của attempts, giới hạn timestamp và unique FK khi mapping 1:1. USTH06/AD09 giải thích nền; các mở rộng được nêu là thay đổi brief, không nhận là thuộc nguyên văn slide.
