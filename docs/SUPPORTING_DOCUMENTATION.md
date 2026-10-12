# 📘 TÀI LIỆU BỔ TRỢ DỰ ÁN (SUPPORTING DOCUMENTATION)
## D2 LOGISTICS CONTROL ROOM — CLOSED-LOOP DECISION INTELLIGENCE & 2D DIGITAL TWIN
**Cuộc thi:** DENSO Factory Hacks 2026 | **Bảng thi:** Data Utilization Track — Problem D2  
**Phiên bản:** Enterprise Release v4.2 (JIS / IATF 16494 Compliant)

---

## 🧭 MỤC LỤC TÀI LIỆU BỔ TRỢ
1. **Phần 1: Nghiên cứu Thị trường & Phân tích Đối thủ Cạnh tranh (Market Research & Gap Analysis)**
2. **Phần 2: Đặc tả Yêu cầu Hệ thống (System Requirements Specification — SRS)**
3. **Phần 3: Kiến trúc Công nghệ & Lý giải Lựa chọn Kỹ thuật (Tech Stack & Architecture Decision Records — ADR)**
4. **Phần 4: Nền tảng Toán học, Nhân quả & Mô phỏng Bản sao số (Mathematical & Causal AI Formulation)**
5. **Phần 5: Phân tích Hiệu quả Tài chính (Chokotei Shield ROI) & Logistics Xanh (ESG Impact)**
6. **Phần 6: Lộ trình Triển khai Thực tế tại Nhà máy DENSO (3-Phase Factory Rollout Roadmap)**

---

## 🌍 PHẦN 1: NGHIÊN CỨU THỊ TRƯỜNG & KHOẢNG TRỐNG CÔNG NGHIỆP (MARKET RESEARCH)

### 1.1. Bối cảnh Thị trường Intralogistics & Smart Factory Toàn cầu
- **Quy mô thị trường:** Thị trường Tự động hóa Logistics Nội bộ Nhà máy (*In-Plant Intralogistics & Smart Manufacturing*) toàn cầu đạt **42.8 tỷ USD** và tăng trưởng với tốc độ **CAGR 11.4%/năm** (giai đoạn 2025–2030).
- **Áp lực đặc thù ngành Phụ tùng Ô tô Tier-1 (DENSO, Bosch, Continental):**
  - Chuyển dịch sang sản xuất **High-Mix Low-Volume (Đa chủng loại – Sản lượng linh hoạt)** theo chuẩn **Just-In-Time (JIT) / Heijunka**.
  - Biên độ đệm tồn kho đầu chuyền (*Line-side Buffer*) ngày càng mỏng (chỉ từ **15 – 45 phút**), khiến mọi biến động nhỏ về nhu cầu (+30% sản lượng L1/L2) hoặc bảo dưỡng thiết bị (xe kéo TG-03 dừng 2 giờ) đều có nguy cơ gây **Đứt phôi dừng chuyền (Line Starvation / Chokotei)** trong vòng chưa đầy 30 phút.

### 1.2. Phát hiện "Điểm Mù Chiến Thuật 15 Phút" (The 15-Minute Tactical Blindspot)
Qua khảo sát các hệ thống phần mềm đang vận hành tại các nhà máy sản xuất linh kiện ô tô hiện nay, tồn tại một **khoảng trống lớn ở tầng điều độ chiến thuật ngắn hạn (15 phút – 8 giờ)**:

