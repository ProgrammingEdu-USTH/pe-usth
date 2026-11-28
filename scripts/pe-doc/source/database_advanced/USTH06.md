# USTH06 · Đọc ERD và chuyển thiết kế thành bảng

Học cùng AD09; ôn key và FD ở AD03/USTH05 khi cần. Phần này nối toàn bộ Lecture 6 USTH với một ví dụ mới về phòng thiết bị. Đây là mô hình khái niệm trước khi chọn kiểu dữ liệu hay index của engine.

Lan có thể dùng kính hiển vi M1 ở phòng A nhưng chỉ được dùng máy ảnh C1 ở phòng B. Nếu database chỉ ghi “Lan được dùng M1”, “Lan tới phòng A” và “phòng A có M1”, ta chưa ghi chính xác bộ ba nào được phép. Một sơ đồ có đủ tên đối tượng vẫn có thể bỏ mất sự phụ thuộc cần giữ.

## Từ yêu cầu tới entity, attribute và relationship

Quy trình trong slide bắt đầu từ ý tưởng/yêu cầu, sang thiết kế mức cao, relational schema rồi implementation trên DBMS. ERD và UML là những lựa chọn ký pháp; bài này dùng ERD. Sketch giúp trao đổi điều người đặt hàng còn chưa nói rõ, không thay yêu cầu đã được xác nhận.

Entity là một đối tượng, như thiết bị M1; entity set là tập đối tượng cùng loại, như Device. Attribute là thuộc tính, chẳng hạn Device(device_id,label). Một entity set gần với lớp đối tượng ở khía cạnh mô tả chung nhưng không tự có mọi semantics của lớp trong một ngôn ngữ lập trình. Trong phần mô hình đơn giản này, attribute là giá trị của domain đã chọn; kiểu composite/multivalued có ký pháp và cách mapping riêng.

Trong ký pháp của Lecture 6, rectangle là entity set, oval là attribute, diamond là relationship. Ví dụ Member(member_id,name), Device(device_id,label), Room(room_id,location) nối qua các quan hệ Uses,Visits,StoredAt. Quan hệ cùng nối một cặp entity sets vẫn có thể khác nghĩa: LikesDevice khác FavoriteDevice; không gộp chúng chỉ vì hai đầu giống nhau.

Một relationship set là tập các lần kết hợp đối tượng ở các vai. Ví dụ Permission(member,room,device) gồm (Lan,A,M1),(Lan,B,C1),(Minh,A,C1). Đây là các tuple tham chiếu entity, không phải ba attribute tùy ý dán vào Member.

## Khi cần quan hệ ba ngôi

Chiếu Permission thành MemberRoom,MemberDevice,RoomDevice có thể làm mất điều kiện cùng một bộ ba. Với dữ liệu {(Lan,A,M1),(Lan,B,C1),(Minh,A,C1)}, cả ba cặp của (Lan,A,C1) đều xuất hiện ở các projection, nhưng bộ ba ấy không được cấp quyền. Join ba bảng cặp sẽ tạo một permission giả.

Vì vậy ba quan hệ nhị phân không nói đủ “người này được dùng thiết bị này tại phòng này”. Dùng Permission(member_id,room_id,device_id), key ba cột nếu không có ràng buộc mạnh hơn. Nếu mỗi cặp member–room chỉ được một device, đó là FD bổ sung (member_id,room_id) → device_id và làm key thay đổi. Không suy FD ấy chỉ từ một mẫu nhỏ.

## Đọc cả số tối đa và sự bắt buộc

Many–many: một Member có thể dùng nhiều Device và một Device có thể được nhiều Member dùng. Many–one từ Device tới Room: mỗi Device ở tối đa một Room trong mô hình hiện tại; một Room có thể có nhiều Device. One–one giữa Maker và FeaturedDevice: mỗi Maker có tối đa một featured device và một Device được featured cho tối đa một Maker.

Mũi tên thường vào phía “one” diễn đạt at most one. Mũi tên bo tròn của ký pháp trong slide thêm exactly one cho phía được xác định. “Tối đa một” cho phép không có; “đúng một” còn yêu cầu có. Ví dụ nếu mỗi Maker bắt buộc có featured device nhưng Device có thể không được chọn, min–max là Maker(1,1), Device(0,1). Không đổi thành cả hai phía đều bắt buộc.

Trong relationship ba ngôi, mũi tên vào Device có nghĩa **mọi vai còn lại cùng nhau** xác định tối đa một Device. Nó không đồng nghĩa Member riêng hay Room riêng xác định Device. Phải nêu convention khi đọc hình, vì các ký pháp ER khác có thể đặt nhãn khác.

