# TypeLingo v2 – ghi chú cho Claude

Web học từ vựng tiếng Anh và tiếng Đức cho người Việt: gõ từ, bài tập, trắc nghiệm, luyện nói với AI. Viết lại từ bản cũ ở `../typelingo` (Vite + JS thuần). **Không sửa bản cũ.**
Người dùng giao tiếp bằng tiếng Việt; trả lời bằng tiếng Việt. Chi tiết tính năng xem `README.md`.

## Quyết định đã chốt với người dùng
- **React 18 + Vite, JavaScript (không TypeScript).** Định tuyến bằng hash (`#/fall`…) trong `App.jsx`, không dùng react-router.
- **Bố cục:** sidebar trái (menu theo nhóm), header trên cùng (chọn ngôn ngữ học, sáng/tối, tài khoản). Tối ưu cho cả máy tính và điện thoại (≤ 860px: sidebar trượt ra từ nút ☰). Giữ giao diện tối/sáng.
- **Chế độ chơi:**
  - Chỉ chế độ "Từ rơi 2 bước" (gõ từ ngoại ngữ → gõ nghĩa Việt) giữ kịch bản từ rơi cũ.
  - "Đảo chiều" là bảng 2 cột (nghĩa Việt | ô gõ), **không** rơi.
  - Các chế độ mới:
    - Nghe rồi gõ, Điền từ vào câu (có gợi ý nghĩa + số chữ cái + nút xem đáp án).
    - Thẻ chọn nghĩa (thay Flashcard tự đánh giá, theo yêu cầu 19/11): từ ở trên, 3 nghĩa Việt để chọn.
    - Trắc nghiệm chọn từ cho câu (kiểu bài đọc), Ghép cặp.
    - Rơi chọn nghĩa: từ rơi, có 3 nghĩa dễ nhầm để chọn.
    - Nói chuyện với AI.
- **Gemini:**
  - Mỗi người tự nhập key, lưu localStorage, **không đồng bộ lên Supabase** (đã loại `geminiKey` trong `sync.js` stripTs và `merge.js` mergeSettings).
  - Luyện nói: Gemini Live làm chính (`lib/live.js`, WebSocket raw). Lỗi thì tự chuyển sang dự phòng: Web Speech nhận giọng + Gemini văn bản + TTS.
  - Câu ví dụ thiếu (kể cả tiếng Đức) do Gemini sinh khi bắt đầu lượt chơi, cache ở `tl_gen_sentences`.
  - Tên model để sửa được trong Cài đặt. Mặc định: `gemini-3.8-flash` (văn bản), `gemini-3.8-live` (Live), theo tài liệu Google tháng 11/2026.
- **Giữ Supabase** (email + Google) như bản cũ. Chưa cấu hình thì chạy chế độ khách.
- **Bỏ PWA/offline** (người dùng không chọn). Có thể thêm lại nếu được yêu cầu.

- **Dễ bắt đầu (yêu cầu 19/11):** chế độ chia 3 nhóm độ khó trong `modes.js` (`GROUPS`: Làm quen / Luyện tập / Thử thách / Nói), mỗi chế độ có `steps` (hướng dẫn 3 bước ở màn chuẩn bị) và `tip` (hiện trên `GameBar`). Trang chủ có lộ trình 3 bước (flash → match → quiz). Chọn chủ đề là tùy chọn, nút "Bắt đầu ngay" là chính.
- **Giọng đọc:** `speech.js` chấm điểm giọng thiết bị (Natural/Online/Google cao, Microsoft SAPI cũ thấp); không có giọng tốt thì dùng Google Dịch TTS. Chọn giọng + tốc độ (`settings.voices`, `settings.ttsRate`) trong Cài đặt. `voices` chỉ lưu trên máy (không đồng bộ, giống `geminiKey`).
- **Điện thoại:** thanh tab dưới (Tổng quan / Học / Nói / Cài đặt), ẩn khi đang ở trang chế độ. Route `#/learn` liệt kê mọi bài theo nhóm.

## Cấu trúc
- `src/lib/engine.js`, `match.js`, `merge.js`, `store.js`, `sync.js`: chép từ bản cũ, chỉ chỉnh nhỏ. `npm test` (`tests/run.mjs`) kiểm tra bộ gõ với mọi từ. Chạy lại sau khi sửa engine/match hoặc file từ.
- `src/lib/words.js`: kho từ, tiến độ, chọn từ theo trọng số ôn tập.
- `src/lib/answer.js`: chấm điểm (`foreignOk`, `mark`, `grade`), `blankOf` (câu khuyết), `distractors` (đáp án nhiễu cùng loại từ / chủ đề).
- `src/components/ModeShell.jsx`: màn chọn chủ đề chung, chuẩn bị câu ví dụ, ghi lượt chơi. Mỗi game nhận `{items, label, lang, onFinish, onAgain, onExit}`.
- `src/components/GameBar.jsx`: thanh trên cùng của bài (thoát, tiến độ, câu nhắc). Game nhận thêm prop `mode`.
- `src/pages/`: Home, Learn, Settings, Speak và 8 game. Danh sách chế độ nằm ở `src/modes.js`.
- Id tiến độ từ tiếng Đức có tiền tố `de:`. Từ riêng (CSV) chỉ áp dụng cho tiếng Anh.

## Trạng thái (19/11/2026)
- Build OK, `npm test` 0 lỗi.
- Đã chạy thử mọi màn bằng Playwright + Chrome (1366px và 390px), không có lỗi runtime.
- **Chưa test với Gemini key thật:** Live (setup message, model name, âm thanh), sinh câu, chat dự phòng, nhận xét. Việc đầu tiên nên làm khi người dùng có key.
- Chưa test Supabase thật, chưa test iOS thật.
- Bảng `sessions` trên Supabase chưa có cột `mode` (lượt chơi lưu `mode` cục bộ nhưng không đẩy lên).

## Kiểm tra trên trình duyệt
Chrome có ở `C:/Program Files/Google/Chrome/Application/chrome.exe`. Có thể cài tạm `playwright-core` rồi dùng `executablePath` để chụp màn hình. Gỡ ra sau khi xong. Lưu ý trên Windows phải import bằng URL `file:///E:/...`.
