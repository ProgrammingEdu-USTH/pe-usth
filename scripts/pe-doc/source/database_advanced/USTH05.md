# USTH05 · Suy FD, tìm mọi key và giải thích chuẩn hóa

Học cùng AD03–AD08, bổ sung Lecture 5 USTH. Bài dùng mô hình relation như tập tuple, không NULL. FD là ràng buộc của mọi instance được phép. Các phần có thể học riêng: nhận biết FD, closure, tìm key, rồi chuẩn hóa.

Một môn học có nhiều người giảng. Mã môn xác định tên và số tín chỉ, nhưng không tự xác định một người giảng duy nhất. Nếu lấy mã môn làm key của bảng chứa cả người giảng, ta đã áp một constraint sai với nghiệp vụ. Cần chốt grain và FD trước khi chia bảng.

## FD nói về hai tuple

X → Y nghĩa là bất kỳ hai tuple nào bằng nhau trên mọi thuộc tính X đều phải bằng nhau trên Y. X là determinant, Y là dependent; chúng có thể là các tập thuộc tính. ABC là cách viết ngắn của {A, B, C}. Một X vẫn có thể xuất hiện ở nhiều tuple nếu chúng khác ở phần ngoài Y.

Ví dụ Teach(course, title, teacher) có (C, T, Lan) và (C, T, Minh). Hai tuple đạt course → title nhưng bác course → teacher. Khi nghiệp vụ cho một môn nhiều người giảng, đây là dữ liệu hợp lệ cần schema giữ được.

Dưới duy nhất FD course → title, cặp (course,teacher) là candidate key của schema này: nó xác định cả ba thuộc tính, còn từng cột riêng không đủ. Thêm title vào cặp ấy vẫn là superkey nhưng không minimal. Đây là kết luận từ FD được cho, không chỉ từ việc các hàng mẫu tình cờ khác nhau.

Nếu Y là tập con của X thì X → Y là FD trivial. X → YZ tương đương X → Y và X → Z: bằng nhau trên cặp YZ nghĩa là bằng nhau trên từng phần. Ngược lại, AB → C không cho phép suy A → C hoặc B → C. Instance (1,1,x), (1,2,y), (2,1,z) thỏa AB → C nhưng bác cả hai FD có determinant một cột.

Một mẫu chưa vi phạm không chứng minh business FD đúng trong mọi dữ liệu tương lai. Một cặp phản ví dụ đủ bác FD trên instance ấy; muốn áp FD cho schema còn phải có yêu cầu nghiệp vụ về mọi instance hợp lệ.

## Từ ba tiên đề tới các luật suy

Ba tiên đề Armstrong là:

- Reflexivity: Y ⊆ X thì X → Y.
- Augmentation: X → Y thì XZ → YZ.
- Transitivity: X → Y và Y → Z thì X → Z.

Chúng đều giữ tính đúng theo định nghĩa hai tuple. Bằng nhau trên X thì bằng trên phần Y của X; thêm cùng Z vẫn giữ equality; bằng Y rồi được FD Y → Z bảo đảm bằng Z. Đây là lập luận soundness, không chỉ là ba công thức để nhớ.

Các luật sau có thể suy từ ba tiên đề:

| Luật | Cách suy |
|---|---|
| Union: X → Y và X → Z thì X → YZ | Augment X vào FD đầu để được X → XY; augment Y vào FD sau để được XY → YZ; dùng transitivity. |
| Decomposition: X → YZ thì X → Y và X → Z | YZ → Y và YZ → Z theo reflexivity; ghép với FD ban đầu. |
| Pseudotransitivity: X → Y và YZ → W thì XZ → W | Augment Z vào FD đầu, được XZ → YZ, rồi dùng transitivity. |
| Accumulation: X → YZ và Z → V thì X → YZV | Suy X → Z, rồi X → V; union với X → YZ. |
| Extension: X → Y và W → Z thì WX → YZ | Augment W để được WX → WY; augment Y vào W → Z để được WY → YZ; dùng transitivity. |

Không luật nào tự cho đảo chiều mũi tên. F+ là tập mọi FD suy từ F; X+ là tập thuộc tính được X xác định dưới F. Kiểm X → Y bằng cách xem Y có nằm trong X+ hay không, không cần liệt kê hết F+.

## Closure: chỉ thêm điều đã có bằng chứng

