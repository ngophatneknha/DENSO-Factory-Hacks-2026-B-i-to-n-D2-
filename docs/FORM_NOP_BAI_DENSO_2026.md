# BỘ NỘI DUNG CHÍNH THỨC ĐIỀN CỔNG NỘP BÀI DENSO FACTORY HACKS 2026
*(Biên soạn bám sát 100% khung "Bí Kíp Chinh Phục DENSO Factory Hacks 2026" — Giải Pain Point thực tế tại DMVN, Thiết kế 4 Lớp Input – 4 Thành phần Output, Công nghệ On-Premise vừa đủ làm chủ)*

---

## 0. Danh mục quan tâm (*)
- Chọn: **`D2 - Simulate & Forecast Logistics, Recommend Actions`** *(Nhóm Data Utilization — P2: Hiển thị hóa, Dự báo & Mô phỏng Năng lực Logistics)*

---

## 1. Vấn đề bạn nhận thấy
> **Tự kiểm (Self-Check — Nếu bỏ hết công nghệ đi, người vận hành tại DMVN được lợi gì?):**
> - **1 Câu trả lời:** Thay vì mỗi khi có biến động đơn hàng hoặc xe kéo/AGV dừng bất thường phải mở 4–5 file Excel rời rạc để cộng tay năng lực kho – nhân lực – phương tiện và chỉ phát hiện tắc nghẽn sau khi hàng đã ùn ở cổng Dock, người điều phối tại DMVN nhìn thấy ngay trên 1 màn hình duy nhất **"còn bao lâu nữa khu vực nào sẽ quá tải và cần điều chỉnh nhân sự/chuyến xe nào ngay bây giờ"** trước khi sự cố ảnh hưởng tới dây chuyền.
> - **1 Con số cốt lõi:** Rút ngắn thời gian tính toán & lập phương án điều chỉnh khi có biến động từ **30–45 phút tính tay xuống dưới 1 phút (`< 1 giây` mô phỏng)**, giúp **giảm `82.0%` tổng số phút giao hàng trễ cho line sản xuất** (nâng tỷ lệ cấp hàng đúng hạn từ **`81.2%` lên `98.4%`** trên cùng bộ test 30 kịch bản).

Trong vận hành cấp vật tư nội bộ thực tế (từ Kho Supermarket qua bàn Kitting, cổng Dock và đội xe nâng / AGV / AMR / tàu kéo Milk-run tới các line lắp ráp), người vận hành đang gặp **3 điểm đau (Pain Points)** lớn tương ứng với 3 câu hỏi cốt lõi của DENSO:

1. **Vấn đề về Hiển thị hóa (*What is happening now? — "Không có nguồn dữ liệu duy nhất cho hoạt động logistics"*):**
   - Thông tin về lịch sản xuất của các line, lượng đơn cần soạn tại kho, tình trạng cổng Dock và trạng thái đội xe nâng / AGV / AMR đang nằm phân tán trong nhiều hệ thống và nhiều tệp Excel khác nhau.
   - Rất khó có được một cái nhìn thời gian thực duy nhất về toàn bộ hoạt động kho hàng; người điều phối phải mất nhiều thời gian gộp dữ liệu thủ công. Hơn nữa, khi chỉ nhìn vào các con số rời rạc, hiện trường rất dễ mắc **"Bẫy Nghẽn Giả"**: thấy đội xe kéo báo bận `94.1%` liền nghĩ là thiếu xe, nhưng thực chất xe bị kẹt là do phải đứng chờ hàng chưa bốc xong tại cổng Dock số 2 (đang bận `88.5%`).

2. **Vấn đề về Dự báo (*Can current capacity support upcoming requirements? — "Lập kế hoạch nguồn lực dựa vào ước tính thủ công"*):**
   - Nhu cầu nhân lực (Pickers, Loaders), xe nâng, AGV/AMR và công suất kho cho các giờ tới đang được tính thủ công dựa vào kinh nghiệm và giả định tĩnh đầu ca.
   - Khi có biến động thể tích đơn hàng (ví dụ: dây chuyền L1, L2 tăng nhịp lấy hàng `+30%` trùng lúc 1 xe kéo/AGV phải dừng bảo trì hoặc sạc pin từ `10:00 – 12:00` làm tải vọt lên **`134%` công suất**), cách tính tay không thể xác định nhanh các khoảng thiếu hụt năng lực (*Capacity Gaps*) và nút thắt tương lai trước khi chúng xảy ra.

