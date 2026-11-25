# USTH02 · Từ câu hỏi đến biểu thức, cây và ràng buộc

Học sau C02–C04, cùng AD01 và AD03. Phần này bổ sung hoạt động cho Lecture2 USTH trang11,21–22,28,47,49–55,60–71. Mỗi nhóm có thể học riêng: biểu thức/cây trước, ràng buộc sau. Tất cả ví dụ đại số dưới đây dùng **tập**, thuộc tính có tên, miền tương thích và **không NULL**, trừ đoạn so sánh SQL được ghi rõ.

Một báo cáo mượn thiết bị có thể trả đúng vài hàng nhưng dùng nhầm phép join. Cách kiểm rõ hơn là ghi schema sau mỗi phép toán, tính kết quả trên dữ liệu nhỏ rồi đổi dữ liệu để thử phản ví dụ. Cây biểu thức giúp nhìn thứ tự kết hợp; quan hệ vi phạm giúp diễn đạt điều database không được chứa.

## Một giá trị được coi là nguyên tử theo mô hình nào?

Với `Member(id,name,phone)`, một domain có thể là tập mã thành viên hợp lệ, chuỗi tên Unicode hoặc số điện thoại dưới dạng chuỗi chuẩn hóa. Domain không chỉ là kiểu máy: VARCHAR cho phép nhiều chuỗi chưa chắc là mã thành viên hợp lệ. Chuỗi `Linh Anh` là một giá trị name nếu ứng dụng coi toàn tên là đơn vị; việc chuỗi có ký tự không tự làm nó vi phạm atomicity.

Nếu `phone` chứa chuỗi `0901,0902` và ứng dụng cần tìm/xóa riêng từng số, nó đang giấu một tập giá trị trong một cột của mô hình phẳng. Có thể tách `MemberPhone(member_id,phone)` với một hàng cho mỗi số. Atomicity phụ thuộc các đơn vị mà mô hình cần thao tác, không phải mệnh đề mọi chuỗi có thể cắt ký tự đều không nguyên tử. Kiểu array/record ở các phần object-relational là mở rộng mô hình, không lén dùng chúng trong phép đại số phẳng này.

## Cơ sở phép toán và phép suy ra

Chọn sáu phép cơ sở của set relational algebra trong slide: selection `σ`, projection `π`, rename `ρ`, Cartesian product `×`, union `∪`, difference `−`. “Cơ sở” là lựa chọn hệ biểu diễn, không phải mọi phép query khác đều không tồn tại. Union/difference cần các schema tương thích; khi dùng tên thuộc tính, đổi tên cho trùng nghĩa trước khi kết hợp.

Theta join được định nghĩa `R ⋈c S = σc(R × S)` sau khi phân biệt tên trùng. Intersection suy ra `R ∩ S = R − (R − S)`. Natural join thêm điều kiện bằng nhau của **mọi** tên thuộc tính chung rồi bỏ cột chung lặp. Vì thế thêm một cột chung mới có thể đổi nghĩa natural join dù code query không đổi. Outer join bổ sung hàng thiếu bằng NULL trong ngữ nghĩa mở rộng; nó không thuộc mô hình không NULL đang dùng cho các chứng minh ở bài này.

Left semijoin `R ⋉c S` trả những tuple của **R** có ít nhất một witness trong S, schema chỉ của R. Với set semantics, nó bằng `πattrs(R)(R ⋈c S)` sau khi làm rõ tên. Nó không trả cột của S. Ví dụ R={(A,2),(B,3)}, S={(A,x),(A,y)}: join có hai hàng với A, semijoin chỉ có tuple(A,2). Trong SQL bag semantics, `WHERE EXISTS` giữ số bản của mỗi hàng bên trái; join rồi projection thông thường có thể nhân hàng, còn DISTINCT có thể xóa cả bản trùng vốn có ở R. Phải chọn contract trước khi đổi các cách viết.

Quy ước ưu tiên để đọc các biểu thức trong bài: `σ,π,ρ` cao nhất, tiếp đến `×,⋈`, rồi `∩`, cuối cùng `∪,−`; cùng bậc dùng ngoặc để chỉ thứ tự mong muốn. Viết ngoặc đầy đủ khi có nhiều phép hai ngôi, vì công cụ khác có thể dùng convention khác. Chẳng hạn `R ∪ S ∩ T` đọc thành `R ∪ (S ∩ T)` theo quy ước này; `(R ∪ S) ∩ T` có thể khác.