## Attribute thuộc về cặp, không thuộc riêng một đầu

Quote(room,device,price) có giá phụ thuộc cặp room–device: Room A cho thuê M1 giá30, Room B cho thuê cùng M1 giá40. Gắn price chỉ vào Device sẽ không diễn đạt được cả hai. Nếu đây là một giá hiện tại, key(room,device) xác định price; nếu giữ lịch sử giá, còn cần version/thời gian và quy tắc không chồng khoảng.

Slide 26–27 nêu cách đổi attribute thành một entity set giá trị Prices. Có thể biểu diễn Quote(room,device,price_id), với (room,device) → price_id; PriceValue(price_id,amount,currency) mô tả giá trị. Entity này phải có identity/equality rõ:30 VND khác30 USD, không chỉ vì cùng số30 mà gộp. Mapping này tương đương ví dụ một giá cho mỗi cặp khi bảo toàn các ràng buộc; không tùy tiện đổi thành nhiều giá cho một cặp hoặc bắt mọi price đều đã được dùng.

## Vai khi một entity set xuất hiện nhiều lần

Mentors nối Member với chính Member ở hai vai mentor và learner. Hai cột mentor_id,learner_id cùng tham chiếu Member nhưng không đổi chỗ được về nghĩa. Với Friendship hai vai friend1,friend2, nếu quan hệ phải đối xứng thì (A,B) đòi (B,A), hoặc hệ dùng một cặp không thứ tự được chuẩn hóa. Không tự có symmetry chỉ vì hai đầu cùng entity set.

Một thiết kế lưu cặp không thứ tự có thể chọn person_low < person_high, key(person_low,person_high), cấm self-pair. Đó là policy cho Friendship, không dùng lại cho Mentors có hướng. Tương tự, một relationship one–one ở từng vai chưa tự bảo đảm “một người chỉ có một partner dù xuất hiện ở vai nào”; constraint xuyên vai cần được ghi riêng nếu brief yêu cầu.

## Subclass dùng cùng identity

Camera là subclass của Device, có thêm resolution. Camera kế thừa attribute/relationships của Device và giữ cùng device_id. Một camera không phải một Device khác cộng một object Camera không liên hệ. Subclass là tập con; dữ liệu hiện tại có thể tình cờ mọi Device đều là Camera, không bắt tập con luôn nhỏ hơn nghiêm ngặt.

Slide dùng cây isa, không multiple inheritance; triangle hướng superclass. Đó là phạm vi bài, không phải mọi mô hình ER đều cấm DAG hay overlap. Phải xác định disjoint/overlapping và total/partial specialization khi brief cần. Identity key được kế thừa từ root; subclass vẫn có thể có alternate unique attribute theo nghiệp vụ, nhưng không thay identity chung bằng khóa mới tùy ý.

Key có thể composite. Course(dept,number,hours,room) chỉ có key(dept,number) khi policy xác nhận cặp ấy unique. Không suy(hours,room) là key chỉ vì vài lớp mẫu chưa trùng; nếu nó là alternate key thì giữ constraint, dù diagram chọn underline một key chính để trình bày. Tên thiết bị không tự đủ làm key khi hai thiết bị có thể cùng tên.

## Weak entity cần owner để định danh

Port(port_number,label) trong một Device chỉ được phân biệt bằng (device_id,port_number). Port1 của M1 khác Port1 của C1. Device là supporting owner; partial key là port_number, full key gồm owner key. Double rectangle và double diamond đánh dấu weak entity/supporting relationship trong ký pháp nguồn. Mỗi Port cần đúng một owner cho cách định danh này, không được “Port có thể chưa thuộc device nào” mà vẫn dùng cùng full key.

Weak entity có thể liên hệ nhiều entity sets nhưng không phải mọi mối liên hệ đều là supporting. Port có Technician phụ trách không làm technician_id thành một phần key nếu số cổng chỉ được cấp trong Device. Có thể cần nhiều owners khi brief định danh theo nhiều miền; khi ấy full key gồm đủ owner keys và partial key.

Đừng làm mọi entity yếu chỉ vì nó có FK. Một Inspection có inspection_id toàn cục vẫn có thể bắt buộc thuộc Device mà không cần Device để định danh. Thêm surrogate ID cho Port cũng không tự xóa quy tắc business UNIQUE(device_id,port_number) hay nghĩa tồn tại phụ thuộc owner.