3. **Vấn đề về Mô phỏng Kịch bản (*What happens if conditions change? — "Các thay đổi rất khó đánh giá trước khi thực hiện"*):**
   - Không có nền tảng trực tuyến để thử nghiệm trước (*What-if*) các kịch bản thay đổi chính sách, sản lượng và bố trí nguồn lực.
   - Nút thắt cổ chai chỉ được phát hiện **sau khi đã xảy ra va chạm vận hành** tại hiện trường (hàng ùn ứ tại Dock, xe chờ nối đuôi nhau hoặc kệ đầu chuyền báo cạn phôi).
   - Các phương án phản hồi thay thế (như điều chuyển nhân sự hỗ trợ chéo sang cổng Dock, đổi thứ tự ưu tiên từ `FIFO` sang ưu tiên đơn gấp `EDD`, hay tăng tần suất chuyến xe) không thể đem ra so sánh hiệu quả một cách định lượng trước khi thực thi.

---

## 2. Giải pháp bạn đề xuất

### 🎯 Mục đích của giải pháp
Xây dựng hệ thống **D2 Logistics Control Room** theo đúng mô hình **Digital Triplet (Cyber × Physical × Human)** mà DENSO Việt Nam (DMVN) hướng tới:
- Kết nối dữ liệu thực tế từ hiện trường (**Physical**: Kho, Kitting, Dock, AGV/Tàu kéo, Line) vào bộ công cụ Dự báo – Phát hiện – Mô phỏng (**Cyber**: Predict – Detect – Simulate) để giải phóng người điều phối và Trưởng ca (**Human**) khỏi các thao tác cộng sổ Excel thủ công lặp đi lặp lại (*Routine work*), giúp con người tập trung vào quản lý tổng thể **QCDS** (Chất lượng – Chi phí – Giao hàng – An toàn) và ra quyết định chủ động dựa trên dữ liệu.

### ⚙️ Công nghệ sử dụng *(Tối giản, vừa đủ làm chủ, chạy 100% On-Premise tại nhà máy)*
1. **Dự báo Năng lực vs. Yêu cầu sắp tới (Predict):** Mô hình **LightGBM Multi-Quantile (`q10`, `q50`, `q90`) kết hợp hiệu chuẩn ngưỡng Conformal (CQR)** — chạy siêu nhẹ trên CPU thường (`< 15ms`), đối chiếu trực tiếp công suất kho hiện tại với khối lượng công việc sắp tới theo từng khung 15 phút (trước 4h / 8h / 24h), giảm **`31.8%` sai số WAPE** so với trung bình trượt.
2. **Hiển thị hóa & Phát hiện Điểm nghẽn Gốc (Detect):** **Mặt bằng 2D Sàn Epoxy Chuẩn 5S** kết hợp **Bộ lọc cảnh báo chống rung (Hysteresis)** và **Phân tích tác động can thiệp biên (SimPy Counterfactual & TreeSHAP)** — giúp chỉ đúng trạm gây nghẽn gốc (Cầu bốc Dock hiệu quả `4.8x` so với Xe kéo `1.2x`).
3. **Mô phỏng Kịch bản What-if & Gợi ý Đối sách (Simulate & Recommend):** **Động cơ Mô phỏng Sự kiện Rời rạc SimPy 4 (Python DES)** dùng chung hạt giống ngẫu nhiên (`CRN Seed = 42`) chạy trong `< 350ms` (`3.3ms` qua bộ nhớ đệm), bảo toàn 100% số lượng đơn hàng; kết hợp **Đánh giá Đa mục tiêu Pareto + Kiểm soát 10% đơn trễ nặng nhất (`CVaR90`)** để so sánh 4 phương án phản hồi (**Plan A / B / C / D**).
4. **Nền tảng Thực thi On-Premise (Platform):** **Python FastAPI + Kho dữ liệu Apache Parquet/SQLite + Giao diện React TypeScript**, cài đặt trực tiếp trên máy chủ nội bộ của nhà máy (không đẩy dữ liệu lên Cloud ngoài), hỗ trợ nạp trực tiếp file Excel/CSV và xuất báo cáo Excel 5 sheets kèm mã kiểm chứng **SHA-256**.