Cho R(A,B,C,D,E,F), G = {A → C, A → D, D → E, E → F}. Bắt đầu từ A; thêm C, D, rồi E và F, được A+ = {A,C,D,E,F}. B không tự xuất hiện nên A chưa là superkey của R. Đổi thứ tự duyệt FD có thể đổi số vòng, nhưng không đổi fixpoint nếu tiếp tục tới khi không còn thay đổi.

```text
Closure(X, G):
    result := X
    repeat:
        before := result
        for each U -> V in G:
            if U is subset of result:
                result := result union V
    until result = before
    return result
```

Tách RHS thành singleton có thể thuận tiện, nhưng không bắt buộc để phép union V đúng. Soundness: các thuộc tính ban đầu được X xác định theo reflexivity; khi thêm V, ta đã có X → U và U → V nên X → V.

Result chỉ tăng trong hữu hạn n = |R| thuộc tính. Có tối đa n lần thêm thuộc tính mới rồi một vòng không đổi, nên thuật toán dừng. Để thấy completeness, xét một thuộc tính a ngoài result cuối. Dựng hai tuple bằng nhau trên result và khác nhau trên mọi thuộc tính ngoài result. Chúng thỏa G: nếu LHS nằm trong result thì RHS cũng đã nằm trong đó do fixpoint; nếu LHS có một cột ngoài result thì hai tuple không bằng nhau trên LHS nên không thể vi phạm FD ấy. Chúng bằng nhau trên X nhưng khác a, cho phản mô hình của X → a. Lập luận giả sử domain cho phép các giá trị cần dùng và không có constraint khác ngoài G.

Nếu kiểm subset/union tốn O(n), một vòng qua m FD tốn O(mn); tối đa O(n) vòng thêm cho cận O(mn²) của cách cài đơn giản này. Bitset hoặc bộ đếm có thể cải thiện. Số bước trên một ví dụ không phải độ phức tạp cho mọi schema.

## Tìm tất cả candidate keys

X là superkey nếu X+ = R. Candidate key còn phải minimal: không proper subset nào của X là superkey. Minimal theo bao hàm khác với nhỏ nhất về số cột; hai key có thể khác độ dài mà không chứa nhau. Primary key là một candidate key được người thiết kế chọn, FD không tự chọn duy nhất một PK.

Một thuộc tính không bao giờ ở RHS của FD nontrivial phải có trong mọi key nếu chỉ dùng G. Điều này giúp giảm ứng viên. Nhưng không được loại mọi thuộc tính từng xuất hiện ở RHS khỏi việc tìm key: trong vòng A → B → C → A, cả A, B, C là singleton keys dù đều ở RHS. Câu gợi ý rút gọn trên slide 20 không phải luật pruning tổng quát.

```text
Keys(R, G):
    keys := empty collection
    for X among subsets of R in increasing size:
        if X contains an already found key: skip
        if Closure(X, G) = R: add X to keys
    return keys
```

Mỗi tập được thêm là superkey và không chứa key nhỏ hơn đã tìm. Mọi proper-subset superkey đều chứa một minimal key đã được xét trước, nên tập được thêm là minimal. Mỗi candidate key không chứa key nhỏ hơn khác, vì thế không bị skip; liệt kê hữu hạn subsets sẽ gặp nó. Thuật toán có thể xét số ứng viên theo 2^n. Nếu cho FD từ tập rỗng thì phải xét cả ∅; các bài số dưới không có empty key.

## Chia bảng giữ gì và có thể mất gì?

Cho Session(course,term,title,teacher), với (course,term) → title và mỗi session có nhiều teacher. Title lặp ở nhiều dòng. Chỉnh một bản mà quên bản khác là update anomaly; xóa teacher cuối có thể làm mất thông tin session; thêm session chưa có teacher khó nếu mỗi row bắt buộc có teacher.

Chiếu thành SessionInfo(course,term,title) và SessionTeacher(course,term,teacher). Cặp chung (course,term) xác định toàn SessionInfo nên join lại không sinh title sai. Mọi tuple gốc có cả hai projection nên luôn được tái dựng. Khi join ghép hai tuple có cùng cặp ấy, FD buộc title giống nhau, nên không thêm tuple giả. Đây là lập luận lossless join theo FD đã nêu.