## Chọn entity hay attribute, tránh ghi trùng một fact

Nếu chỉ lưu tên Maker như một giá trị trên Device và không có yêu cầu khác, attribute có thể đủ. Nếu cần địa chỉ, quản lý Maker chưa có thiết bị, validation danh mục hay relationships riêng, Maker xứng đáng thành entity. Heuristic “có nonkey attribute hoặc ở phía many” trong slide giúp đặt câu hỏi, không là định lý cấm mọi entity danh mục chỉ có một key.

Maker.address lặp trên mọi Device dễ sinh hai địa chỉ khác nhau khi cập nhật thiếu một hàng; xóa thiết bị cuối làm mất thông tin Maker. Giữ Maker(maker_id,name,address), Device(...,maker_id) tránh việc đó. Trong conceptual ERD, đừng đồng thời lưu maker_name trên Device và thêm MadeBy như hai fact độc lập có thể bất nhất. Trong relational mapping, cột FK maker_id lại chính là cách biểu diễn MadeBy; đó không phải tự động là lỗi ghi trùng như hai nguồn sự thật độc lập.

## Chuyển ERD thành relation và constraint

Entity set thành bảng giữ key và attributes. Many–many thành bảng relationship chứa keys của các vai và attributes của relationship. Các FK trỏ đúng entity; key mặc định toàn bộ keys tham gia có thể rút khi cardinality tạo FD mạnh hơn.

| Ý nghĩa | Mapping minh họa | Điều cần giữ |
|---|---|---|
| Member dùng nhiều Device | Uses(member_id,device_id) | PK cặp;hai FK;zero participation được cho phép nếu brief không bắt buộc |
| Member có tối đa một FavoriteDevice | Favorite(member_id PK,device_id FK), hoặc Member(...,favorite_device_id NULL FK) | Không biến một người thành nhiều favorite;nullable theo min cardinality |
| Mỗi Device bắt buộc ở một Room | Device(...,room_id NOT NULL FK) | FK + NOT NULL giữ tồn tại từ Device tới Room |
| Maker(1,1),FeaturedDevice(0,1) | Maker(...,featured_device_id NOT NULL UNIQUE FK) | Mỗi Maker có một;Device tối đa một Maker chọn;phải kiểm Device có thuộc Maker nếu nghiệp vụ đòi |
| Mentors hai vai | Mentors(mentor_id,learner_id) | Hai FK cùng bảng,role names và hướng rõ |
| Port yếu theo Device | Port(device_id,port_number,label) | PK(device_id,port_number),FK owner;owner bắt buộc |

Không merge Member với Uses many–many thành một row mỗi cặp rồi coi đó vẫn là bảng Member một row/người: name/address sẽ lặp và Member chưa có Uses biến mất. Many–one có thể merge FK sang phía many theo NULL policy; không thêm UNIQUE vào FK đó nếu chưa định đổi thành one–one.

Owner FK đã nằm trong key Port nên identifying relationship không cần một bảng khác lặp cùng owner. Nếu supporting relationship có attribute như installed_at, có thể đưa vào row Port khi mỗi Port có đúng một occurrence ấy. Attribute không tự bắt buộc có một bảng relationship riêng; vẫn phải giữ đúng grain/cardinality.

Total participation ở phía **parent** như “mọi Room phải có ít nhất một Device” không được FK Device.room_id tự thực thi. Cần cơ chế kiểm trạng thái/transaction phù hợp hoặc validator được đặc tả; không gọi diagram là constraint engine đã chạy. Tạo vòng FK và nạp dữ liệu còn có vấn đề bootstrap như USTH03, không lén tắt kiểm để coi luôn hợp lệ.

## Ba cách mapping subclass

Với Device D1 là loại thường, Camera C1 có resolution24:

| Cách | Các row minh họa | Query và constraint |
|---|---|---|
| E/R style | Device(D1,...),(C1,...);Camera(C1,24) | Tìm mọi Device chỉ đọc root;đọc resolution cần join;Camera key đồng thời FK root |
| Concrete/object-oriented style | DeviceOnly(D1,...);Camera(C1,...,24) | Camera giữ cả inherited fields;mọi Device cần UNION;identity unique xuyên các bảng và membership cần cơ chế riêng |
| Một bảng có NULL | Device(id,kind,...,resolution);D1/basic/NULL,C1/camera/24 | CHECK/discriminator phân biệt không áp dụng với chưa biết;query tránh join,nhưng sparse fields và constraint phức tạp hơn |

