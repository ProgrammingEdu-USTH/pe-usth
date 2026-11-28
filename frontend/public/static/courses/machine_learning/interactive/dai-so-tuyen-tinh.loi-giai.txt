# Linear Algebra · Lời giải bài tập 2.1 và 2.2

Hai bài ở trang in 64, trang PDF 70 của bản *Mathematics for Machine Learning* ngày 15/01/2024. [Trang sách chính thức](https://mml-book.github.io/)

## 2.1 · Từ phép ⋆ sang phép nhân

Phép toán được định nghĩa bởi `a ⋆ b = ab + a + b`, với a và b đều khác −1.

**Thử một số.** Chọn a = 1 và giữ b = 2 như trên hình. Ta có `1 ⋆ 2 = 2 + 1 + 2 = 5`. Cộng 1 vào mỗi đầu vào rồi nhân, ta được `(1 + 1)(2 + 1) = 6`. Hai kết quả cách nhau đúng 1.

Điều này đúng với mọi đầu vào vì `(a + 1)(b + 1) = ab + a + b + 1 = (a ⋆ b) + 1`.

### (a) Chứng minh đây là Abelian group

Đặt `φ(a) = a + 1`. Dịch sang phải một đơn vị đưa tập ℝ∖{−1} sang tập ℝ∖{0}. Dịch ngược sang trái một đơn vị đưa mỗi số về vị trí cũ, nên φ là song ánh. Đẳng thức trên cho `φ(a ⋆ b) = φ(a)φ(b)`.

- **Tính đóng (closure).** Hai số φ(a), φ(b) đều khác 0, nên tích của chúng khác 0. Vậy `a ⋆ b` khác −1.
- **Tính kết hợp và giao hoán.** Qua φ, cả hai cách đặt ngoặc cho cùng tích `φ(a)φ(b)φ(c)`. Đổi chỗ a và b cũng giữ nguyên tích. Vì φ là song ánh, các đẳng thức tương ứng đúng với phép ⋆.
- **Phần tử đơn vị (identity).** `a ⋆ 0 = a`. Số 0 cũng chính là số được φ đưa tới 1, phần tử đơn vị của phép nhân.
- **Phần tử nghịch đảo (inverse).** Muốn kết quả của phép ⋆ bằng 0, hãy chọn b sao cho `φ(a)φ(b) = 1`. Vậy `b = 1/(a + 1) − 1 = −a/(a + 1)`. Giá trị này khác −1.

Vậy tập ℝ∖{−1} cùng phép ⋆ là một group giao hoán, gọi là **Abelian group**.

### (b) Giải 3 ⋆ x ⋆ x = 15

Áp dụng φ cho hai vế để đổi hai phép ⋆ thành phép nhân. Ta được `4(x + 1)² = 16`, tức `(x + 1)² = 4`. Từ `x + 1 = 2` hoặc `x + 1 = −2`, suy ra **x = 1 hoặc x = −3**. Cả hai đều thuộc tập ban đầu.

## 2.2 · Phần dư và tính đóng

**Thử cùng một phép nhân.** Tích 2 × 4 bằng 8. Với `mod 5`, ta đi hết một vòng 5 ô rồi thêm 3 ô, nên phần dư là 3. Với `mod 8`, ta đi hết một vòng 8 ô và trở về 0. Trong câu trắc nghiệm, 3 × 4 = 12 đi hết hai vòng 6 ô, nên phần dư cũng bằng 0.

Ký hiệu [a] là lớp của những số có cùng phần dư với a khi chia cho n. Tập ℤₙ gồm n lớp, có thể gọi tên bằng các phần dư từ 0 đến n − 1.

### (a) Cộng modulo n

Đổi a thành `a + kn` hoặc b thành `b + ℓn` chỉ làm tổng thay đổi một bội của n. Phần dư của tổng giữ nguyên, nên phép cộng được xác định trên các lớp. Kết quả của mỗi phép cộng vẫn là một lớp trong ℤₙ. Tính kết hợp và giao hoán đến từ phép cộng số nguyên. Phần tử đơn vị là [0], còn nghịch đảo của [a] là [−a] vì tổng bằng [0]. Vậy (ℤₙ, ⊕) là **Abelian group** với mọi n ≥ 1.

### (b) Nhân các lớp khác 0 trong modulo 5

Mỗi ô ghi phần dư của tích hai nhãn hàng và cột khi chia cho 5.

```text
⊗ │ 1  2  3  4
──┼────────────
1 │ 1  2  3  4
2 │ 2  4  1  3
3 │ 3  1  4  2
4 │ 4  3  2  1
```

Không ô nào bằng 0, nên tập {1, 2, 3, 4} đóng với phép nhân modulo 5. Phần tử đơn vị là 1. Các ô có giá trị 1 cho các cặp nghịch đảo 1 ↔ 1, 2 ↔ 3 và 4 ↔ 4. Tính kết hợp và giao hoán đến từ phép nhân số nguyên. Vậy các lớp khác 0 tạo thành một **Abelian group**.

### (c) Nhân các lớp khác 0 trong modulo 8

Hai lớp [2] và [4] thuộc tập đang xét. Tích là [8] = [0], nằm ngoài tập. Chỉ một trường hợp như vậy là đủ để chỉ ra phép nhân thiếu tính đóng trên tập này.

### (d) Tổng quát theo n

- **n nguyên tố.** Mỗi a từ 1 đến n − 1 có `gcd(a,n) = 1`. Định lý Bézout cho `au + nv = 1`, nên [u] là nghịch đảo của [a]. Nếu `[a] ⊗ [b] = [0]`, nhân với [u] cho [b] = [0]. Vậy tích hai lớp khác 0 vẫn khác 0. Cùng với phần tử đơn vị [1], tính kết hợp và giao hoán, ta có Abelian group.
- **n hợp số.** Viết `n = ab` với a, b đều nằm từ 2 đến n − 1. Hai lớp [a], [b] khác 0 có tích [0], nên tính đóng thất bại.
- **n = 1.** Tập ℤ₁ chỉ có [0]. Bỏ [0] để lấy các lớp khác 0 thì tập rỗng, thiếu phần tử đơn vị.

Vậy các lớp khác 0 tạo thành group với phép nhân modulo n **khi và chỉ khi n là số nguyên tố**.