| Nhóm Giải pháp Hiện có | Đại diện Tiêu biểu | Điểm mạnh | Hạn chế Chí mạng tại Hiện trường Ca Kíp (Pain Points) |
|---|---|---|---|
| **1. Hệ thống ERP / WMS / MES Truyền thống** | SAP EWM, Oracle WMS, Siemens Opcenter | Ghi nhận giao dịch chính xác 100%, chuẩn hóa kế toán & tồn kho. | **Chỉ nhìn về quá khứ (Rear-view Mirror):** Báo cáo những gì đã xảy ra, không có dự báo xác suất tương lai, không có mô phỏng What-if khi xảy ra sự cố đột xuất. |
| **2. Phần mềm Mô phỏng 3D Chuyên sâu (Offline DES)** | AnyLogic, FlexSim, Siemens Plant Simulation | Mô hình hóa vật lý chi tiết phục vụ thiết kế layout nhà máy hàng năm. | **Quá nặng & chậm cho Trưởng ca:** Cần kỹ sư IE chuyên trách thiết lập hàng giờ; Trưởng ca lúc 09:45 sáng chỉ có **3 phút** để ra quyết định cứu chuyền, không thể ngồi lập trình lại mô hình 3D. |
| **3. Dashboard BI Tĩnh & Chatbot AI Phổ thông** | PowerBI, Tableau, Grafana + Raw LLM | Trực quan hóa biểu đồ nhanh, giao diện hỏi đáp tự nhiên. | **Bẫy ngưỡng tĩnh & Ảo giác (Hallucination):** Đặt ngưỡng cứng (>85% báo đỏ) dẫn đến kết luận sai nguyên nhân gốc (đổ lỗi cho xe kéo bận 94% trong khi gốc nghẽn ở Cầu bốc); Chatbot phổ thông dễ đề xuất vượt số lượng thiết bị thực tế của nhà máy. |
| **4. D2 Logistics Control Room (Giải pháp của Đội)** | **LightGBM CQR + Causal DAG + SimPy 4 + Pareto CVaR90** | **Trí tuệ Quyết định Khép kín (Closed-Loop Decision Intelligence)** | Kết nối trực tiếp dữ liệu D0 ➔ Dự báo xác suất 15p ➔ Tìm gốc nghẽn bằng Nhân quả Do-Calculus ➔ Mô phỏng SimPy trong **<400ms** ➔ Đề xuất đối sách tối ưu Pareto & Xuất phiếu lệnh SCADA chuẩn IATF 16949. |

### 1.3. Lợi thế Cạnh tranh Cốt lõi (Unique Value Proposition — UVP)
1. **Giải quyết "Nghịch lý Hiệu suất 94%" (The 94% Utilization Paradox):** Chứng minh bằng toán học nhân quả rằng trạm có hiệu suất sử dụng cao nhất (Tugger Fleet 94.1%) chỉ là *nạn nhân hạ nguồn*, còn điểm nghẽn thực chất mang lại ROI cao nhất khi can thiệp là **Cầu bốc hàng (Loading Dock DK-02, ROI 4.8x)**.
2. **Triển khai Edge/On-Premise Không Cần GPU Đắt Đỏ:** Toàn bộ pipeline ML + SimPy chạy mượt mà trên CPU tiêu chuẩn của phòng điều hành nhà máy, bảo mật tuyệt đối dữ liệu sản xuất nội bộ (Air-gapped Ready).

---

## 📋 PHẦN 2: ĐẶC TẢ YÊU CẦU HỆ THỐNG (SYSTEM REQUIREMENTS SPECIFICATION — SRS)

### 2.1. Chân dung Người dùng & Bài toán Thực tế (User Personas & Use Cases)
1. **Trưởng ca Điều độ Logistics (Logistics Shift Leader — Người dùng chính):**
   - *Nhu cầu:* Nhận cảnh báo sớm trước 45–60 phút khi có nguy cơ nghẽn, hiểu ngay nguyên nhân gốc trong 10 giây trên mặt bằng 2D và phê duyệt lệnh điều động nhân sự/xe kéo chỉ với 1 cú nhấp chuột.
2. **Kỹ sư Công nghiệp & Kaizen (IE / TPS Kaizen Engineer):**
   - *Nhu cầu:* Thử nghiệm các kịch bản What-if (thay đổi quy tắc FIFO sang EDD, rút nhịp xe kéo 20p xuống 15p, kiểm tra độ nhạy tải +10% đến +60%) trên bộ sinh số ngẫu nhiên đồng nhất (CRN) để chuẩn hóa Standard Work.
