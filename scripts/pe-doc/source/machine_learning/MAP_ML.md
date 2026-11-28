# Bản đồ giáo trình Machine Learning PE

Nguồn duy nhất của bản đồ này là `Giao_Trinh_Machine_Learning_PE.docx`. Mức độ:
`B` = cơ bản, `I` = trung cấp, `N` = nâng cao. Tiên quyết giữ theo mục “Đã học”
trong tài liệu; riêng `ML28` được rút gọn thành các năng lực trực tiếp thay vì ghi
toàn bộ chuỗi `ML01–ML27`.

## Tổng quan

| Module | Nội dung | Bài |
|---|---|---|
| M1 | Cơ sở toán học, dữ liệu và tiền xử lý | ML01–ML03 |
| M2 | Hồi quy tuyến tính và tối ưu hóa | ML04–ML08 |
| M3 | Phân loại và tối ưu bậc hai | ML09–ML12 |
| M4 | Đánh giá mô hình và điều chuẩn | ML13–ML18 |
| M5 | Mạng nơ-ron nhân tạo | ML19–ML22 |
| M6 | Học không giám sát, cây quyết định và ensemble | ML23–ML28 |

13 bài trọng tâm được DOCX đánh dấu: `ML02`, `ML05`, `ML07`, `ML09`, `ML11`,
`ML15`, `ML18`, `ML21`, `ML22`, `ML23`, `ML25`, `ML27`, `ML28`.

## Bản đồ 28 bài