Với nhiều subclass overlap, “một bảng cho mỗi concrete combination” có thể cần nhiều tổ hợp; không tự chỉ có một bảng mỗi leaf. Kích thước không được kết luận chỉ bằng số NULL trong hình: kiểu lưu,compression,query và constraints quyết định đánh đổi. Ba cách biểu diễn phải giữ cùng logical entities nếu muốn so là những implementation của cùng brief.

## Bài thiết kế: ai có thể cùng sở hữu một tài khoản?

Slide52 có yêu cầu ghi customer(s) sở hữu account nhưng hình đáp án đặt mũi tên exactly-one về Customer. Hai cách đọc không giống nhau. Nếu cho joint ownership, dùng Customer(customer_id,name,address,phone), Account(account_no,type,balance), Ownership(customer_id,account_no) many–many; mỗi Account có ít nhất một owner theo policy. Nếu chỉ cho một owner thì Account.owner_id NOT NULL FK là mapping phù hợp. Phải nêu assumption, không giữ chữ “nhiều chủ” rồi vẽ một chủ.

Đây là ví dụ mô hình dữ liệu giả lập; ID là dữ liệu mẫu, không thu số định danh cá nhân hay thực hiện giao dịch tiền thật. Balance không tự được bảo vệ bởi cardinality của ERD; contract transaction/authorization có phần riêng.

## Luyện tập

1. Tách entity,entity set,attribute,relationship từ câu Lan dùng M1 ở A. Chọn ký hiệu ERD nguồn và viết một relationship tuple. Nếu đổi requirements từ ý tưởng tới bảng luôn, có thể bỏ sót câu hỏi nào?
2. Với ba Permission tuples ở đầu bài, tính ba projection nhị phân rồi chỉ ra (Lan,A,C1) giả. Thiết kế ternary table và key; nếu một cặp Member–Room chỉ được một Device, key thay đổi thế nào?
3. Ghi min–max của Device–Room khi Device bắt buộc có Room,Room có thể trống;Maker–FeaturedDevice như brief. Giải thích arrow vào một đầu của ternary relationship và khác nhau giữa at-most-one/exactly-one.
4. Thiết kế Quote hiện tại và Quote history;price thuộc đầu nào? Chuyển price thành entity giá trị có currency và nêu FD/cardinality cần giữ để tương đương.
5. Viết mapping Mentors và Friendship. Nêu policy có hướng/đối xứng,self-pair và cách tránh cặp đảo bị lưu hai lần. Hai FK cùng bảng có tự làm symmetry đúng không?
6. Camera isa Device: ghi inherited identity/attribute và tạo ba mapping có D1,C1. Query “mọi Device” khác query “resolution của Camera” ra sao? Một resolution NULL có tự chứng minh entity không là Camera không?
7. Port1 của M1 vàPort1 của C1:ghi partial/full key,owner và một relation khác không hỗ trợ key. Chọn inspection_id toàn cục có làm Inspection tự thành weak entity chỉ vì nó có FK không?
8. Chọn Maker attribute hay entity cho hai brief:chỉ hiện tên hãng;quản lý địa chỉ và hãng chưa có Device. Vì sao FK vật lý không cùng nghĩa với hai fact maker độc lập trong ERD?
9. Chuyển Uses,Favorite,StoredAt,Port,Mentors thành relations,PK/FK/UNIQUE/NULL policy. Bác câu “FK giữ mọi Room đều có Device”. Nêu hậu quả của merge Uses many–many vào bảng Member.
10. Thiết kế hai phiên bản Account:cho một owner và cho joint owners. Ghi cardinality,keys và cơ chế cần thêm cho account không được zero-owner. Nêu vì sao hình đáp án nguồn không đồng thời biểu diễn cả hai brief.

## Gợi ý

Hỏi “một row đang nói về cái gì?” trước khi chọn key. Đọc mũi tên từ phía các vai còn lại,không chỉ nhìn chỗ mũi tên chạm hình. Mỗi cardinality có phần tối đa và phần tồn tại;FK,UNIQUE,NOT NULL giữ những phần khác nhau.

## Đáp án và lập luận