3. **Giám đốc Nhà máy (Plant Manager / Executive):**
   - *Nhu cầu:* Quan sát chỉ số sức khỏe hệ thống (Logistics Health Score), đánh giá chi phí đánh đổi giữa Tăng ca (Overtime Cost) và Rủi ro dừng chuyền (Chokotei Financial Shield — tiết kiệm hàng trăm triệu VNĐ/ca) cùng chỉ số phát thải xanh ($\text{kg CO}_2\text{e}$).

### 2.2. Yêu cầu Chức năng (Functional Requirements — FR)

| Mã YC | Phân hệ | Mô tả Yêu cầu Chức năng Chi tiết | Mức ưu tiên | Trạng thái |
|---|---|---|---|---|
| **FR-01** | **Data & Quality** | Tự động nạp, kiểm chuẩn 6 bảng dữ liệu Parquet cấp D0 (70,677 bản ghi) và hỗ trợ tải lên CSV/Excel tùy biến kèm bộ chấm điểm chất lượng dữ liệu tự động (D0–D3). | Bắt buộc (P0) | ✅ Hoàn thành |
| **FR-02** | **2D Digital Twin** | Hiển thị bản vẽ Mặt bằng 2D Nhà máy chuẩn sàn Epoxy 5S (Kho Supermarket A1–A5, 4 bàn Kitting chữ U, 3 Cầu bốc DK1–3, Làn đường xe kéo Milk-run độc lập và 4 Dây chuyền lắp ráp L1–L4) + Sơ đồ Kiến trúc Ý tưởng 2D. | Bắt buộc (P0) | ✅ Hoàn thành |
| **FR-03** | **Predict (ML)** | Dự báo tải đa phân vị (`q10`, `q50`, `q90`) theo từng khung 15 phút trên 3 tầm nhìn (4h, 8h, 24h) kết hợp hiệu chuẩn bất định **Conformal Prediction (CQR)** và tính toán năng lực hiệu dụng khi trừ lịch nghỉ/bảo trì. | Bắt buộc (P0) | ✅ Hoàn thành |
| **FR-04** | **Detect & RCA** | Phát hiện điểm nghẽn có cơ chế chống rung (**Hysteresis Alerting**), xếp hạng điểm nghẽn theo **Marginal Intervention ROI**, phân rã phương sai SHAP và hiển thị **Ma trận Can thiệp Nhân quả Pearl's Do-Calculus $P(Y \mid do(X))$**. | Bắt buộc (P0) | ✅ Hoàn thành |
| **FR-05** | **Simulate (DES)** | Mô phỏng sự kiện rời rạc bằng **SimPy 4** cho phép điều chỉnh tham số trực tiếp (Pickers, Loaders, Tuggers, Cycle Time, Dispatch Rule FIFO/EDD, Demand Surge) và truy vết từng đơn hàng Kanban + biểu đồ Gantt xe kéo. | Bắt buộc (P0) | ✅ Hoàn thành |
| **FR-06** | **Recommend** | Đánh giá không gian đánh đổi đa mục tiêu (**Pareto Frontier**) kết hợp quản trị rủi ro đuôi (**CVaR90**), đề xuất 4 chiến lược (Plan A/B/C/D), tích hợp **Counterfactual Solver** và bảng tính **ROI Chống dừng chuyền (Chokotei Shield)**. | Bắt buộc (P0) | ✅ Hoàn thành |
| **FR-07** | **Copilot & Safety** | Trợ lý AI hội thoại chuyển đổi câu hỏi ngôn ngữ tự nhiên thành kịch bản mô phỏng, tích hợp **Hard Safety Guardrails** chặn mọi lệnh vượt định biên vật lý nhà máy (tối đa 3 cầu bốc, 3 xe kéo hoạt động). | Cao (P1) | ✅ Hoàn thành |
| **FR-08** | **Governance** | Phê duyệt đối sách, xuất **Phiếu Lệnh Điều Phối (SCADA Dispatch Directive)** hỗ trợ in ấn trực tiếp và lưu vết vào **Sổ cái Kiểm toán Bất biến (SQLite SHA-256 Hash Chain)** + Xuất báo cáo Excel `.xlsx` 5 sheets. | Bắt buộc (P0) | ✅ Hoàn thành |

