# Một đường thẳng dự đoán thế nào? · Lời giải

Ba câu đầu dùng cùng một bộ tám phép đo. Ta giữ `b = 1` khi tìm đường qua mốc hiệu chuẩn, tính residual và chọn đường dự đoán cuối cùng. Phần ứng dụng dùng lại tám điểm trong một tình huống giả định về điện năng.

## 1. Chọn độ dốc qua mốc hiệu chuẩn

Đường trắng biểu diễn dự đoán `ŷ = wx + b`. Với `b = 1`, mọi phương án đều đi qua `(0; 1)`. Ba phương án `w = 0,45`, `w = 0,75` và `w = 1` cho ba dự đoán khác nhau tại `x = 4`.

Thay `x = 4` và `ŷ = 4` để tìm độ dốc của đường đi qua mốc `(4; 4)`.

```text
4w + 1 = 4
4w = 3
w = 0,75
```

**Đáp án là `w = 0,75`.** Đường này cho dự đoán `ŷ = 4` tại `x = 4`.

## 2. Chọn residual tại x = 4

Ở cùng `x = 4`, đường vừa chọn cho `ŷ = 4` và điểm vàng cho `y = 3,75`.

**Đáp án là `−0,25`.** Theo quy ước của bài, residual là `y − ŷ = 3,75 − 4 = −0,25`. Dấu âm cho biết điểm đo nằm dưới đường dự đoán. Khoảng cách theo trục đứng là `0,25`.

## 3. Chọn một đường cho tám điểm

Ta có thể đưa residual ở câu 2 về `0` bằng cách cho đường đi qua điểm đo `(4; 3,75)`. Giải `4w + 1 = 3,75` được `w = 0,6875`. Để chọn giữa đường này và đường `w = 0,75` từ câu 1, tính trung bình bình phương residual (MSE) trên cả tám điểm.

| x | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Giá trị đo y | 2,25 | 2 | 3,5 | 3,75 | 4,5 | 5,75 | 5,75 | 7,5 |
| Dự đoán tại w = 0,75 | 1,75 | 2,5 | 3,25 | 4 | 4,75 | 5,5 | 6,25 | 7 |
| Residual tại w = 0,75 | 0,5 | −0,5 | 0,25 | −0,25 | −0,25 | 0,25 | −0,5 | 0,5 |
| Residual tại w = 0,6875 | 0,5625 | −0,375 | 0,4375 | 0 | 0,0625 | 0,625 | −0,0625 | 1 |

- `w = 0,75` cho MSE bằng `(4 × 0,5² + 4 × 0,25²)/8 = 0,15625`.
- `w = 0,6875` cho tổng bình phương residual `2,046875` và MSE `2,046875/8 = 0,255859375`.

**Chọn đường `ŷ = 0,75x + 1`.** Khi đổi độ dốc để đi qua phép đo tại `x = 4`, dự đoán ở các điểm còn lại cũng thay đổi. Chẳng hạn, tại `x = 8`, residual tăng từ `0,5` lên `1`. Trên cả tập, đường qua mốc hiệu chuẩn có MSE nhỏ hơn.

### Kiểm tra độ dốc tối ưu bằng least squares

Với `b = 1`, đi đúng qua `(1; 2,25)` cần `w = 1,25`, còn đi đúng qua `(4; 3,75)` cần `w = 0,6875`. Hai điều kiện cần hai giá trị khác nhau cho cùng một biến. Least squares chọn độ dốc có MSE nhỏ nhất trên cả tập.

Công thức least squares một biến cho `w = Σxᵢ(yᵢ − 1) / Σxᵢ²`. Bảng cho tử số `153` và mẫu số `204`, nên `w = 0,75`. Có thể kiểm tra bằng cách đặt `d = w − 0,75`. Khi khai triển bình phương, số hạng bậc nhất theo `d` triệt tiêu vì `Σxᵢrᵢ = 0` với các residual `rᵢ` tại `w = 0,75`. Do đó `MSE(w) = 0,15625 + 25,5d²`, nhỏ nhất tại `d = 0`.

## Ứng dụng · Dự đoán điện năng tiêu thụ

Giả sử `x` là số giờ vận hành của một thiết bị trong ngày và `y` là điện năng tiêu thụ trong ngày, tính bằng kWh. Tám điểm trong bảng là dữ liệu giả định cho ví dụ này. Đường `ŷ = 0,75x + 1` cho điện năng dự đoán `ŷ`.

- `w = 0,75 kWh/giờ` nghĩa là khi thời gian vận hành tăng thêm 1 giờ, điện năng dự đoán tăng thêm 0,75 kWh.
- `b = 1 kWh` là điện năng mô hình dự đoán tại 0 giờ vận hành. Giá trị này do đường dự đoán xác định ở giao điểm với trục đứng.
- MSE lấy trung bình bình phương residual trên cả tám điểm. Khi giữ `b = 1`, đường có `w = 0,75` cho MSE nhỏ hơn đường đi qua đúng phép đo ở 4 giờ, nên ta dùng đường đó cho phần ứng dụng.

Ở 6 giờ, đường cho `ŷ = 0,75 × 6 + 1 = 5,5 kWh`. Giá trị đo là `y = 5,75 kWh`. Đoạn thẳng đứng giữa hai giá trị thể hiện residual `y − ŷ = +0,25 kWh`. Dấu dương cho biết thiết bị tiêu thụ nhiều hơn mức mô hình dự đoán.

## 4. Dự đoán điện năng ở 7 giờ

Thay `x = 7` vào đường đã chọn.

```text
ŷ = 0,75 × 7 + 1
  = 5,25 + 1
  = 6,25 kWh
```

**Đáp án là `6,25 kWh`.** Độ dốc cho phần điện năng gắn với 7 giờ vận hành. Cộng thêm hệ số chặn để ra dự đoán cả ngày.

## 5. Tính residual ở 7 giờ

Khi đo được `5,75 kWh`, lấy giá trị đo trừ giá trị dự đoán ở câu 4.

```text
y − ŷ = 5,75 − 6,25 = −0,50 kWh
```

**Đáp án là `−0,50 kWh`.** Dấu âm cho biết thiết bị tiêu thụ ít hơn dự đoán 0,50 kWh.

Quay lại [bài tương tác](bai-tap.html) hoặc xem [hướng dẫn](README.md).

## Nguồn nội dung

- *Mathematics for Machine Learning*, bản thảo 15/01/2024. §2.1, trang in 19–21, mô tả hệ phương trình và trường hợp không có nghiệm chung. §9.1–9.2, trang in 291–295, trình bày mô hình dự đoán và tổng bình phương sai số. [Trang sách chính thức](https://mml-book.github.io/)
- Giáo trình AI/ML Engineer USTH, mục **C1.01 · Linear Regression: từ phương trình đến loss**, và ngân hàng 603 câu, mục **ML04 · Hồi quy tuyến tính đơn biến và hàm mất mát**. Bài dùng quy ước C1.01 `residual = y − ŷ`. ML04 dùng `ŷ − y` và tính cost bằng một nửa MSE. Đổi dấu residual giữ nguyên bình phương của nó.
- Ví dụ dùng dữ liệu giả định. Việc kết hợp số đo công tơ với hồi quy là một ứng dụng trong theo dõi tiêu thụ điện. [Bộ Năng lượng Hoa Kỳ](https://www.energy.gov/cmei/femp/measurement-and-verification-options-federal-energy-and-water-saving-projects) · [EIA về đơn vị kWh](https://www.eia.gov/energyexplained/electricity/measuring-electricity.php)
