# TypeLingo – Brief thiết kế lại giao diện (React)

## 1. Hiện trạng (từ ảnh chụp)

- Nền tối xanh navy, màu nhấn tím/indigo (banner "Bắt đầu từ đây"), nút bài học màu xanh lá và xanh dương.
- Cấu trúc đã tốt, nên **giữ nguyên**:
  - Header: logo, streak, XP, chuyển ngôn ngữ EN/DE, nút đổi theme, avatar.
  - Sidebar trái chia nhóm: Bước 1 Làm quen, Bước 2 Luyện tập, Bước 3 Thử thách, Nói, Khác.
  - Giữa: banner hướng dẫn + lộ trình bài học dạng nút tròn.
  - Cột phải: Mục tiêu hôm nay, chuỗi ngày liên tiếp, Tổng kết.
- Điểm cần cải thiện:
  - Tông tối + tím đậm chưa mang cảm giác vui, nhẹ nhàng như mong muốn (pastel).
  - Lộ trình bài học còn ít "đường đi": các nút gần như xếp thẳng, chưa có đường nối và độ uốn lượn.
  - Khoảng trống hai bên lộ trình khá lớn, thiếu yếu tố trang trí/mascot.
  - Chữ phụ màu xám trên nền tối hơi mờ; các vòng tròn streak đang rỗng, thiếu sức sống.
  - Màu của từng nhóm bài chưa nhất quán giữa sidebar, lộ trình và các thẻ.

## 2. Hướng thiết kế

- Cảm giác: vui nhộn, thân thiện, mọi lứa tuổi, pastel nhiều màu.
- Bo góc lớn (16–24px), bóng đổ mềm, nút to, khoảng trắng thoáng.
- Font tròn, dễ đọc: **Nunito** hoặc **Baloo 2** (hỗ trợ tiếng Việt).
- Micro-animation nhẹ: nút nảy khi hover/nhấn, thanh tiến độ chạy mượt, hiệu ứng chúc mừng khi đúng.
- Giữ cả **theme sáng (mặc định)** và **theme tối** vì trang đã có nút chuyển theme; theme tối dùng pastel đã giảm độ sáng.

## 3. Bảng màu

### Theme sáng

| Vai trò | Tên | HEX |
|---|---|---|
| Nền trang | Kem nhạt | `#FFFDF8` |
| Nền thẻ / sidebar | Trắng | `#FFFFFF` |
| Chữ chính | Xanh than | `#2D3047` |
| Chữ phụ | Xám tím | `#6B6F8A` |
| Viền nhẹ | Xám kem | `#ECE8DF` |
| Chủ đạo (primary) | Mint | `#7DD3B0` |
| Mint đậm (viền/bóng nút) | | `#5BBE95` |
| Lavender | Tím nhạt | `#B7A6F2` |
| Butter | Vàng bơ | `#FFE08A` |
| Peach | Hồng đào | `#FFB5A7` |
| Sky | Xanh trời | `#9AD1FF` |
| Đúng | Xanh lá nhạt | `#6FCF97` |
| Sai | Đỏ san hô | `#FF7A7A` |

### Theme tối (pastel giảm sáng)

| Vai trò | HEX |
|---|---|
| Nền trang | `#1E2033` |
| Nền thẻ / sidebar | `#2A2D45` |
| Chữ chính | `#F4F3FF` |
| Chữ phụ | `#B4B7D1` (đủ sáng để đọc rõ hơn hiện tại) |
| Viền nhẹ | `#3A3E5C` |
| Mint / Lavender / Butter / Peach / Sky | dùng lại các màu pastel ở trên, chữ đặt trên chúng vẫn dùng `#2D3047` |

### Gán màu theo nhóm bài (dùng nhất quán ở sidebar, lộ trình, thẻ)

| Nhóm | Màu |
|---|---|
| Bước 1 · Làm quen | Mint |
| Bước 2 · Luyện tập | Sky |
| Bước 3 · Thử thách | Peach |
| Nói | Lavender |
| Streak / XP / mục tiêu | Butter |