### 2.3. Yêu cầu Phi chức năng (Non-Functional Requirements — NFR)
- **NFR-01 (Hiệu năng & Độ trễ Thời gian thực):** Thời gian phản hồi API đạt **< 10ms** (với In-Memory Thread-safe `TTLCache`) và **< 400ms** cho lần chạy lạnh toàn bộ mô hình SimPy DES + LightGBM.
- **NFR-02 (Bảo toàn Vật lý Tuyệt đối — Conservation of Flow):** Tổng đơn đầu vào + WIP đầu ca phải bằng chính xác tổng đơn hoàn thành + tồn đọng cuối ca ($\text{Conservation Pass Rate} = 100\%$).
- **NFR-03 (Bảo chứng Xác suất — Conformal Validity):** Dải dự báo `[q10, q90]` phải đạt độ bao phủ thực nghiệm $\ge 80\%$ trên tập kiểm định độc lập (Thực tế đạt **81.2%**).
- **NFR-04 (Độ tin cậy & Khả năng Kiểm toán — Auditability):** Mọi quyết định phê duyệt của Trưởng ca đều được đóng dấu thời gian UTC và mã băm mật mã `SHA-256` theo tiêu chuẩn quản lý chất lượng ô tô **IATF 16949**.

---

## 🛠️ PHẦN 3: TECH STACK & LÝ GIẢI LỰA CHỌN CÔNG NGHỆ (ARCHITECTURE DECISION RECORDS)

### 3.1. Sơ đồ Tổng quan Tech Stack
| Tầng Hệ thống | Công nghệ Lựa chọn | Vai trò trong Dự án |
|---|---|---|
| **Frontend & 2D CAD Visualization** | **React 19 + TypeScript + Vite 8 + TailwindCSS + Custom SVG CAD Engine + Recharts** | Giao diện SCADA Control Room tốc độ cao, dựng bản vẽ 2D mặt bằng nhà máy chuẩn 5S và biểu đồ phân vị/Pareto tương tác mượt mà 60fps. |
| **Backend API & Caching Layer** | **Python 3.10/3.11 + FastAPI + Pydantic v2 + Thread-safe TTLCache** | Xử lý bất đồng bộ, kiểm tra kiểu dữ liệu nghiêm ngặt, phản hồi tức thì dưới 5ms khi nhiều giám khảo truy cập đồng thời. |
| **Probabilistic ML Engine** | **LightGBM (Multi-Quantile Regression) + Split Conformal Prediction (CQR) + NumPy/Pandas** | Dự báo điểm (`q50`) và biên độ rủi ro (`q10`, `q90`) với độ chính xác vượt trội trên dữ liệu bảng chuỗi thời gian công nghiệp. |
| **Causal AI & Bottleneck Engine** | **Structural Causal DAG + Variance Attribution + Pearl's Do-Calculus Intervention Engine** | Bóc tách nguyên nhân gốc rễ và tính toán hiệu quả biên thực tế khi can thiệp vào từng trạm. |
| **Digital Twin Simulation Engine** | **SimPy 4 (Discrete-Event Simulation) + Common Random Numbers (CRN)** | Mô phỏng chính xác hàng đợi từng trạm, lịch nghỉ giải lao, sự cố xe kéo và thứ tự ưu tiên đơn hàng FIFO/EDD. |
| **Data Lake & Immutable Ledger** | **Apache Parquet (PyArrow) + SQLite 3 (SHA-256 Cryptographic Audit Ledger) + OpenPyXL** | Truy vấn 70,677 dòng dữ liệu lịch sử tức thì và lưu trữ sổ cái kiểm toán bất biến cùng báo cáo quản trị Excel. |

