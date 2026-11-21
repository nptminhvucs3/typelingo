# TypeLingo v2 – học từ vựng, luyện gõ, luyện nói (React + Vite + Supabase)

Bản viết lại của TypeLingo. Bản cũ vẫn nằm nguyên ở `../typelingo`. Kho từ, bộ gõ Telex/VNI, Supabase (đăng nhập, đồng bộ) được dùng lại; giao diện và kịch bản các chế độ chơi được làm mới.

## Chạy

```
npm install
npm run dev      # http://localhost:5173
npm test         # kiểm tra bộ gõ với toàn bộ từ Anh/Đức + logic gộp dữ liệu
npm run build
```

Không có Supabase thì app chạy ở chế độ khách (tiến độ chỉ lưu trên máy).

## Đăng nhập và đồng bộ (Supabase)

1. Tạo project ở supabase.com.
2. **SQL Editor**: chạy toàn bộ `supabase/schema.sql` (chạy lại được, có thêm cột `mode`, `xp` cho `sessions`). Muốn kho từ chung trên máy chủ thì chạy thêm `supabase/seed.sql`.
3. **Project Settings → API**: chép `Project URL` (dạng `https://<mã>.supabase.co`, **không phải** publishable key `sb_publishable_…`) và `anon public key` vào `.env.local` (xem `.env.example`).
   Báo lỗi `permission denied for table …` thì chạy `supabase/grants.sql` (project mới không tự cấp quyền bảng cho Data API; đã gộp vào cuối `schema.sql`).
4. **Authentication → URL Configuration**: Site URL và Redirect URLs gồm `http://localhost:5173/` và địa chỉ GitHub Pages. Thiếu thì link email / Google quay về sai trang.
5. (Tuỳ chọn, chưa bật thì app tự ẩn nút Google) **Authentication → Providers → Google**: bật, dán Client ID/Secret từ Google Cloud Console (Authorized redirect URI là `https://<project>.supabase.co/auth/v1/callback`).

Tính năng: đăng ký / đăng nhập email, Google, quên mật khẩu (link email → đặt mật khẩu mới), đổi tên hiển thị, đồng bộ tiến độ từng từ, từ riêng, cài đặt (trừ key Gemini và giọng đọc), lịch sử lượt chơi (kèm chế độ + XP nên chuỗi ngày/XP giống nhau trên mọi máy). Tự đồng bộ 3 giây sau mỗi thay đổi, khi có mạng lại và khi rời tab.

- Dữ liệu chơi lúc chưa đăng nhập được gộp vào tài khoản ở lần đăng nhập đầu tiên.
- Đăng xuất: đồng bộ lần cuối rồi xoá tiến độ khỏi máy (để người khác đăng nhập trên cùng máy không bị trộn dữ liệu).
- Dùng luồng PKCE (`?code=` trên URL) vì app định tuyến bằng hash. Hệ quả: link xác nhận email / đặt lại mật khẩu phải mở **trên cùng trình duyệt** đã yêu cầu. Mở ở trình duyệt khác thì email vẫn được xác nhận, chỉ cần đăng nhập lại bằng mật khẩu.

## Giao diện

- Menu bên trái theo nhóm: Gõ phím, Bài tập, Trắc nghiệm, Nói, Khác. Trên điện thoại (≤ 860px), menu ẩn sau nút ☰.
- Header trên cùng: chọn ngôn ngữ học (Anh/Đức), nút sáng/tối, tài khoản (tên, chấm trạng thái đồng bộ, đăng nhập/đăng xuất).
- Trang Tổng quan: chuỗi ngày học, số từ hôm nay, từ đã thuộc, từ cần ôn, biểu đồ 14 ngày, lối tắt vào các chế độ.

## Các chế độ

| Chế độ | Kịch bản |
|---|---|
| Từ rơi · gõ từ → gõ nghĩa | **Giữ nguyên kịch bản cũ**: từ rơi, gõ từ ngoại ngữ, thẻ chuyển xanh, gõ nghĩa tiếng Việt (Telex/VNI). 5 mạng, 20 mốc. |
| Đảo chiều · Việt → ngoại ngữ | Bảng 2 cột, 10 dòng mỗi lượt: trái là nghĩa Việt, phải là ô gõ. Enter để chấm từng dòng, 💡 gợi ý thêm chữ (trừ nửa điểm). |
| Nghe rồi gõ | Từng từ: nghe (có nút nghe chậm), gõ lại. Sai lần đầu được nghe chậm và thử lại. 12 từ mỗi lượt. |
| Điền từ vào câu | Câu ví dụ khuyết một từ, có nghĩa và chữ cái đầu làm gợi ý, nút thêm chữ. 10 câu. |
| Từ rơi · gõ 1 bước | Như từ rơi 2 bước nhưng chỉ gõ từ ngoại ngữ; gõ xong nghĩa hiện dưới khung. Space hoặc Enter để xác nhận. |
| Thẻ chọn nghĩa | Từ ở trên, chọn 1 trong 3 nghĩa tiếng Việt (phím 1/2/3). Chọn sai thì thẻ quay lại cuối bộ. 12 thẻ. |
| Trắc nghiệm câu | Chọn 1 trong 4 từ để điền vào câu (kiểu bài đọc). Đáp án nhiễu cùng loại từ, ưu tiên cùng chủ đề. |
| Ghép cặp | 3 bảng × 6 cặp từ – nghĩa. |
| Rơi chọn nghĩa | Một từ rơi, bên dưới 3 nghĩa cùng loại từ và cùng chủ đề (dễ nhầm). Bấm hoặc phím 1/2/3. Chậm quá hoặc chọn sai mất 1 mạng. |
| Nói chuyện với AI | Chọn chủ đề (12 chủ đề có sẵn hoặc tự nhập) hoặc nói tự do, chọn trình độ A1–C1. AI nói ngắn, hỏi lại, sửa lỗi nhẹ nhàng. Kết thúc có nút **Nhận xét** để AI liệt kê lỗi, câu sửa, từ nên học và điểm trôi chảy. |