## Projection có tính toán và thuộc tính lặp

Cho `Sale(qty,unit_price)` có hai tuple(2,30),(3,20). Extended projection cho phép tính biểu thức và lặp nguồn nếu các cột kết quả có tên rõ:

```text
π qty*unit_price -> total,
  qty -> ordered_qty,
  qty -> packed_qty (Sale)
```

Kết quả schema `(total,ordered_qty,packed_qty)` là {(60,2,2),(60,3,3)}. `total` ở đây là số nguyên theo miền nhỏ đã chọn; số tiền thật cần DECIMAL/overflow/rounding policy phù hợp. Nếu chỉ project total trong set algebra thì còn một tuple(60). SQL SELECT không DISTINCT vẫn có thể trả hai hàng60. Việc lặp `qty` ở danh sách output không tạo hai tuple, mà tạo hai thuộc tính mang cùng giá trị với tên khác.

## Một câu hỏi, ba cách viết

Ta có dữ liệu mới cho phòng thiết bị:

| Room(room,wing) | Tuple |
|---|---|
| R | (A,East),(B,West),(C,West) |
| Loan(room,item,cost) | (B,mic,35),(B,screen,50),(C,mic,45),(D,mic,20) |

Không giả định FK của Loan trong ví dụ biểu thức này; D cố ý là room chỉ xuất hiện ở Loan. Câu hỏi: tìm mã phòng ở East **hoặc** có khoản mượn mic giá dưới40. Hai nhánh phải cùng schema(room).

```text
X(room) := πroom(σwing='East'(Room))
Y(room) := πroom(σitem='mic' AND cost<40(Loan))
Answer(room) := X ∪ Y
```

Nested expression là `πroom(σwing='East'(Room)) ∪ πroom(σitem='mic' AND cost<40(Loan))`. Nếu cột bên phải vốn tên khác, dùng `ρ` để thống nhất thành room trước union. Không join Room với Loan trước: cách đó sẽ mất A không có Loan và D không có Room, dù cả hai thỏa một nhánh của câu hỏi.

```text
                Union(room) => {A,B,D}
                 /                  \
       Project(room)             Project(room)
             |                         |
     Select wing=East          Select item=mic,cost<40
             |                         |
       Room(room,wing)          Loan(room,item,cost)
```

Đọc từ lá lên: selection bên trái còn(A,East), projection còn A; bên phải còn(B,mic,35),(D,mic,20), projection còn B,D. Union nhận hai input cùng một cột và trả A,B,D. Thứ tự trình bày A,B,D chỉ để dễ đọc, set result không có order. Đây là logical expression tree; node Join không tự nói dùng hash join, index hay nested loop như một physical plan.

Nếu câu hỏi đổi thành “phòng ở East **và** có khoản mic dưới40”, ta có thể dùng intersection hai tập room, hoặc một join/semi join tương đương với ràng buộc schema rõ. Kết quả ở fixture này rỗng. Đổi OR thành AND bằng cảm giác về tree sẽ làm bài toán đổi nghĩa.

## Tìm hai witness khác nhau bằng self-join

Muốn tìm room mượn ít nhất hai loại item khác nhau, đổi tên hai bản Loan: `L(room1,item1,cost1)` và `M(room2,item2,cost2)`. Dùng `πroom1(σroom1=room2 AND item1<>item2(L × M))`, rồi rename room1 thành room nếu cần. Kết quả {B}; hai tuple B,mic và B,screen làm witness. Một tuple ghép với chính nó không đạt item1<>item2.

```text
                   Project room1 -> room
                            |
           Select room1=room2 AND item1<>item2
                            |
                         Product
                       /         \
              Rename L             Rename M
                  |                    |
                 Loan                 Loan
```

Phải đổi tên cả cost ở bản thứ hai. Nếu dùng natural join mà vẫn để chung cost, query còn ngầm yêu cầu hai item có cùng cost; B35/B50 sẽ bị loại sai. Hình self-join trong slide54 cần được đọc cùng phép join/điều kiện được chọn, không suy mọi thuộc tính chưa đổi tên đều có thể để nguyên mà không ảnh hưởng kết quả.

Anti-semijoin tìm tuple của R **không** có witness: trong set algebra có thể lấy `R − (R ⋉ S)`. Ví dụ tìm room trong Room chưa từng có Loan: {A}. Đừng lấy mọi mã xuất hiện ở Loan rồi suy ra những room không tồn tại trong Room; tập đối tượng cần xét là phía R đã nêu.