### 📥 Dữ liệu đầu vào *(Làm rõ theo đúng 4 Lớp INPUT bắt buộc)*
1. **Lớp 1 — Dữ liệu máy, thiết bị & phương tiện (`tugger_trips`, `equipment_status`):** Trạng thái và lịch trình của đội xe nâng / AGV / AMR / tàu kéo Milk-run (6,320 chuyến, sức chứa 8 đơn/chuyến, chu kỳ 20 phút), trạng thái 4 bàn Kitting (`PK1–4`) và 3 cổng Dock (`DK1–3`) cập nhật theo khung 15 phút, bao gồm lịch dừng bảo trì/sạc pin (`TG-03` dừng `10:00 – 12:00`).
2. **Lớp 2 — Dữ liệu nghiệp vụ sản xuất & kho (`line_schedule`, `orders`):** Lịch sản xuất theo ca của 4 chuyền (`L1 Compressor`, `L2 Radiator`, `L3 Starter`, `L4 Inverter`), danh mục 27,133 đơn cấp hàng theo nhóm bao bì (`A: Khay Bin`, `B: Thùng Box`, `C: Pallet`) quy đổi ra số phút công việc chuẩn (`standard_minutes`), tiêu chuẩn giao hàng 'Đạt' (**SLA `<= 45` phút**) và quy tắc ưu tiên (`FIFO` / `EDD`).
3. **Lớp 3 — Tri thức người vận hành tại hiện trường (`staff_roster`, `station_4h`):** Bảng phân ca nhân sự kho (4 nhân viên Picking, 2 nhân viên Dock, 3 lái xe), ma trận kỹ năng hỗ trợ chéo (*nhân viên đa kỹ năng `NV-04` có thể luân chuyển từ Picking sang hỗ trợ Dock khi quá tải*), lịch nghỉ giữa ca và giới hạn an toàn tối thiểu tại từng khâu.
4. **Lớp 4 — Bộ kịch bản Test & Nhãn đối chứng (`30 Benchmark Cases`):** Bộ 30 kịch bản kiểm thử chuẩn (ca bình thường, ca biến động đơn hàng tăng `+30%`, ca xe dừng bảo trì, ca kết hợp) có đáp án chuẩn để đo lường Trước – Sau trên cùng một mặt bằng.

### 📤 Dữ liệu đầu ra *(Đảm bảo đầy đủ 4 Thành phần OUTPUT bắt buộc)*
1. **Thành phần 1 — Bản Demo chạy được End-to-End (Người DENSO tự bấm thử trực tiếp):** Giao diện **D2 Logistics Control Room** gồm 7 Tab và **Mặt bằng 2D Sàn Epoxy 5S** chạy trực tiếp tại chỗ, cho phép kéo thanh trượt What-if hoặc tải file Excel/CSV lên kiểm thử ngay, không phải video quay sẵn.
2. **Thành phần 2 — Dự báo kèm Ngưỡng xử lý & Số đo Trước / Sau trên cùng bộ Test:**
   - Không chỉ vẽ đường dự báo mà chỉ rõ: **"Còn 4 giờ nữa (khung `10:00 – 11:00`) tải sẽ vượt `134%` công suất tại Cổng Dock 2 và cần điều chỉnh gì ngay bây giờ"**.
   - Công bố minh bạch bảng đo **Trước cải tiến (Baseline)** vs. **Sau cải tiến (4 Phương án Plan A / B / C / D)** cùng biểu đồ Gantt lịch trình chuyến xe và Phiếu Lệnh Điều Phối in trực tiếp.
3. **Thành phần 3 — Tài liệu Tái lập (Reproducibility):** Trọn bộ Từ điển dữ liệu 6 bảng (70,677 dòng), công thức quy đổi tải, hướng dẫn khởi chạy On-Premise và danh mục 12 giả định/giới hạn đã biết (`A01–A12`) để xác nhận cùng Mentor DENSO.
4. **Thành phần 4 — Phương án Nhân rộng & Hạch toán Giờ công / Hoàn vốn:** Báo cáo chi tiết giờ công điều phối tiết kiệm được hàng tháng, chi phí triển khai trên mỗi phân khu kho và thời gian hoàn vốn thực tế.

---

## 3. Quy trình thực hiện công việc