Sau decomposition, xóa mọi teacher không buộc xóa SessionInfo. Nhưng inner join trở lại view vẫn không hiện session chưa có teacher. Cần query/view phù hợp; “fact được giữ” không có nghĩa mọi view đều hiển thị nó.

Ví dụ lossy: R(A,B,C) = {(1,2,3),(4,2,5)}. Chiếu AB và BC rồi natural join tạo thêm (1,2,5),(4,2,3). Mất thông tin ở đây là mất liên hệ A–C, khiến tập tái dựng có nhiều hàng hơn. Phép tái dựng là natural join theo B, không phải Cartesian product chưa xử lý cột chung. Cần so kết quả với R gốc, không so relation ba cột với một projection hai cột như câu bị nhầm ở slide 30.

Dependency preservation là yêu cầu khác. Với R(A,B,C), G = {AB → C, C → B}, decomposition AC, BC là lossless do C → B; nhưng AB → C không suy chỉ từ các FD local. AC = {(a,c1),(a,c2)}, BC = {(c1,b),(c2,b)} thỏa C → B tại bảng con, còn join vi phạm AB → C. Cần kiểm riêng lossless và khả năng kiểm FD tại các bảng con.

## 1NF, 2NF và 3NF theo grain và mọi key

Trong mô hình quan hệ phẳng, một thuộc tính giữ giá trị atomic theo domain và thao tác đã chọn. Product(item,colors,price,tax) có colors là tập {red,blue} có thể tách ProductColor(item,color), một màu mỗi hàng, và ProductPrice(item,price,tax) nếu giá không phụ thuộc màu. Nếu hai sản phẩm có cùng tên item nhưng khác identity, phải giữ product ID; không xóa các sự kiện trùng hợp lệ chỉ vì tên và giá giống nhau.

Name có dấu cách không tự vi phạm 1NF khi nghiệp vụ coi toàn tên là một giá trị. Tách first/last là lựa chọn mô hình khi cần, không phải mọi tên đều chia được thành hai phần. Comma, bracket hoặc cột phone1/phone2 là dấu hiệu nên xem lại; address hay đoạn text có dấu phẩy vẫn có thể là một giá trị. Khi số phone thay đổi và cần thao tác từng số, Phone(member,phone) thường phù hợp hơn giới hạn hai cột.

Prime attribute nằm trong ít nhất một candidate key; nonprime không nằm trong key nào. 2NF yêu cầu 1NF và mọi nonprime attribute phụ thuộc đầy đủ vào mọi candidate key: không proper subset nào của một key đã xác định nonprime attribute ấy.

Với key (item,color), item → price và item → tax là partial dependencies nên vi phạm 2NF. Tách ProductColor(item,color), ProductPrice(item,price,tax) xử lý phần này. Nếu policy price → tax đúng, ProductPrice còn transitive FD để xét 3NF. Đó là giả định bài, không phải mọi hệ thuế ngoài đời chỉ phụ thuộc giá.

Một PK một cột chưa đủ hứa 2NF trong mọi schema. R(A,B,C,D), G = {A → BCD, BC → A, C → D} có keys A và BC. D là nonprime, phụ thuộc C là proper subset của BC, nên vi phạm 2NF dù chọn PK = A. Nếu mọi candidate key đều singleton và không có FD từ ∅ gây ngoại lệ thì không còn partial dependency kiểu này. Phải dùng đúng tiền đề thay cho lời tắt “PK một cột luôn đạt”.

3NF có điều kiện chính xác: với mỗi FD nontrivial X → a suy từ G, X là superkey hoặc a là prime. BCNF mạnh hơn, yêu cầu X là superkey cho mọi FD nontrivial. Slogan “không nonkey nào phụ thuộc nonkey khác” không thay được tiêu chuẩn khi có nhiều key. Với R(A,B,C), G = {AB → C, C → B}, keys là AB và AC; B prime nên C → B không phá 3NF, nhưng C không superkey nên BCNF không đạt.

Ví dụ Authorship(author_id,isbn,author_name,book_title,royalty) có author_id → author_name, isbn → book_title, (author_id,isbn) → royalty. Tách Author(author_id,author_name), Book(isbn,book_title), Authorship(author_id,isbn,royalty) xử lý hai partial dependencies và giữ royalty theo cặp. Nếu Book còn price,publisher_name,publisher_city và policy publisher_name → publisher_city, tách Publisher(publisher_name,publisher_city), Book(isbn,title,price,publisher_name). Nếu một publisher được phép nhiều city thì FD ấy sai; không chọn một city tùy ý để “chuẩn hóa”.