1. Lan,M1,A là các entity; Member,Device,Room là entity sets; name,label,location là attributes; Permission là relationship. Tuple (Lan,A,M1) ghi cả ba vai. Cần hỏi quyền có phụ thuộc phòng không, thiết bị có dùng chung được không và identity nào ổn định trước khi tạo key/FK.
2. Member–Room có Lan/A từ tuple1; Member–Device có Lan/C1 từ tuple2; Room–Device có A/C1 từ tuple3. Join tạo bộ ba chưa được cấp. Ternary table với PK ba ID giữ đúng tập permissions; FD(member,room)→device cho phép PK(member,room) nếu không còn version nào trong grain. Không thay bằng ba binary tables thiếu constraint về việc ghép bộ ba.
3. Device(1,1),Room(0,many); Maker(1,1),Device(0,1) trong quan hệ featured. Arrow ternary vào Device nghĩa là cặp Member–Room xác định tối đa một Device. Exactly-one còn đòi tồn tại; at-most-one cho phép vắng.
4. Giá hiện tại có thể là Quote(room,device,amount,currency), key(room,device) theo policy một quote. History cần version hoặc interval và constraint tương ứng. PriceValue cần identity của amount/currency hoặc price_id cùng quy tắc equality; cặp(room,device) xác định một price_id. Không tự bắt mọi price được dùng hoặc thêm nhiều quote cho một cặp.
5. Mentors có hai FK theo hai vai có hướng. Friendship có thể lưu cặp canonical(low,high), CHECK low<high, PK cặp nếu là quan hệ không hướng. Hoặc lưu hai hướng và kiểm symmetry bằng cơ chế riêng. Hai FK chỉ kiểm tồn tại, không sinh cặp đảo, cấm self-pair hay bảo toàn symmetry.
6. Camera dùng device_id của Device và kế thừa thuộc tính root. E/R style giữ Device D1,C1 rồi Camera C1; concrete style tách DeviceOnly D1 và Camera C1 chứa inherited fields; một bảng giữ kind cùng resolution. Query mọi Device cần UNION ở concrete style, đọc root ở E/R style. Resolution NULL có thể là chưa biết ở Camera, nên cần discriminator/policy để phân biệt với không áp dụng.
7. Partial key là port_number, full key là(device_id,port_number). Device là supporting owner; Technician phụ trách không phải owner định danh nếu không thuộc business key. Inspection có ID toàn cục không cần owner để định danh dù bắt buộc có FK. Surrogate ID không xóa quy tắc unique số cổng trong mỗi Device.
8. Chỉ lưu tên có thể dùng attribute; địa chỉ và vòng đời Maker độc lập là lý do dùng entity. FK maker_id trong mapping biểu diễn MadeBy; hai attribute/relationship độc lập mới có nguy cơ tạo hai nguồn sự thật. Danh mục chỉ có key vẫn có thể đáng là entity theo yêu cầu validation, không bị cấm máy móc bởi một heuristic.
9. Uses có PK cặp; Favorite có key member hoặc nullable FK trong Member; StoredAt có NOT NULL FK ở Device; Port có composite PK và owner FK; Mentors có hai role names. FK chỉ giữ Device có Room hợp lệ, không giữ mọi Room có Device. Merge Uses many–many làm thông tin Member lặp và mất người chưa có Uses nếu bảng chỉ giữ các cặp.
10. Một owner: Account.owner_id NOT NULL FK. Joint owners: Ownership có PK(customer_id,account_no) và hai FK; phần mọi Account phải có ít nhất một Ownership cần cơ chế kiểm thêm. Mũi tên exactly-one về Customer loại joint ownership. Phải chốt brief hoặc đổi hình, không chấm cả hai cách đồng thời đúng với cùng một requirement.

## Biến thể và cách kiểm

Luân phiên đọc min–max, ghép entity với row, dựng tuple phản ví dụ, mapping key/FK rồi thiết kế một brief mới. Bài nhiều đáp án được chấm theo facts,cardinality,identity và sự bảo toàn thông tin, không so tọa độ hay màu hình. Model kiểm permission giả,owner thiếu/không hợp lệ,weak key trùng và subtype mất identity; kiểm schema trên engine có artifact riêng.

## Học trên web

Canvas ERD có nhãn min–max và role, kèm bảng tuples để người học thử thêm một ca. Sau phần hỗ trợ, cho brief đổi multiplicity hoặc thêm history để tự mapping. Backend kiểm PK/FK/NULL trong schema riêng; kết luận total participation hoặc equivalence cần validator/rubric bổ sung, không tự PASS vì DDL tạo được bảng.

## Nguồn và đối chiếu

Lecture 6 USTH,64 trang, và AD09. Đã đọc các hình arrow,weak entity,subclass,mapping cùng bài Account trang52; giữ rõ ký pháp nguồn,assumption về ownership và các heuristic thiết kế. Ví dụ Device/Permission/Port được biên soạn mới; diagram không được nhận là bằng chứng migration native đã chạy.