**Lưu ý độ tương phản:** chữ đặt trên nền pastel luôn dùng `#2D3047`, không dùng chữ trắng. Nút chính có viền/bóng dưới đậm hơn một tông để nổi khối (kiểu nút 3D nhẹ như hiện tại).

## 4. Bố cục

### Desktop

```
┌────────────────────────────────────────────────────────────┐
│ TypeLingo     [EN|DE]        🔥Streak  ⚡XP  ☀️  👤Avatar  │
├───────────┬───────────────────────────────┬────────────────┤
│ Sidebar   │  Banner "Bắt đầu từ đây"      │ Mục tiêu hôm   │
│ (nhóm có  │                               │ nay (10/20/30/ │
│ chấm màu) │  ── BƯỚC 1 · LÀM QUEN ──      │ 50 XP)         │
│           │         (1)                   │                │
│ Tổng quan │            (2)  ← đường nối   │ Chuỗi ngày     │
│ Tất cả    │  ── BƯỚC 2 · LUYỆN TẬP ──     │ liên tiếp      │
│ Bước 1    │         (3)                   │ (7 vòng tròn   │
│ Bước 2    │            (4)                │ màu butter)    │
│ Bước 3    │  ── BƯỚC 3 · THỬ THÁCH ──     │                │
│ Nói       │         (5) 🔒                │ Tổng kết       │
│ Cài đặt   │                               │ (4 ô thống kê) │
└───────────┴───────────────────────────────┴────────────────┘
```

### Mobile

```
┌──────────────────────┐
│ Logo      🔥 ⚡  👤  │
├──────────────────────┤
│ [Mục tiêu hôm nay]   │
│ [Banner bắt đầu]     │
│   ── BƯỚC 1 ──       │
│       (1)            │
│          (2)         │
│   ── BƯỚC 2 ──       │
│       (3) ...        │
├──────────────────────┤
│ 🏠  📖  🎧  🎤  👤   │  Thanh điều hướng dưới
└──────────────────────┘
```
Sidebar và cột phải ẩn trên mobile; Streak/Tổng kết chuyển thành thẻ cuộn ngang phía trên lộ trình.

### Màn hình học

```
┌──────────────────────────────────┐
│ ✕  [████████░░░░] tiến độ   ❤️3 │
│        ┌──────────────┐          │
│        │  Thẻ chính   │          │
│        └──────────────┘          │
│   [Đáp án A]   [Đáp án B]        │
│   [Đáp án C]   [Đáp án D]        │
│          [ KIỂM TRA ]            │
└──────────────────────────────────┘
```

## 5. Chi tiết từng khu vực

- **Lộ trình bài học:** thêm đường nối cong (SVG path) giữa các nút, nút zig-zag trái–phải nhẹ; trạng thái: đã xong (mint đầy + dấu ✓), đang học (viền đậm + nhấp nháy nhẹ + nhãn "BẮT ĐẦU"), khóa (xám nhạt + 🔒). Có thể thêm mascot nhỏ cạnh nút đang học để lấp khoảng trống.
- **Banner:** đổi từ tím đậm sang gradient pastel (lavender → sky), chữ đậm `#2D3047`, nút "Tất cả bài" màu trắng viền nhẹ.
- **Sidebar:** mục đang chọn có nền pastel theo nhóm; chấm nhóm dùng đúng màu đã gán; icon bo tròn.
- **Mục tiêu hôm nay:** thanh tiến độ màu butter, 4 lựa chọn (Nhẹ nhàng/Vừa phải/Nghiêm túc/Chăm chỉ) là chip pastel, chip đang chọn có viền đậm.
- **Chuỗi ngày:** vòng tròn ngày chưa học màu kem/xám nhạt, đã học màu butter có 🔥.
- **Tổng kết:** mỗi ô một màu pastel nhẹ (XP = butter, Từ đã thuộc = mint, Chính xác = sky, Từ hôm nay = peach). Biểu đồ phía dưới cần hiện đủ, không bị cắt.