### 🔴 Trước cải tiến *(Phân tán, Ước tính Thủ công & Phản ứng Bị động)*
1. **Hiển thị hóa phân tán:** Đầu ca và trong ca, dữ liệu kế hoạch sản xuất, tồn kho, nhân sự và đội xe nằm ở nhiều hệ thống và file Excel rời rạc; người điều phối mất **30–45 phút** gộp tay mà vẫn không thấy được bức tranh thời gian thực.
2. **Ước tính nguồn lực thủ công:** Nhân lực kho, cổng Dock và chuyến xe được bố trí cố định theo cảm tính đầu ca. Khi chuyền L1/L2 tăng lấy hàng `+30%` trùng lịch bảo trì xe `TG-03`, người điều phối không tính kịp khoảng thiếu hụt công suất.
3. **Phát hiện muộn sau va chạm & điều động sai vị trí:** Điểm nghẽn chỉ lộ ra khi hàng đã ùn ở cổng Dock và line báo thiếu phôi. Nhìn thấy đội xe kéo bận `94.1%`, Trưởng ca thúc giục lái xe hoặc điều thêm xe mà không biết xe bị kẹt do phải chờ bốc hàng tại Dock 2 (`88.5%`).
4. **Không so sánh được các phương án thay thế:** Ra lệnh điều chỉnh bằng miệng trong thế bị động, dẫn tới tổng trễ lũy kế **`2,010.0` phút-đơn/ca** (46 đơn giao trễ quá 45 phút, tỷ lệ đúng hạn **SLA tụt xuống `81.2%`**).

### 🟢 Sau cải tiến *(Tập trung, Dự báo Chủ động & Mô phỏng Khép kín với D2 Control Room)*
1. **Hiển thị hóa trên một nền tảng duy nhất:** Mở màn hình **D2 Control Room & Mặt bằng 2D Sàn Epoxy 5S**, toàn bộ trạng thái Kho – Kitting – Dock – AGV/Tàu kéo – Line được hợp nhất tự động theo thời gian thực.
2. **Dự báo sớm khoảng thiếu hụt trước 4 tiếng:** Ngay đầu ca (`06:00`), mô-đun **Predict** đối chiếu công suất hiện tại với nhu cầu sắp tới và báo rõ: *"Khung `10:00 – 11:00` công suất Cầu bốc sẽ thiếu hụt `34%` (tải đạt `134%`)"*.
3. **Chẩn đoán đúng điểm nghẽn gốc:** Mô-đun **Detect** chỉ đích danh nút thắt gốc nằm tại **Cầu bốc `DK-02` (xác suất nghẽn `92.9%`, hiệu quả can thiệp `4.8x`)** chứ không phải Đội xe kéo (`1.2x`).
4. **Mô phỏng trực tuyến & So sánh 4 phương án trước khi thực thi:** Trong `< 1 giây`, động cơ **SimPy** chạy đối chứng và đặt lên bàn cân 4 tùy chọn phản hồi. Trưởng ca chọn **Phương án C (Plan C)**: *Luân chuyển nội bộ nhân viên đa kỹ năng `NV-04` sang mở Cổng Dock 3 + Đổi thứ tự ưu tiên từ `FIFO` sang ưu tiên đơn gấp `EDD` + Rút chu kỳ xe kéo xuống `15 phút`*, bấm **"Phê duyệt & Phát lệnh"** để in Phiếu Điều Phối và lưu nhật ký kiểm chứng.

---

## 4. Hiệu quả mang lại *(Đo lường Trước – Sau trên Cùng Một Bộ Test)*
1. **Tiết kiệm giờ công điều phối hàng ngày:** Rút ngắn thời gian gộp file Excel và tính phương án khi có biến động từ **30–45 phút xuống dưới 1 phút (`0.35 giây` mô phỏng SimPy)**, tiết kiệm trung bình **`1.5 – 2.0 giờ công/ngày`** (`~540 giờ công/năm`) cho điều phối viên và Trưởng ca tại mỗi phân khu kho.
2. **Nâng cao độ chính xác dự báo năng lực:** Giảm **`31.8%` sai số dự báo WAPE** (từ `16.7%` xuống **`11.4%`**) và đạt độ bao phủ biên độ an toàn **`81.2%`**, giúp phát hiện sớm khoảng thiếu hụt công suất trước **4 giờ**.
3. **Giảm `82.0%` độ trễ & Đảm bảo tiến độ cấp hàng cho Line (Delivery SLA):** Trên cùng bộ kịch bản kiểm thử biến động, phương án **Plan C** giúp giảm tổng phút trễ từ `2,010.0` phút xuống **`361.8` phút-đơn/ca**, giảm **`76.1%` độ trễ của nhóm 10% đơn xấu nhất (`CVaR90` từ `38.5p` xuống `9.2p`)**, nâng tỷ lệ giao hàng đúng hạn **SLA từ `81.2%` lên `98.4%`** (`+17.2%`).
4. **Chi phí triển khai thấp & Hoàn vốn nhanh khi nhân rộng:** Hệ thống sử dụng 100% mã nguồn mở, chạy ngay trên máy chủ CPU nội bộ sẵn có của nhà máy (chi phí trang bị màn hình/phụ trợ chỉ `~35 triệu VNĐ/phân khu`), tận dụng nhân sự đa kỹ năng nội bộ (chi phí điều độ biến đổi chỉ `18,000đ/ca` cho 3 chuyến xe tăng thêm) và đạt **thời gian hoàn vốn thực tế sau `2.0 – 2.5 tháng`** vận hành.