## Luyện tập

1. Với Teach = {(C,T,Lan),(C,T,Minh)}, kiểm course → title, course → teacher, (course,teacher) → title. Dựng instance bác A → C mà vẫn thỏa AB → C. Vì sao mẫu chưa có phản ví dụ chưa chứng minh business FD?
2. Suy union, pseudotransitivity, accumulation, extension từ ba tiên đề; ghi bước augmentation/transitivity. Phân biệt F+ với A+ và chỉ ra phép tách LHS không hợp lệ.
3. R(A,B,C,D,E,F), G = {AB → C, BC → AD, D → E, CF → B}. Tính AB+, CF+, tìm mọi candidate key và mô tả tập superkeys không minimal. FD có tự chọn PK không?
4. R(A,B,C,D): tìm mọi candidate key và superkeys không minimal cho G1 = {BC → D, D → A, A → B}; G2 = {A → B, A → C, C → D}; G3 = {A → B, B → C, C → D, D → A}; G4 = {AD → B, AB → C, BC → D, CD → A}. Bác danh sách có DD làm key của G4 bằng closure.
5. Với từng hệ câu 3/4, xét 3NF và BCNF sau khi tìm mọi key. Nêu FD vi phạm hoặc giải thích vì sao đạt; không chỉ xét PK đã chọn.
6. Trace update title và xóa teacher cuối sau khi chia Session. Vì sao SessionInfo còn nhưng inner-join view không có row? Dựng lại hai spurious tuples của phép chia AB/BC.
7. Xét name text, colors là tập, phone1/phone2. Trường hợp nào cần thêm ngữ cảnh để kết luận 1NF? Với key (item,color), item → price, price → tax, tìm partial/transitive FD và thiết kế 2NF rồi 3NF.
8. Kiểm R(A,B,C,D), G = {A → BCD, BC → A, C → D}. Chứng minh keys A,BC; D prime hay nonprime? C → D có phá 2NF khi chọn PK=A không?
9. Thiết kế Authorship và Book/Publisher theo FD đã nêu: keys, FK dự kiến, FD local và trường hợp xóa liên kết royalty cuối của một book. Nếu publisher có nhiều city, cần đổi FD và grain thế nào?
10. Với AC/BC của ví dụ dependency preservation, kiểm C → B tại bảng con và AB → C sau join. Đổi ID để tạo ca tương tự và giải thích vì sao lossless không bảo đảm mọi FD được kiểm local.

## Gợi ý

Chốt FD và những instance nghiệp vụ cho phép trước khi nhìn mẫu. Tính closure tới fixpoint, không dừng khi mới nhận vài cột. Thuộc tính không ở RHS giúp giảm ứng viên nhưng vẫn phải kiểm closure và minimality. Với normal form, lập prime/nonprime từ mọi candidate key rồi mới xét FD.

## Đáp án và lập luận