## Từ “mọi dữ liệu phải đúng” tới quan hệ vi phạm rỗng

Để diễn đạt constraint, dựng một query trả **phản ví dụ**. Database hợp lệ khi query ấy trả ∅. Một câu “nếu P thì Q” bị vi phạm khi P đúng và Q sai; nó không có nghĩa “Q thì P”. Phép này cho một cách thử lỗi cụ thể thay vì chỉ đọc định nghĩa.

Cho `Order(order_id,customer,city)`, dùng hai bản O1,O2. `order_id` là superkey nếu quan hệ sau rỗng:

```text
σ O1.order_id=O2.order_id AND
  (O1.customer<>O2.customer OR O1.city<>O2.city)
  (O1 × O2) = ∅
```

Dùng OR vì **ít nhất một** thuộc tính ngoài key khác đã là hai tuple khác nhau. (K7,Lan,Hue) và(K7,Lan,DaNang) vi phạm dù customer giống nhau. Công thức dùng AND giữa hai phép khác ở slide60 bỏ lọt ca này; ký hiệu selection dùng σ, không dùng nhầm ký hiệu loại trùng δ. Trong set algebra tuple giống hệt không xuất hiện hai lần; constraint trên kiểm uniqueness của key, chưa chứng minh **minimality**. Nếu customer tự đã unique, cặp(order_id,customer) có thể là superkey dư thuộc tính.

Với `Booking(room,day,owner)`, FD `(room,day)→owner` không có vi phạm khi `σa.room=b.room AND a.day=b.day AND a.owner<>b.owner(ρa(Booking)×ρb(Booking))` rỗng. Để gọi(room,day) là candidate key cần nó xác định mọi thuộc tính và không có proper subset nào đã là superkey theo **mọi instance được phép**, không chỉ vì mẫu ba hàng không trùng.

Foreign key trong mô hình không NULL là inclusion dependency. Với Child(parent_code,...) và Parent(code,...), chuẩn hóa cả projection thành cùng tên k rồi kiểm:

```text
ρC(k)(πparent_code(Child)) − ρP(k)(πcode(Parent)) = ∅
```

Child có P1,P9,Parent có P1,P2 thì kết quả vi phạm {P9}. Child rỗng thì difference rỗng, nhưng không chứng minh Parent phải có child. Inclusion riêng cũng chưa yêu cầu Parent.code là key; SQL FK còn cần target key/index hợp lệ theo hệ và chính sách NULL. Với SQL composite FK, việc có NULL có semantics riêng; không bê nguyên công thức hai-valued rồi kết luận mọi NULL là lỗi. Naming tương thích là điều kiện union/difference, không chỉ có cùng số cột.

## Constraint tại một hàng, một cặp và nhiều bảng

Cho `Instrument(id,mode,rate,memory,price)` trong miền không NULL. Domain mode chỉ có `auto,manual`: violations là `σmode<>'auto' AND mode<>'manual'(Instrument)`. Câu “rate<50 thì price<=700” có violations `σrate<50 AND price>700(...)`. Giá đúng700 không vi phạm; rate50 không kích hoạt điều kiện. SQL CHECK nhận UNKNOWN trong nhiều hệ nên muốn cấm dữ liệu thiếu phải nói NOT NULL hoặc viết policy rõ, không suy từ công thức không NULL.

“Nếu memory<16 thì rate>=80 **hoặc** price<900” có violations `σmemory<16 AND rate<80 AND price>=900(...)`. Phải phủ định **toàn** vế OR theo De Morgan. Một thiết bị memory8,rate90,price1000 vẫn đạt vì rate>=80; việc price cao không đủ kết luận sai. Constraint không bắt các thiết bị memory>=16 phải có rate cao hay giá thấp.

Cho Portable(model,memory,price) và Station(model,memory,price), đổi tên L,D. “Mọi portable có memory lớn hơn một station thì phải đắt hơn station ấy” có violations `σL.memory>D.memory AND L.price<=D.price(L×D)`. L16/800,D8/800 vi phạm ở giá bằng; nếu một phía rỗng thì product rỗng và constraint đạt một cách vacuous. L8/600,D16/900 không kích hoạt tiền đề. Không so riêng MAX(memory) với MAX(price): hai giá trị max có thể thuộc các tuple khác nhau.