## 6. CSS variables gợi ý

```css
:root {
  --bg: #FFFDF8;
  --card: #FFFFFF;
  --border: #ECE8DF;
  --text: #2D3047;
  --text-muted: #6B6F8A;

  --mint: #7DD3B0;   --mint-dark: #5BBE95;
  --lavender: #B7A6F2;
  --butter: #FFE08A;
  --peach: #FFB5A7;
  --sky: #9AD1FF;

  --success: #6FCF97;
  --error: #FF7A7A;

  --radius-md: 16px;
  --radius-lg: 24px;
  --shadow-soft: 0 6px 16px rgba(45, 48, 71, 0.08);
}

[data-theme="dark"] {
  --bg: #1E2033;
  --card: #2A2D45;
  --border: #3A3E5C;
  --text: #F4F3FF;
  --text-muted: #B4B7D1;
  --shadow-soft: 0 6px 16px rgba(0, 0, 0, 0.3);
}
```

## 7. Prompt để dán vào công cụ AI

```
Dự án: TypeLingo, trang web học tiếng Anh/Đức viết bằng React, giao diện tiếng Việt.
Nhiệm vụ: thiết kế lại giao diện (CHỈ sửa UI/CSS và cấu trúc JSX liên quan;
giữ nguyên logic, state, routing, props và dữ liệu hiện có).

Hiện tại: theme tối navy, màu nhấn tím/indigo. Bố cục gồm header (logo, streak, XP,
chuyển EN/DE, đổi theme, avatar), sidebar trái chia nhóm (Bước 1 Làm quen, Bước 2
Luyện tập, Bước 3 Thử thách, Nói, Khác), khu vực giữa (banner + lộ trình bài học
dạng nút tròn), cột phải (Mục tiêu hôm nay, Chuỗi ngày liên tiếp, Tổng kết).
Giữ nguyên bố cục này.

Mục tiêu mới: vui nhộn, thân thiện, mọi lứa tuổi, pastel nhiều màu, kiểu Duolingo
nhưng nhẹ nhàng hơn.

Yêu cầu:
1. Dùng CSS variables cho toàn bộ màu, hỗ trợ theme sáng (mặc định) và tối
   (data-theme="dark"), dùng bảng màu trong mục 3 và 6 của file này.
2. Gán màu theo nhóm: Bước 1=mint, Bước 2=sky, Bước 3=peach, Nói=lavender,
   streak/XP/mục tiêu=butter. Áp dụng nhất quán ở sidebar, lộ trình, thẻ.
3. Font Nunito (hoặc Baloo 2), cỡ chữ thân bài tối thiểu 16px; bo góc 16–24px;
   bóng đổ mềm; vùng bấm tối thiểu 44px.
4. Lộ trình bài học: thêm đường nối cong giữa các nút, nút zig-zag nhẹ, 3 trạng thái
   (xong / đang học / khóa), nút "đang học" có hiệu ứng nhấp nháy nhẹ.
5. Banner đổi sang gradient pastel (lavender → sky), chữ đậm dễ đọc.
6. Micro-animation: nút nảy khi hover/nhấn, thanh tiến độ chạy mượt, hiệu ứng
   chúc mừng khi trả lời đúng. Tôn trọng prefers-reduced-motion.
7. Responsive mobile-first: dưới ~900px ẩn sidebar và cột phải, thêm thanh điều hướng
   dưới cùng; thẻ Streak/Tổng kết chuyển thành thẻ cuộn ngang phía trên lộ trình.
8. Chữ trên nền pastel luôn dùng màu --text (không dùng chữ trắng); đảm bảo độ
   tương phản đạt tối thiểu WCAG AA.
9. Giữ nguyên cách styling hiện có của dự án (CSS Modules, Tailwind, styled-components...);
   không thêm thư viện mới nếu không cần thiết.

Đầu ra: chỉ các file/đoạn code cần thay đổi, kèm giải thích ngắn gọn từng file đã sửa.
```