| Mã | Module | Mục tiêu học tập | Mức | Khái niệm chính | Tiên quyết |
|---|---|---|---|---|---|
| ML01 | M1 | Biểu diễn mẫu thành vector và tập dữ liệu thành ma trận có shape xác định. | B | mẫu; thuộc tính; không gian vector; ma trận dữ liệu; shape | — |
| ML02 | M1 | Tính thống kê mô tả và dựng, diễn giải ma trận hiệp phương sai. | I | trung bình; phương sai mẫu; hiệp phương sai; ma trận PSD; trừ tâm | ML01 |
| ML03 | M1 | Áp dụng scaling và dùng tham số học từ train cho dữ liệu mới. | B | Min–Max; mean normalization; Z-score; data leakage; tham số scaling | ML01, ML02 |
| ML04 | M2 | Mô hình hóa hồi quy đơn biến và tính hàm chi phí bình phương. | B | giả thuyết tuyến tính; residual; least squares; hàm lồi; MSE có hệ số 1/2 | ML01 |
| ML05 | M2 | Tính gradient và thực hiện một bước Batch GD cập nhật đồng thời. | I | gradient; learning rate; cập nhật đồng thời; hội tụ; phân kỳ | ML04 |
| ML06 | M2 | Phân biệt Batch, SGD, mini-batch và tạo batch dữ liệu. | I | Batch GD; SGD; mini-batch; permutation; nhiễu gradient | ML05 |
| ML07 | M2 | Viết hồi quy đa biến dạng ma trận và giải bằng normal equations. | N | design matrix; bias; normal equations; khả nghịch; đa cộng tuyến | ML04, ML05 |
| ML08 | M2 | Tạo đặc trưng đa thức và giải thích nguy cơ quá khớp khi tăng bậc. | I | polynomial features; basis expansion; design matrix; bậc đa thức; overfitting | ML07 |
| ML09 | M3 | Tính sigmoid, xác suất và ranh giới quyết định tuyến tính/phi tuyến. | I | logistic regression; sigmoid; logit; decision boundary; ngưỡng 0.5 | ML04 |
| ML10 | M3 | Tính cross-entropy và gradient cho hồi quy logistic. | I | binary cross-entropy; log loss; gradient; clipping xác suất; xác suất dự báo | ML09 |
| ML11 | M3 | Dựng gradient, Hessian và một bước Newton đa biến. | N | Newton–Raphson; Hessian; độ cong; nghịch đảo ma trận; hội tụ bậc hai | ML10 |
| ML12 | M3 | Phân loại bằng k-NN từ khoảng cách và biểu quyết láng giềng. | I | lazy learning; khoảng cách Euclid; Manhattan; nearest neighbors; majority vote | ML01 |
| ML13 | M4 | Tổ chức train/validation/test và thực hiện K-fold/LOOCV đúng vai trò. | I | train set; validation set; test set; K-fold; LOOCV; leakage | ML04 |
| ML14 | M4 | Tính và diễn giải MAE, MSE, RMSE và R². | B | MAE; MSE; RMSE; R²; residual | ML04 |
| ML15 | M4 | Tính metric phân loại từ confusion matrix và chọn metric theo chi phí lỗi. | I | TP/FP/FN/TN; accuracy; precision; recall; F1 | ML09 |
| ML16 | M4 | Giải thích sự thay đổi TPR/FPR theo threshold và ý nghĩa AUC. | I | ROC; AUC; TPR; FPR; threshold | ML15 |
| ML17 | M4 | Chẩn đoán underfitting/overfitting qua sai số train và dữ liệu mới. | I | bias; variance; generalization; model complexity; feature selection | ML08, ML13 |
| ML18 | M4 | Thêm phạt L2, không phạt bias và giải thích hiệu ứng shrinkage. | N | L2 regularization; Ridge; shrinkage; lambda; underfitting | ML17, ML05 |
| ML19 | M5 | Tính net input và thiết kế perceptron cho một cổng logic. | B | perceptron; trọng số; bias; step function; cổng AND | ML09 |
| ML20 | M5 | So sánh sigmoid, tanh, ReLU và vai trò phi tuyến/đạo hàm. | I | activation; sigmoid; tanh; ReLU; vanishing gradient; khả vi | ML19 |
| ML21 | M5 | Tính lan truyền tiến qua tầng ẩn và tầng ra với shape nhất quán. | N | MLP; hidden layer; affine transform; activation; feed-forward | ML20 |
| ML22 | M5 | Tính delta và gradient trọng số bằng quy tắc chuỗi. | N | backpropagation; chain rule; delta; gradient trọng số; sigmoid derivative | ML21 |
| ML23 | M6 | Thực hiện một vòng Lloyd K-Means và theo dõi SSE nội cụm. | N | K-Means; centroid; assignment; centroid update; SSE; cực tiểu địa phương | ML01 |
| ML24 | M6 | Đánh giá phân cụm bằng so sánh cặp và phân biệt internal/external validation. | I | Rand Index; Jaccard; pair counting; internal validation; external validation | ML23 |
| ML25 | M6 | Thực hiện PCA qua trừ tâm, covariance, eigen decomposition và projection. | N | PCA; covariance; eigenvalue; eigenvector; explained variance; projection | ML02 |
| ML26 | M6 | Tính impurity và chọn split cho cây quyết định. | N | decision tree; Gini; entropy; impurity decrease; information gain | ML01 |
| ML27 | M6 | Giải thích Bagging và Random Forest giảm phương sai bằng bootstrap và feature subsampling. | N | ensemble; bootstrap; bagging; random subspace; Random Forest; decorrelation | ML26 |
| ML28 | M6 | Thiết kế và kiểm thử pipeline định giá/phân loại nhà từ dữ liệu đầu vào tới đánh giá. | N | preprocessing; regression; classification; validation; input contract; capstone | ML03, ML07, ML09, ML13, ML15 |

## Ghi chú chuyển sang S1–S4

- Bài `B`: S1 dùng ví dụ số nhỏ; S3 có 2–3 slot; S4 kiểm tra phép tính cơ bản.
- Bài `I`: thêm predict/misconception, trace và bài sửa lỗi; S4 có edge case.
- Bài `N`: giảm scaffold, buộc giải thích giả định số học và kiểm tra singularity,
  shape, lớp rỗng hoặc dữ liệu mất cân bằng.
- `ML28` phù hợp gate/capstone, nhưng chỉ sau khi implementation contract được
  thu hẹp hoặc code được bổ sung để thực sự đáp ứng pipeline đã tuyên bố.