“Không maker nào thuộc cả hai nhóm Probe và Camera” có hai cách. Nếu mỗi relation có maker, kiểm `πmaker(Probe) ∩ πmaker(Camera)=∅`. Nếu Catalog(maker,model,kind) giữ maker, còn Probe(model,...) và Camera(model,...) giữ thông số, phải join đúng model **trước** rồi project maker mỗi nhánh. Lấy maker bất kỳ từ Catalog mà không nối membership sẽ gán sai hãng cho một nhóm.

Constraint “model số lớn hơn phải giá cao hơn” trên R(model,price) bị vi phạm khi `a.model>b.model AND a.price<=b.price`. Domain model ở đây là **số có thứ tự nghiệp vụ**, không mã chuỗi tùy ý nhưX9,X10. Policy ấy không là định luật giá thiết bị, chỉ là yêu cầu đề bài. Mã model unique còn làm tiền đề “cùng model nhưng thông số khác” không có witness. Nếu cần so hai cấu hình của một model, thiết kế `Config(model,config_id,rate,ram,storage,price)`: cùng model và cả rate,ram,storage đều lớn hơn thì price phải lớn hơn; violation dùng ba dấu> và price<=. Đổi “cả ba lớn hơn” thành “ít nhất một lớn hơn, các cái còn lại không giảm” là policy khác, phải viết lại predicate.

## Luyện tập

1. Viết domain và cách lưu cho Member có nhiều số điện thoại. Name chứa dấu cách có tự vi phạm atomicity không? Nêu thao tác khiến chuỗi phone ghép nhiều số trở nên khó dùng.
2. Với R={(A,2),(A,2)} dưới **bag** semantics và S={(A,x),(A,y)}, tính số hàng của EXISTS, join rồi project thường và join rồi DISTINCT. Sau đó đổi R về set và nêu vì sao ba kết luận không dùng lẫn nhau.
3. Suy intersection từ sáu phép cơ sở; viết theta join chỉ dùng selection/product/rename cần thiết. Với R={1},S={2},T={2}, so `R ∪ (S∩T)` và `(R∪S)∩T`.
4. Cho Sale={(4,15),(2,25)}. Project total=qty*unit_price, bản sao qty tênx vày; ghi schema/result. Nếu chỉ project total thì khi nào set và bag khác nhau?
5. Tự dựng assignment,nested expression và tree cho “room ở West hoặc mượn screen”. Ghi schema và result từng nhánh trên fixture đã cho. Thêm một Loan ở roomE chưa có Room để kiểm OR không bị đổi thành join.
6. Dựng self-join tree tìm room có hai item khác nhau; giải thích vì sao chỉ đổi tên item mà để chung cost có thể sai khi dùng natural join. Đổi câu hỏi sang “hai khoản cùng item nhưng cost khác” cần predicate nào?
7. Dùng Catalog(maker,model,kind), Probe(model,rate,memory,price), Camera(model,color,tech,price), Hub(model,rate,memory,price), model unique toàn Catalog và các bảng loại phân biệt. Viết ba query: mọi(model,price) của makerM; maker có Hub nhưng không Probe; maker có ít nhất hai model khác nhau thuộc Probe/Hub đều rate>=60. Chỉ ra schema trước union/difference.
8. Sửa công thức key dùng AND giữa mọi nonkey-difference. Cho hai Order cùng ID/cùng customer/khác city, tính quan hệ vi phạm của bản sai và bản đúng. `(order_id,customer)` unique trên mẫu có đủ chứng minh minimal key không?
9. Viết relation vi phạm FD(room,day)→owner cho Booking, rồi cho hai tuple vi phạm. Phân biệt FD này với yêu cầu room một mình là key.
10. Child có parent_code{P1,P9},Parent.code{P1,P2}. Viết difference có rename và result; nếu Child rỗng có bắt buộc Parent cũng rỗng không? Thêm NULL trong SQL cần xác định điều gì trước khi dùng công thức?
11. Dựng query vi phạm cho mode hợp lệ, rate<50→price<=700 và memory<16→(rate>=80 OR price<900). Với tuples (auto,49,8,700),(auto,50,8,900),(manual,40,16,901), theo thứ tự mode,rate,memory,price, phân loại từng constraint riêng.
12. Portable có(L1,16,800),(L2,8,600),Station có(D1,8,800),(D2,16,900), thuộc tính model,memory,price. Tìm mọi cặp vi phạm quy tắc memory lớn hơn thì price lớn hơn. Đổi Station thành rỗng rồi giải thích kết quả.
13. Catalog={(M,p,probe),(M,c,camera),(N,h,hub)}, Probe chỉ cóp,Camera chỉ cóc. Maker nào vi phạm không đồng thời Probe/Camera? Viết cách join/project đúng và chỉ ra lỗi nếu bỏ join model.
14. Dựng phản ví dụ cho higher-model→higher-price bằng số model. Với Config cùng model, chỉ rate lớn hơn còn ram/storage bằng nhau: có kích hoạt policy “cả ba lớn hơn” không? Nếu model là key của relation không có config_id, tại sao yêu cầu so cùng model có thể vô nghĩa?
15. Tự viết năm query ngắn trên schema câu7: model Probe có rate>=60; maker có Hub memory>=32; model Camera color=true và tech='thermal'; những mức memory xuất hiện ở ít nhất hai model Probe khác nhau; maker của Probe có ít nhất hai rate khác nhau. Với mỗi query ghi một tuple/cặp witness làm nó được chọn. Giả định color là Boolean của mô hình không NULL, không suy cách khai báo mọi DBMS đều giống nhau.

