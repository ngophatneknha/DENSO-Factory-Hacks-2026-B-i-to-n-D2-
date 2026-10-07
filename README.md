# DENSO Factory Hacks 2026 — Bài toán D2: Logistics Control Room
### Hệ thống Dự báo, Phát hiện điểm nghẽn, Mô phỏng What-if và Đề xuất đối sách điều phối (Predict – Detect – Simulate – Recommend)

> **Nhóm bài toán:** Data Utilization  
> **Phiên bản:** 1.0.0 (Giai đoạn Prototype nộp ý tưởng & Demo)  
> **Môi trường hoạt động:** Toàn bộ mã nguồn và dữ liệu đặt tại `D:\denso-d2-control-room`

---

## 1. Tổng quan giải pháp

Hệ thống được thiết kế chuyên biệt cho luồng cấp phát vật tư nội bộ nhà máy (Intralogistics):
```
Kho Supermarket ➔ Soạn hàng (Picking) ➔ Bốc hàng Dock (Loading) ➔ Xe Tugger Milk-run (Transport) ➔ 4 Dây chuyền sản xuất
```

Hệ thống trả lời câu hỏi cốt lõi của người điều hành:
> *"Với kế hoạch sản xuất hiện tại và các kịch bản biến động có thể xảy ra, nên điều phối nhân lực, nhịp xe hoặc thứ tự ưu tiên thế nào để giảm trễ chuyền nhiều nhất mà vẫn thỏa mãn các ràng buộc vận hành và chi phí?"*

---

## 2. Ba đóng góp kỹ thuật cốt lõi (Vũ khí dự thi)

1. **Dự báo có mức bất định & Hiệu chỉnh Conformal (Predict):**
   - Không chỉ dự báo một con số trung tâm dễ gây sai lệch, mô hình sử dụng **LightGBM Quantile Regression** để dự báo đồng thời các phân vị $q_{10}, q_{50}, q_{90}$.
   - Áp dụng kỹ thuật **Adaptive Conformal Inference (CQR / ACI)** để hiệu chuẩn dải bao phủ trên tập kiểm định, bảo đảm độ tin cậy thực tế đạt ~80%.
   - **Bằng chứng đối chứng Backtest:** Cắt giảm **26.1% sai số WAPE** so với mô hình cơ sở Seasonal Naive.

2. **Phát hiện điểm nghẽn theo tác động can thiệp (Detect - Hypothesis H2):**
   - Chỉ ra sai lầm của cách tiếp cận truyền thống (chỉ nhìn tỷ lệ bận - Utilization): công đoạn bận nhất (ví dụ Tugger bận 94%) chưa chắc là nơi đem lại hiệu quả cao nhất khi bổ sung nguồn lực.
   - Hệ thống tự động chạy các can thiệp biên (+30 phút nguồn lực) trong mô phỏng để tính **Điểm tác động can thiệp (Intervention Impact ROI)**, giúp chọn đúng vị trí cần dồn sức.

3. **Tối ưu hóa đối sách có xét rủi ro đuôi xấu (Recommend - CVaR90 & Pareto):**
   - Hàm mục tiêu kết hợp: $\min \left( \mathbb{E}[L] + \lambda \cdot \text{CVaR}_{90}[L] \right)$.
   - Thanh trượt $\lambda \in [0, 1]$ cho phép nhà quản lý linh hoạt cân đối giữa chi phí trung bình và khả năng phòng ngừa các ca xấu nhất.
   - Tự động lọc các phương án vi phạm ràng buộc cứng (thiếu chứng chỉ kỹ năng, vi phạm nhân lực tối thiểu tại công đoạn cho, vượt trần ngân sách) và vẽ **Không gian tối ưu Pareto**.

---

## 3. Kiến trúc kỹ thuật & Cấu trúc thư mục