1. Lần lượt đạt, không đạt, đạt trên instance. Course C có hai teacher khác nhau. Instance (1,1,x),(1,2,y) bác A → C nhưng vẫn thỏa AB → C vì hai giá trị AB khác nhau. Mẫu hiện tại có thể chỉ chưa chứa trường hợp được nghiệp vụ cho phép mà làm bác FD.
2. Các chuỗi suy đầy đủ ở bảng Armstrong. F+ chứa các mệnh đề FD, A+ chứa thuộc tính. AB → C không cho A → C hay B → C. Soundness dựa vào equality của hai tuple; proof closure còn dựng phản mô hình khi một thuộc tính không được sinh.
3. AB+ = {A,B,C,D,E}, thiếu F; CF+ = R. F không ở RHS nên bắt buộc. Keys là CF và ABF. Mọi superset của một trong hai key là superkey; bỏ chính hai key thì còn 18 superkeys không minimal trong tổng 20. Không tập F,AF,BF,DF,EF nào đủ; ứng viên không chứa C cần cả A,B,F. Chọn PK là quyết định thiết kế thêm.
4. G1: keys AC,BC,CD; superkeys không minimal là ABC,ACD,BCD,ABCD. G2: chỉ A; bảy proper supersets của A là các superkeys không minimal. G3: A,B,C,D đều là keys; 11 tập có ít nhất hai thuộc tính là superkeys không minimal. G4: keys AB,AD,BC,CD; bốn triples và ABCD là năm superkeys không minimal. DD chỉ là D trong một tập; D+ = {D}, chưa đủ.
5. Câu 3: prime A,B,C,F; nonprime D,E. BC → D và D → E vi phạm 3NF vì determinant không superkey, RHS nonprime; do đó cũng không BCNF. G1: mọi thuộc tính prime nên đạt 3NF; D → A có determinant không superkey nên không BCNF. G2: chỉ A prime; C → D vi phạm 3NF/BCNF. G3 đạt BCNF và 3NF vì mỗi singleton là key. G4 đạt BCNF: mọi rule sinh thuộc tính mới có determinant là key; một tập không superkey không thể kích hoạt rule sinh thêm cột ngoài nó. Suy ra các FD nontrivial đều có determinant đủ mạnh, không chỉ kiểm tên PK.
6. Update title chỉ đổi một row SessionInfo; xóa teacher cuối xóa SessionTeacher nhưng giữ SessionInfo. Inner join cần witness cả hai phía nên không hiện session zero-teacher. Với phép chia lossy, (1,2,5),(4,2,3) là hai hàng giả. Không mất hàng gốc, mà mất thông tin cặp A–C nào thật sự đã đi cùng nhau.
7. Name có dấu cách có thể là một giá trị; colors cần thao tác từng màu thì nên tách; phone1/phone2 là dấu hiệu cần xem cardinality và thao tác, không phải cứ cột có số là sai. Item xác định price rồi tax nên cả hai phụ thuộc một phần của key (item,color). 2NF: ProductColor và ProductPrice. 3NF: ProductPrice(item,price), PriceTax(price,tax) nếu policy price → tax thật. Thời điểm/vùng thuế có thể khiến FD và key cần thay đổi.
8. A+ = R, BC+ = R, B+ không đủ, C+ = {C,D}; keys là A,BC. D nonprime và phụ thuộc C là proper subset của BC, nên phá 2NF dù PK đã chọn là A. Không có key minimal khác dưới tập FD này.
9. Keys Author(author_id),Book(isbn),Authorship(author_id,isbn),Publisher(publisher_name) nếu tên publisher thật sự là key theo brief. Authorship tham chiếu Author/Book, Book tham chiếu Publisher. Xóa liên kết royalty cuối không xóa Book/Author nếu contract giữ chúng độc lập. Publisher nhiều city cần PublisherLocation(publisher_id,city) và bỏ publisher_id → city; không chọn một city tùy ý.
10. AC={(a,c1),(a,c2)}, BC={(c1,b),(c2,b)} đạt C → B tại bảng con. Join có (a,b,c1),(a,b,c2), vi phạm AB → C. C → B làm decomposition lossless trên instance nguồn hợp lệ, nhưng chỉ kiểm các bảng con không bảo đảm mọi cặp trạng thái local mới đều giữ mọi FD gốc. Cần constraint toàn cục hoặc một decomposition đáp ứng preservation phù hợp.

## Biến thể và cách kiểm

Luân phiên chọn cặp bác FD, sắp bước closure, bỏ thuộc tính dư, tìm key còn sót, trace join và sửa phát biểu normal form. Checker tính closure/key trên input, nhận các key khác độ dài và nhiều key; không chấm bằng một PK cố định. Proof được xem theo assumptions, soundness, termination và phản mô hình; các ca hữu hạn không thay proof tổng quát.

## Học trên web

Người học dự đoán thuộc tính được thêm rồi giao một rule hợp lệ. Khi không còn rule, họ chọn fixpoint và giải thích vì sao thuộc tính còn lại chưa được sinh. Bài sau cho FD mới để tự tìm key/normal form không có khung điền sẵn. Canvas decomposition chỉ tính projection/join của model; DDL/FK engine có capability và artifact riêng.

## Nguồn và đối chiếu

Lecture 5 USTH, 45 trang đã đọc cả text và hình. Lời tắt về pruning RHS, atomicity của full name, 2NF chỉ xét một PK, 3NF và typo DD được sửa rõ. AD03–AD08 giữ nội dung thuật toán/lập luận Advanced đã đối chiếu sách; phần này có hoạt động riêng cho cách hỏi FD/key/normal form trong slide. Dataset mẫu không được nhận là định nghĩa mọi FD nghiệp vụ.