---

## 5. Sự vượt trội / độc đáo của ý tưởng
1. **Không chỉ vẽ đường dự báo — Nói rõ "Còn bao lâu chạm ngưỡng và Phải làm gì":** Trả lời trực diện câu hỏi của người vận hành tại xưởng bằng con số thời gian đếm ngược tới lúc quá tải và gợi ý sẵn 4 phương án hành động cụ thể.
2. **Phát hiện đúng "Bẫy Nghẽn Giả" (Rank Conflict) bằng Mô phỏng Can thiệp:** Chứng minh định lượng rằng trạm báo bận cao nhất (`Xe kéo 94.1%`) chỉ là triệu chứng chờ hàng, còn can thiệp vào `Cầu bốc Dock (88.5%)` mới mang lại hiệu quả giảm trễ gấp **4 lần (`4.8x` vs `1.2x`)**.
3. **Mặt bằng 2D Sàn Epoxy Chuẩn 5S & Bảo toàn Đơn hàng Vật lý 100%:** Trực quan hóa mặt bằng kho và tuyến AGV/Milk-run theo đúng tiêu chuẩn 5S nhà máy Nhật Bản, đi kèm bộ kiểm tra tự động đảm bảo 100% đơn hàng đầu vào và tồn đầu ca luôn khớp tuyệt đối với đầu ra.
4. **Kiến trúc Gọn nhẹ, Bảo mật On-Premise & Sẵn sàng Bấm Thử Thực Tế:** Chạy hoàn toàn trong mạng nội bộ nhà máy (không đẩy dữ liệu lên Cloud ngoài), có hàng rào an toàn (*Safety Guardrails*) chặn mọi cấu hình vượt giới hạn thiết bị và đã có sẵn bản chạy End-to-End để giám khảo DENSO tự tay bấm thử.

---

## 6. Kế hoạch triển khai trong bao lâu
Bám sát lộ trình cuộc thi và nguyên tắc **"Quan sát kỹ tại nhà máy – Chốt bài toán với Mentor DENSO – Demo sớm từ Tuần 4 với Mentor FPT"**, kế hoạch triển khai thực tế kéo dài **8 – 12 tuần**:
- **Giai đoạn 1 (Tuần 1 – Tuần 2): Khảo sát Factory Tour & Chốt Painpoint / Input-Output với Mentor DENSO** — Quan sát trọn 1 chu kỳ cấp hàng thực tế tại DMVN, bấm giờ từng bước (Kitting, Dock, AGV/Tàu kéo), phỏng vấn trực tiếp người vận hành, xin mẫu dữ liệu và gửi biên bản xác nhận nghiệp vụ + bộ 30 test cases chuẩn trong vòng 24 giờ sau khảo sát.
- **Giai đoạn 2 (Tuần 3 – Tuần 4): Chuẩn hóa Baseline & Demo Bản Chạy Thông ở Tuần 4 với Mentor FPT** — Đưa dữ liệu thực tế của phân khu thí điểm vào 6 bảng chuẩn, đo chỉ số Baseline hiện trạng và hoàn thành bản Demo End-to-End chạy trên máy chủ On-Premise ngay ở Tuần 4; thực hiện check-in định kỳ 2 lần/tuần với Mentor FPT để gỡ khó khăn sớm.
- **Giai đoạn 3 (Tuần 5 – Tuần 8): Tinh chỉnh Dự báo – Mô phỏng SimPy & Người Vận Hành DMVN Bấm Thử** — Hiệu chỉnh định mức thời gian sát thực tế hiện trường (đạt WAPE `<= 12%`, lệch mô phỏng `< 5%`), cấu hình quy tắc đối sách Plan A/B/C/D theo đúng thẩm quyền của Trưởng ca và mời người vận hành bấm thử trực tiếp.
- **Giai đoạn 4 (Tuần 9 – Tuần 12): Đo lường Trước – Sau, Đóng gói Tài liệu Tái lập & Phương án Nhân rộng** — Công bố bảng kết quả Trước – Sau trên cùng bộ test giữ nguyên, quy đổi ra Giờ công – Chi phí – Thời gian hoàn vốn và bàn giao gói cài đặt On-Premise sẵn sàng nhân rộng sang các xưởng khác tại DMVN.