Mọi chế độ đều dùng chung ôn tập ngắt quãng: trả lời đúng tăng "hộp", sai về hộp 0, nên từ hay sai xuất hiện nhiều hơn. Danh sách "Ôn từ gõ sai" và "Yêu thích" có ở màn chọn chủ đề.

## Gemini AI

1. Lấy key miễn phí tại https://aistudio.google.com/apikey.
2. Vào **Cài đặt → Gemini AI**, dán key, bấm **Thử key**.

- Key **chỉ lưu trong trình duyệt** (localStorage), không đồng bộ lên Supabase. Mỗi người dùng tự nhập key của mình.
- Model mặc định: văn bản `gemini-3.8-flash`, giọng nói `gemini-3.8-live`. Google đổi tên model thường xuyên; nếu báo lỗi model thì sửa tên trong Cài đặt.
- **Nói chuyện:** mặc định dùng Gemini Live (WebSocket, mic PCM 16 kHz, AI trả âm thanh 24 kHz kèm phụ đề). Nếu Live lỗi (key, model, hết hạn mức, trình duyệt không hỗ trợ), app **tự chuyển sang chế độ dự phòng**: bấm 🎤 nói từng câu (nhận giọng của trình duyệt, chạy trên Chrome/Edge/Safari), Gemini trả lời bằng chữ, thiết bị đọc to. Luôn có ô gõ chữ.
- **Câu ví dụ:** Điền từ vào câu và Trắc nghiệm câu cần câu ví dụ. Có key thì app gọi Gemini sinh câu cho các từ chưa có (cả tiếng Đức) và lưu lại trên máy (`tl_gen_sentences`), lần sau không gọi lại. Không có key thì chỉ dùng khoảng 776 từ tiếng Anh có sẵn câu.

## Cấu trúc

```
src/
  App.jsx, ctx.js, modes.js     định tuyến (hash), trạng thái chung, danh sách chế độ
  components/                   Layout (sidebar + header), AuthModal, ModeShell (chọn chủ đề), Result
  pages/                        Home, Settings, Speak và 8 màn chơi
  lib/
    engine.js, match.js         bộ gõ Telex/VNI và so khớp (giữ nguyên từ bản cũ)
    store.js, sync.js, merge.js lưu máy + Supabase (giữ nguyên, thêm cài đặt Gemini; key không đồng bộ)
    words.js, answer.js         kho từ, chọn từ theo trọng số, chấm điểm, câu khuyết, đáp án nhiễu
    speech.js                   giọng đọc
    gemini.js, live.js          Gemini văn bản và Gemini Live
    words.json, words.de.json   3.979 từ Anh, 1.972 từ Đức
```

## Chưa kiểm tra / hạn chế

- **Gemini Live và Gemini văn bản chưa được chạy thử với key thật.** Hãy thử chế độ Nói và nút "Thử key" đầu tiên; nếu Live báo lỗi, xem thông báo hiện ra (app đã tự chuyển sang chế độ dự phòng).
- Live trên iOS Safari có thể không thu âm được; khi đó dùng chế độ dự phòng.
- Bản này **chưa có PWA/offline** như bản cũ (không chọn khi lên kế hoạch). Có thể thêm lại bằng `vite-plugin-pwa`.
- Từ riêng (CSV) vẫn chỉ áp dụng cho tiếng Anh.
- Đăng nhập/đồng bộ mới chạy thử với Supabase giả lập (Playwright chặn request), chưa chạy với project thật.

## Đăng lên GitHub Pages
Có sẵn `.github/workflows/deploy.yml`: mỗi lần push lên `main` sẽ chạy `npm test`, build rồi đăng lên Pages.
1. GitHub repo → **Settings → Pages → Source: GitHub Actions** (làm một lần).
2. (Nếu dùng Supabase) **Settings → Secrets and variables → Actions**: thêm `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. (Nếu dùng Supabase) Supabase → **Authentication → URL Configuration**: thêm địa chỉ trang Pages (vd `https://<user>.github.io/<repo>/`) vào Site URL / Redirect URLs, để đăng nhập Google và link xác nhận email quay về đúng trang.

`vite.config.js` dùng `base: './'` nên không phụ thuộc tên repo.