## Gợi ý

Trước mỗi phép toán ghi tên cột kết quả. Với constraint, tìm tuple/cặp tuple làm tiền đề đúng và kết luận sai; đừng cố chọn các hàng “có vẻ đúng”. Với self-join, mỗi cột chung trong natural join đều tạo equality, kể cả cột bạn chưa định so.

## Đáp án và lập luận

1. Member(id,name) và MemberPhone(member_id,phone) nếu số điện thoại là đơn vị cần tìm/xóa riêng. Domain phone là chuỗi chuẩn hóa theo policy cụ thể, không chỉ INTEGER vì có0 đầu/dấu+. Name nhiều ký tự vẫn là một giá trị trong mô hình đã chọn.
2. EXISTS trả hai bản(A,2); join/project thường trả bốn; DISTINCT còn một. Set R chỉ có một tuple nên semijoin và set-project join cùng một tuple. Không dùng DISTINCT để chứng minh phép rewrite giữ mọi bag multiplicity.
3. `R−(R−S)`; theta join=`σc(ρr(R)×ρs(S))` với tên phân biệt. Hai kết quả lần lượt{1,2} và{2}; cần ngoặc, không coi ưu tiên là trang trí.
4. Schema(total,x,y),result{(60,4,4),(50,2,2)}. Nếu hai tuple input khác nhau cho cùng total, set projection gom chúng còn một tuple; bag projection giữ số bản tương ứng.
5. X=πroom(σwing=West(Room))={B,C}; Y=πroom(σitem=screen(Loan))={B}; union={B,C}. Thêm(E,screen,10) làm result{B,C,E}. Tree có root union và hai projection/selection riêng; không nối Room với Loan để bắt E phải tồn tại ở cả hai.
6. Dùng hai bản phân biệt mọi tên, selection room1=room2 AND item1<>item2, rồi project/rename room. Kết quảB; natural join thêm cost equality sẽ bỏ B35/B50. Cùng item/khác cost dùng room1=room2 AND item1=item2 AND cost1<>cost2, vẫn cần hai witness thực sự khác.
7. Query1: `K=σmaker='M'(Catalog)`; `U=πmodel,price(Probe) ∪ πmodel,price(Camera) ∪ πmodel,price(Hub)`; result=`πmodel,price(K⋈U)` với natural join chỉ chungmodel. Query2:`πmaker(Catalog⋈Hub)−πmaker(Catalog⋈Probe)`, hai input chỉ maker. Query3: `F=πmaker,model(Catalog⋈(πmodel(σrate>=60(Probe)) ∪ πmodel(σrate>=60(Hub))))`; self-join hai bảnF với maker bằng nhau/model khác nhau rồi projectmaker. Không dùng COUNT trong set basis khi nhiệm vụ là dựng hai witness. Có thể thêm hoạt động threshold, color/tech hoặc hai rate khác nhau bằng cùng nguyên tắc predicate và witness.
8. Bản sai không trả cặp vì customer không khác; bản đúng OR trả cả hai hướng của cặp. Query rỗng mới là superkey uniqueness. Minimality cần phụ thuộc/ràng buộc của schema và chứng minh không bỏ được thuộc tính, không chỉ nhìn mẫu hiện tại.
9. Selection trên hai bản có room/day bằng và owner khác. Ví dụ(A,Mon,Lan),(A,Mon,Minh) vi phạm. (A,Mon,Lan),(A,Tue,Minh) có thể đạt FD composite nhưng room không xác định owner/day nên room chưa là key.
10. Rename cả hai projection thành k rồi lấy Child−Parent, result{P9}. Child rỗng làm inclusion đúng bất kể Parent rỗng hay không. Với SQL cần NULL/match policy, target uniqueness và kiểu/collation tương thích; không dùng hai-valued proof như đã bao trùm NULL.
11. Cả ba đạt mode. Constraint rate<50→price<=700: tuple1 đạt ở biên700; tuple2 tiền đề sai; tuple3 vi phạm vì40<50 và901>700. Constraint memory<16→(rate>=80 OR price<900): tuple1 đạt do700<900; tuple2 vi phạm50<80 và900>=900; tuple3 tiền đề sai vìmemory16. Relation vi phạm là các selection đã dạy, và constraint đạt iff relation ấy rỗng.
12. Chỉ(L1,D1):16>8 nhưng800<=800. L1,D2 có memory bằng nên không kích hoạt; L2 không có memory lớn hơn station nào. Station rỗng cho product rỗng và constraint đúng vacuously, chưa chứng minh quan hệ hai phía phải có dữ liệu.
13. MakerM vi phạm; dùng `πmaker(Catalog⋈Probe)∩πmaker(Catalog⋈Camera)`. Bỏ join có thể lấy toàn bộ makers Catalog cho mỗi nhánh, làm N bị gắn sai nhóm dù chỉ cóhub. Kết quả projection cần cùng schema maker trước intersection.
14. R={(1,200),(2,190)} vi phạm khi2>1 nhưng190<=200. Với Config, chỉ rate tăng không đủ tiền đề cả ba tăng. Nếu model là key, hai tuple khác nhau cùng model bị cấm từ đầu; không còn cặp cấu hình hợp lệ để kiểm policy đó. Cần config_id hoặc đổi policy/grain, không bỏ key âm thầm.
15. Lần lượt: `πmodel(σrate>=60(Probe))`; `πmaker(Catalog⋈σmemory>=32(Hub))`; `πmodel(σcolor=true AND tech='thermal'(Camera))`. Mức memory lặp: hai bảnP,Q của Probe, chọn `P.memory=Q.memory AND P.model<>Q.model`, projectP.memory. Hai rate cùng maker: dựng `F(maker,model,rate)=πmaker,model,rate(Catalog⋈Probe)`, dùng hai bản có maker bằng và rate khác, projectmaker. Ví dụ Probep1/rate60/memory16 vàp2/rate80/memory16 cùng makerM chứng minh cả memory16 lặp và makerM có hai rate; Camera c1/true/thermal chứng minh điều kiện màu/công nghệ. Các giá trị trong witness phải đến từ tuple thật, không ghép rate của model này với maker của model khác.