```
D:\denso-d2-control-room\
├── backend\                    # Backend FastAPI + Data + ML + SimPy
│   ├── app\
│   │   ├── config.py           # Đường dẫn lưu trữ, biến môi trường
│   │   ├── domain.py           # Cấu hình dây chuyền, định mức ca, chi phí
│   │   ├── main.py             # FastAPI REST endpoints + phục vụ static UI
│   │   ├── audit.py            # SQLite audit log & lịch sử phê duyệt
│   │   ├── jobs.py             # Thread background job worker
│   │   ├── reports.py          # Xuất báo cáo chuyên nghiệp Excel (.xlsx)
│   │   ├── data\
│   │   │   ├── synthetic.py    # Bộ sinh 12 tuần dữ liệu tổng hợp (Level D0)
│   │   │   ├── quality.py      # Profiling chất lượng & thẩm định D0-D3
│   │   │   ├── ingest.py       # Import CSV / Excel & tạo file template
│   │   │   └── store.py        # Quản lý Parquet dataset có phiên bản
│   │   ├── predict\
│   │   │   ├── features.py     # Trích xuất đặc trưng không rò rỉ tương lai
│   │   │   ├── capacity.py     # Tính năng lực hiệu dụng theo lịch ca
│   │   │   ├── models.py       # Baseline Seasonal Naive + LightGBM Quantile
│   │   │   ├── conformal.py    # Hiệu chuẩn Conformal CQR
│   │   │   ├── scenarios.py    # Block bootstrap sinh kịch bản stochastic
│   │   │   └── engine.py       # Predict Engine orchestrator
│   │   ├── sim\
│   │   │   ├── engine.py       # SimPy discrete-event simulation core
│   │   │   ├── schedule.py     # Ánh xạ lịch ca, nhân sự, dock, xe tugger
│   │   │   └── scenario_requests.py # Chuẩn bị pool đơn hàng cho what-if
│   │   ├── detect\
│   │   │   ├── alerts.py       # Cảnh báo với cơ chế Hysteresis
│   │   │   └── intervention.py # Đo điểm tác động can thiệp vs Utilization (H2)
│   │   └── recommend\
│   │       ├── actions.py      # Danh mục đối sách & kiểm tra ràng buộc cứng
│   │       └── optimizer.py    # CVaR90, điểm số rủi ro & tập Pareto
│   ├── tests\
│   │   └── test_api_and_domain.py # 8 bài test unit/integration (T01-T12)
│   └── var\                    # CSDL SQLite và Parquet datasets
├── frontend\                   # Giao diện Control Room (React 19 + TypeScript + ECharts)
│   ├── src\
│   │   ├── api.ts              # TypeScript API client & interfaces
│   │   ├── components\
│   │   │   ├── Navbar.tsx      # Thanh điều hướng, trạng thái & nút xuất báo cáo
│   │   │   ├── OverviewTab.tsx # Sơ đồ luồng, KPI cards, ticker cảnh báo
│   │   │   ├── PredictTab.tsx  # Biểu đồ dự báo dải bất định + bảng Backtest
│   │   │   ├── DetectTab.tsx   # Danh sách cảnh báo + phân tích H2
│   │   │   ├── SimulateTab.tsx # Phòng thử nghiệm What-if tương tác
│   │   │   ├── RecommendTab.tsx# Biểu đồ Pareto, thanh trượt λ, phê duyệt 1-click
│   │   │   ├── DataTab.tsx     # Quản lý dữ liệu, nạp CSV/Excel, sinh dữ liệu
│   │   │   └── AuditTab.tsx    # Lịch sử quyết định & Audit trail
│   │   └── App.tsx             # Ứng dụng chính
│   └── dist\                   # Bản build static production
└── start.ps1                   # Script khởi động 1 lệnh duy nhất
```

---

## 4. Hướng dẫn khởi động & Sử dụng

### Cách 1: Khởi động 1 lệnh nhanh nhất (Khuyến nghị)
Mở PowerShell tại thư mục gốc và chạy:
```powershell
Set-Location D:\denso-d2-control-room
.\start.ps1
```
Script sẽ tự động:
1. Kích hoạt môi trường Python `.venv`.
2. Khởi tạo dữ liệu mặc định (nếu chưa có).
3. Khởi động máy chủ Uvicorn tại `http://localhost:8000`.
4. Tự động mở trình duyệt hiển thị giao diện Control Room!

---

## 5. Chạy kiểm thử tự động (Unit & Integration Tests)

Để kiểm tra độ tin cậy và sự bảo toàn logic:
```powershell
Set-Location D:\denso-d2-control-room\backend
$env:PYTHONPATH="."
.\.venv\Scripts\pytest.exe -v tests/test_api_and_domain.py
```
**Kết quả:** 8/8 tests passed (Thời gian: ~4.4s).
- `test_health_endpoint`: Kiểm tra trạng thái máy chủ.
- `test_data_current_and_quality`: Kiểm tra tính toàn vẹn dữ liệu.
- `test_t09_simulation_determinism_crn`: Kiểm tra tính tất định của Common Random Numbers.
- `test_simulation_logic_conservation_and_precedence`: Kiểm tra bảo toàn số lượng và thứ tự công đoạn.
- `test_t07_hard_constraints_validation`: Kiểm tra bộ lọc ràng buộc cứng đối sách.
- `test_predict_and_backtest_endpoints`: Kiểm tra dự báo và backtest WAPE.
- `test_detect_and_recommend_endpoints`: Kiểm tra phát hiện điểm nghẽn & bộ tối ưu.
- `test_excel_export_endpoint`: Kiểm tra khả năng xuất báo cáo Excel đầy đủ.