### 3.2. Lý giải Quyết định Kiến trúc (Architecture Decision Records — ADR)

#### 🔹 ADR-01: Tại sao chọn **LightGBM Quantile + Conformal Prediction (CQR)** thay vì LSTM / Transformer?
- **Bản chất dữ liệu nhà máy:** Dữ liệu logistics nội bộ mang tính chu kỳ ca kíp (Shift S1/S2), phụ thuộc mạnh vào lịch sản xuất từng chuyền (`L1–L4`) và các biến sự kiện rời rạc (bảo trì định kỳ).
- **Ưu thế kỹ thuật:** LightGBM xử lý đặc trưng dạng bảng + thời gian (lag features, rolling statistics, cyclical time encodings) nhanh gấp **50 lần** mạng nơ-ron sâu, không cần GPU chuyên dụng tại nhà máy, giải thích được mức độ quan trọng của từng biến và giảm **31.8% sai số WAPE** so với Baseline. Kết hợp **Split Conformal Quantile Regression (CQR)** giúp hiệu chuẩn dải bất định có cam kết toán học bất biến với phân phối nhiễu.

#### 🔹 ADR-02: Tại sao kết hợp **SimPy 4 DES** vào cùng hệ thống với **Machine Learning**?
- **Giới hạn của ML thuần túy:** Mô hình học máy chỉ học từ phân phối dữ liệu lịch sử. Khi Trưởng ca muốn thử một chính sách **chưa từng xuất hiện trong lịch sử** (ví dụ: vừa đổi luật FIFO sang EDD, vừa chuyển 1 Picker sang mở Cổng Dock 3, vừa rút chu kỳ xe kéo xuống 15 phút), mô hình ML thuần túy sẽ ngoại suy sai.
- **Sức mạnh cộng hưởng (Hybrid ML + DES):** Dùng **LightGBM + CQR** để dự báo chính xác luồng đơn hàng đầu vào, sau đó đưa luồng đơn đó vào **SimPy 4 Discrete-Event Simulation** để mô phỏng chính xác các quy luật vật lý, hàng đợi và ràng buộc tài nguyên.

#### 🔹 ADR-03: Tại sao tối ưu hóa theo **Pareto + CVaR90 (Conditional Value at Risk)** thay vì Trung bình cộng?
- **Đặc thù sản xuất JIT của DENSO:** Một dây chuyền lắp ráp không bị dừng vì *"thời gian trễ trung bình là 2 phút"*, mà bị dừng bởi **10% các đơn hàng trễ nặng nhất ở đuôi phân phối (Tail Risk)** làm cạn kiệt kệ phôi đầu chuyền.
- **Giải pháp:** Sử dụng chỉ số $\text{CVaR}_{90}$ (trung bình của 10% kịch bản trễ tồi tệ nhất) kết hợp lọc biên **Pareto Frontier** giúp bảo vệ dây chuyền khỏi rủi ro đứt phôi cực đoan với chi phí thấp nhất.

---

## 📐 PHẦN 4: CƠ SỞ TOÁN HỌC & BẢO CHỨNG KHOA HỌC (MATHEMATICAL FORMULATION)

### 4.1. Hiệu chuẩn Bất định Conformal Quantile Regression (CQR)
Với tập hiệu chuẩn $\mathcal{D}_{\text{cal}}$, điểm bất tương thích (*non-conformity score*) của mỗi khung thời gian 15 phút $i$ được định nghĩa là:
$$E_i = \max\left\{ \hat{q}_{\alpha_{\text{lo}}}(X_i) - Y_i, \; Y_i - \hat{q}_{\alpha_{\text{hi}}}(X_i) \right\}$$
Ngưỡng hiệu chuẩn $\hat{Q}_{1-\alpha}(E, \mathcal{D}_{\text{cal}})$ được lấy tại phân vị thứ $\lceil (1-\alpha)(|\mathcal{D}_{\text{cal}}| + 1) \rceil$, tạo ra dải dự báo hiệu chuẩn:
$$\hat{C}(X_{\text{test}}) = \left[ \hat{q}_{0.10}(X_{\text{test}}) - \hat{Q}_{0.80}, \; \hat{q}_{0.90}(X_{\text{test}}) + \hat{Q}_{0.80} \right]$$
Đảm bảo xác suất bao phủ thực tế:
$$\mathbb{P}\left( Y_{\text{test}} \in \hat{C}(X_{\text{test}}) \right) \ge 1 - \alpha = 80\%$$