## Biến thể và cách kiểm

Luân phiên card domain, tính trung gian, sửa tree, chọn witness nhỏ nhất và tự viết constraint. Checker tính tập tuple/schema, không so chuỗi biểu thức với một đáp án duy nhất. Query tương đương có thể khác cách viết; các bộ ca gồm thiếu witness, hai witness khác giá, tuple chỉ khác một nonkey, empty relation và biên bằng. Model finite tests kiểm các ca này; lập luận set/NULL/multiplicity giữ riêng.

## Học trên web

Canvas tree có lá là relation và nhãn schema sau mỗi node; người học dự đoán trước khi mở kết quả. Bài constraint cho sửa predicate rồi hệ trả tuple vi phạm, sau đó một lượt mới yêu cầu tự viết biểu thức không có khung. Nếu runner chưa parse RA tổng quát, giao diện nói rõ nó chỉ tính model đã định và chấm bài tự viết bằng rubric/review; không giả kết quả SQL/MySQL.

## Nguồn và đối chiếu

Lecture2 USTH các trang đã nêu; AD01/AD03 giữ nền relational/FD. Công thức key sai AND được sửa thành OR và phân biệt superkey với minimal key. Các vấn đề tương thích schema, NULL, bag, join condition và grain được đưa vào ví dụ mới; không phân phối lại nguyên ngân hàng câu hỏi trong slide.