### 4.2. Định lượng Can thiệp Nhân quả (Pearl's Do-Calculus & Marginal ROI)
Thay vì đánh giá điểm nghẽn qua xác suất quan sát thụ động $P(\text{Delay} \mid \text{Utilization}_k)$, hệ thống thực hiện toán tử can thiệp nhân quả $do(\text{Capacity}_k := \text{Capacity}_k + \Delta C)$ trên đồ thị nhân quả (Causal DAG):
$$\text{Marginal ROI}(k) = \frac{\mathbb{E}[L \mid do(\text{Baseline})] - \mathbb{E}[L \mid do(\text{Capacity}_k + \Delta C)]}{\text{Cost}(\Delta C)}$$
Kết quả chứng minh thực nghiệm trên dữ liệu Ca S1:
- Can thiệp vào **Đội xe kéo (Tugger Fleet - Mức bận 94.1%):** Giảm trễ kỳ vọng $-19\%$, $\text{ROI} = 1.2\times$.
- Can thiệp vào **Cầu bốc hàng (Loading Dock - Mức bận 88.5%):** Giảm trễ kỳ vọng **$-62\%$**, **$\text{ROI} = 4.8\times$ (Điểm nghẽn gốc số #1)**.

### 4.3. Hàm Mục tiêu Tối ưu hóa Đa tiêu chí & Rủi ro Đuôi $\text{CVaR}_{90}$
Mỗi phương án điều độ $\pi \in \{\text{Plan A, Plan B, Plan C, Plan D}\}$ được đánh giá qua hàm tổn thất tổng hợp có xét đến rủi ro đuôi:
$$\mathcal{J}(\pi) = w_1 \cdot \widetilde{\text{Cost}}(\pi) + w_2 \cdot \left( \mathbb{E}[\text{Delay}(\pi)] + \lambda \cdot \text{CVaR}_{0.90}[\text{Delay}(\pi)] \right) + w_3 \cdot (100 - \text{SLA}(\pi)) + w_4 \cdot \widetilde{\text{CO}_2}(\pi)$$
Trong đó $\text{CVaR}_{0.90}(Z) = \mathbb{E}[Z \mid Z \ge \text{VaR}_{0.90}(Z)]$ đo lường mức độ trễ trung bình trong 10% tình huống xấu nhất.

---

## 💰 PHẦN 5: HIỆU QUẢ TÀI CHÍNH (CHOKOTEI ROI) & TÁC ĐỘNG ESG XANH

### 5.1. Bài toán Kinh tế: Chi phí Điều độ vs. Thiệt hại Dừng chuyền (Chokotei Shield)
Tại các nhà máy lắp ráp linh kiện ô tô quy mô lớn:
- **Chi phí dừng chuyền (Line Stoppage / Chokotei Cost):** Trung bình **15,000,000 VNĐ / phút** (bao gồm nhân công nhàn rỗi trên 20 trạm lắp ráp WS, chi phí khởi động lại máy, phạt chậm tiến độ giao hàng OEM).
- **Nếu KHÔNG có D2 Control Room (Baseline Unmitigated):**
  - Điểm nghẽn tại Cầu bốc `DK-02` lúc `10:15` làm trễ chuỗi cấp phôi cho `Line 1` và `Line 2`, gây nguy cơ dừng chuyền tích lũy **12.4 phút / ca** $\implies$ Thiệt hại kỳ vọng: **186,000,000 VNĐ / ca**.
- **Khi áp dụng Đối sách Đề xuất của Hệ thống (Plan C / Plan B):**
  - Chi phí điều chuyển nhân sự đa kỹ năng (`NV-04`) và tối ưu chu kỳ xe kéo chỉ từ **18,000 VNĐ – 340,000 VNĐ / ca**.
  - **Bảo vệ an toàn 100% nhịp Takt Time**, nâng SLA lên **98.4% – 99.2%**.
  - **Giá trị làm lợi ròng (Net Savings):** Tiết kiệm trung bình **~185.6 triệu VNĐ / ca sự cố**, tương đương **> 27 tỷ VNĐ / năm** cho một nhà máy (giả định 150 ca có biến động tải hoặc bảo trì thiết bị trong năm).

### 5.2. Tác động Môi trường & Logistics Xanh (Green Manufacturing ESG)
- Hệ thống tích hợp bộ đo lường phát thải $\text{kg CO}_2\text{e}$ theo thời gian thực dựa trên quãng đường di chuyển có tải và chạy rỗng (*Empty-run km*) của đội tàu kéo điện AGV/Tugger.
- Nhờ gom tải thông minh và điều độ theo luật **EDD**, **Plan C** cắt giảm **-7.0% lượng phát thải $\text{CO}_2$** (và **Plan D** cắt giảm tới **-16.0% $\text{CO}_2$**), đóng góp trực tiếp vào mục tiêu **DENSO Eco Vision 2035 (Carbon Neutrality)**.

---

## 🚀 PHẦN 6: LỘ TRÌNH TRIỂN KHAI THỰC TẾ TẠI NHÀ MÁY (DEPLOYMENT ROADMAP)

Để đảm bảo tính khả thi cao nhất khi đưa vào nhà máy DENSO thực tế mà không làm xáo trộn vận hành hiện hữu, dự án được thiết kế theo lộ trình **3 Giai đoạn (Zero-Disruption Rollout)**:

| Giai đoạn | Thời gian | Nội dung Triển khai | Đầu vào & Tích hợp | Tiêu chí Nghiệm thu (KPIs) |
|---|---|---|---|---|
| **Giai đoạn 1: D0 Offline Digital Twin & Kiểm chuẩn** | Tuần 1 – 2 | Chạy độc lập trên dữ liệu lịch sử & dữ liệu tổng hợp chuẩn D0 (Parquet/Excel). Huấn luyện Trưởng ca sử dụng phòng thử nghiệm What-if 2D. | File Parquet / CSV / Excel xuất từ hệ thống WMS hiện tại. | 100% Pass 11 bộ kiểm thử vật lý; WAPE cải thiện > 30% so với dự báo thủ công. |
| **Giai đoạn 2: D1 Shadow Mode (Chạy song song)** | Tuần 3 – 6 | Kết nối luồng dữ liệu **Read-Only** từ cổng quét RFID Supermarket & PLC Cầu bốc mỗi 15 phút. Hệ thống tự động sinh khuyến nghị và đối chiếu với quyết định thực tế của Trưởng ca. | Cổng OPC-UA / MQTT Broker nội bộ (Chỉ đọc, không can thiệp hệ thống cũ). | Độ bao phủ dự báo CQR $\ge 80\%$; Phát hiện đúng > 90% các đợt nghẽn trước ít nhất 45 phút. |
| **Giai đoạn 3: D2 Closed-Loop Dispatch (Tự động hóa có Phê duyệt)** | Từ Tháng 2+ | Vận hành chính thức theo mô hình **Human-in-the-Loop**: Trưởng ca bấm phê duyệt 1 chạm trên màn hình cảm ứng tại phòng điều độ để phát lệnh tới đèn Andon, bảng phân công điện tử và đội xe kéo AGV. | Tích hợp 2 chiều với màn hình Andon chuyền, PDA của Picker/Loader và Sổ cái kiểm toán IATF 16949. | Giảm > 80% thời gian chờ tại Cầu bốc; Zero Chokotei (0 phút dừng chuyền do thiếu phôi nội bộ). |
