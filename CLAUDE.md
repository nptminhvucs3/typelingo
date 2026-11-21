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
  - **Luồng PKCE** (`flowType: 'pkce'` trong `sync.js`): implicit flow trả `#access_token=` sẽ đè lên hash router. `readUrlResult` dọn `?code=`/lỗi trên URL, lỗi link → `info.notice` (App tự mở AuthModal).
  - Không gọi Supabase trong callback `onAuthStateChange` (supabase-js có thể treo) → `setTimeout`. Đăng ký listener sớm để bắt `PASSWORD_RECOVERY` → `info.recovery` → AuthModal hiện form đặt mật khẩu mới.
  - Đăng xuất (`confirmSignOut` trong AuthModal): đồng bộ lần cuối rồi `wipeLocalUserData` (chống trộn dữ liệu khi đổi tài khoản). Dữ liệu khách được gộp vào tài khoản ở lần đăng nhập đầu.
  - `sessions` có cột `mode`, `xp` (schema.sql); `syncNow` tự bỏ 2 cột này nếu DB cũ chưa có. Tên hiển thị = `user_metadata.full_name` (`displayName`, `updateName`).
  - Project thật: `pgpwkhjnghofkpofhiqk` (21/11). Google **chưa bật** (người dùng không muốn tạo Google Cloud) → nút Google tự ẩn theo `/auth/v1/settings` (`info.googleEnabled`). Project mới cần `supabase/grants.sql` (GRANT cho anon/authenticated), thiếu thì 401 permission denied.
- **Bỏ PWA/offline** (người dùng không chọn). Có thể thêm lại nếu được yêu cầu.

- **Dễ bắt đầu (yêu cầu 19/11):** chế độ chia 3 nhóm độ khó trong `modes.js` (`GROUPS`: Làm quen / Luyện tập / Thử thách / Nói), mỗi chế độ có `steps` (hướng dẫn 3 bước ở màn chuẩn bị) và `tip` (hiện trên `GameBar`). Trang chủ có lộ trình 3 bước (flash → match → quiz). Chọn chủ đề là tùy chọn, nút "Bắt đầu ngay" là chính.
- **Giọng đọc:** `speech.js` chấm điểm giọng thiết bị (Natural/Online/Google cao, Microsoft SAPI cũ thấp); không có giọng tốt thì dùng Google Dịch TTS. Chọn giọng + tốc độ (`settings.voices`, `settings.ttsRate`) trong Cài đặt. `voices` chỉ lưu trên máy (không đồng bộ, giống `geminiKey`).
  - **Google Dịch TTS trả 404 nếu request có Referer** → `index.html` có `<meta name="referrer" content="no-referrer">` (thuộc tính `referrerPolicy` trên Audio không có tác dụng). Đừng bỏ thẻ meta này.
  - Tiếng Việt (`settings.viVoice`: auto/device/piper): giọng Việt của máy → Google Dịch → Piper (`lib/piper.js`, `@mintplex-labs/piper-tts-web`, giọng `vi_VN-vais1000-medium` ~63MB tải từ HuggingFace, wasm từ cdnjs/jsdelivr, lưu OPFS, import động). Google lỗi thì bỏ qua 5 phút.
- **Tham khảo Duolingo (yêu cầu 20/11, chỉ lấy cách chơi/kiểu giao diện, không dùng thương hiệu):** XP mỗi lượt (`lib/stats.js` `calcXp`, lưu `xp` trong history, đẩy lên cột `sessions.xp`), mục tiêu ngày `settings.dailyGoal`, chuỗi ngày + XP trên header, trang chủ là lộ trình nút tròn zíc-zắc + cột phải (mục tiêu, tuần, ôn lỗi, tổng kết), `CheckBar` (thanh xanh/đỏ ở đáy, nút Tiếp tục) dùng trong Flash/Quiz/Listen/Cloze, âm thanh `lib/sfx.js` (Web Audio, `settings.sfx`), nút dày kiểu 3D, màn hoàn thành có XP.
- **Từ rơi:** `fall1` (gõ 1 bước, chỉ gõ từ ngoại ngữ) dùng chung `FallGame.jsx` với `fall`. Enter xác nhận như Space. Thẻ được đẩy vào trong khung khi đổi sang nghĩa Việt dài hơn (`render` clamp `w.x`), nghĩa quá dài thì xuống dòng.
- **Giao diện pastel (20/11, theo `typelingo-ui-redesign.md`, đã hỏi kỹ người dùng):**
  - Theme sáng mặc định; `store.js` chuyển mọi người sang sáng **một lần** (cờ `settings.uiV3`), sau đó tôn trọng lựa chọn. Font Nunito.
  - Màu theo nhóm qua biến `--g/--gd` trên class `.easy`(mint) `.mid`(sky) `.hard`(peach) `.talk`(lavender), `.butter` cho streak/XP/mục tiêu. Chữ trên nền pastel luôn `--ink`.
  - Mascot: mèo mướp xám **do người dùng vẽ**, PNG nền trong suốt ở `public/mascot/` (`expressions/<tên>.png` 16 biểu cảm, `anim/{idle,jump,wave,wrong}-1..6.png`). `components/Mascot.jsx` nhận `mood` = tên biểu cảm/chuyển động (gọi tắt: ok→jump, bad/sad→wrong). Chỗ dùng: lộ trình (idle lặp), màn hướng dẫn `MascotSay` (study/listening/typing), thanh đúng/sai (jump→correct, wrong→wrong, tải trước bằng `preloadMascot`), màn hoàn thành (celebrate), thẻ chuỗi ngày (streak/lost-streak/sleeping), trang Tôi (wave), Nói chuyện (speaking/listening/thinking). Không tự vẽ mascot khác. Cho mượt: các khung xếp chồng và crossfade bằng opacity, mỗi khung có thời gian giữ riêng (`ANIMS[].seq`), cộng chuyển động CSS nhẹ (`.m-idle .m-move` …).
  - Icon: PNG do người dùng vẽ ở `public/icons/<tên>.png`, dùng qua `components/Icon.jsx` (`<Icon name="xp" />`). Mỗi chế độ có `ico` trong `modes.js`. Logo do người dùng vẽ ở `public/logo/` (dùng qua `components/Logo.jsx`): sidebar = logo ngang, tự đổi `logo-horizontal-light/dark` theo theme (+@2x); header điện thoại = logo ngang, ≤ 400px chỉ icon vuông. Favicon = `logo/favicon.ico` + `logo-icon-32/192.png`, `apple-touch-icon.png`. Còn một số chỗ dùng emoji vì chưa có icon (loa, rùa, bóng đèn gợi ý, tạm dừng, đóng ✕, menu ☰, dữ liệu/lưu, đồng bộ, cảnh báo); khi người dùng vẽ thêm thì thay.
  - Thẻ chọn nghĩa: 3 đáp án xếp 3 hàng (`choices col`); Chọn từ cho câu 4 đáp án dạng 2×2.
  - Lộ trình: đường nối cong SVG đo vị trí nút thật (`usePathLines` trong Home). Bài sau bài hiện tại chỉ **khóa nhìn** (🔒) nhưng vẫn bấm được.
  - Thẻ chọn nghĩa + Chọn từ cho câu: **chọn trước (đổi ý được) rồi bấm Kiểm tra**. Không có tim. Từ rơi chọn nghĩa và Ghép cặp vẫn bấm là chấm.
  - Hiệu ứng: sao bay khi đúng (`Burst.jsx` Stars), pháo giấy khi xong bài (Confetti), tắt khi prefers-reduced-motion.
- **Điện thoại (≤ 900px):** 5 tab dưới (Tổng quan / Học / Nghe / Nói / Tôi), ẩn khi đang chơi (`playing` trong ctx, ModeShell đặt). Header chỉ còn logo, 🔥, ⚡, avatar; EN/DE và sáng/tối nằm ở trang `#/me` (`pages/Me.jsx`). Cột phải trang chủ thành dải thẻ cuộn ngang phía trên lộ trình. Route `#/learn` liệt kê mọi bài theo nhóm.

## Cấu trúc
- `src/lib/engine.js`, `match.js`, `merge.js`, `store.js`, `sync.js`: chép từ bản cũ, chỉ chỉnh nhỏ. `npm test` (`tests/run.mjs`) kiểm tra bộ gõ với mọi từ. Chạy lại sau khi sửa engine/match hoặc file từ.
- `src/lib/words.js`: kho từ, tiến độ, chọn từ theo trọng số ôn tập.
- `src/lib/answer.js`: chấm điểm (`foreignOk`, `mark`, `grade`), `blankOf` (câu khuyết), `distractors` (đáp án nhiễu cùng loại từ / chủ đề).
- `src/components/ModeShell.jsx`: màn chọn chủ đề chung, chuẩn bị câu ví dụ, ghi lượt chơi. Mỗi game nhận `{items, label, lang, onFinish, onAgain, onExit}`.
- `src/components/GameBar.jsx`: thanh trên cùng của bài (thoát, tiến độ, câu nhắc). Game nhận thêm prop `mode`.
- `src/components/CheckBar.jsx`: thanh kiểm tra / phản hồi ở đáy bài. `Result.jsx` đọc `state.last` (lượt vừa lưu) để hiện XP.
- `src/pages/`: Home, Learn, Settings, Speak và 8 game (9 chế độ, `fall1` dùng FallGame). Danh sách chế độ nằm ở `src/modes.js`.
- Id tiến độ từ tiếng Đức có tiền tố `de:`. Từ riêng (CSV) chỉ áp dụng cho tiếng Anh.

## Trạng thái (20/11/2026)
- Build OK, `npm test` 0 lỗi. Có workflow GitHub Pages (`.github/workflows/deploy.yml`, `base: './'`).
- Đã kiểm tra trong Chrome: Google Dịch đọc vi/en (200), Piper vi tải ~9s và tạo được âm thanh; từ rơi không còn tràn khung.
- Đã chạy thử mọi màn bằng Playwright + Chrome (1366px và 390px), không có lỗi runtime.
- **Chưa test với Gemini key thật:** Live (setup message, model name, âm thanh), sinh câu, chat dự phòng, nhận xét. Việc đầu tiên nên làm khi người dùng có key.
- Chưa test Supabase thật, chưa test iOS thật.
- Đăng nhập/đồng bộ (20/11): đã chạy thử bằng Playwright với Supabase giả (đăng ký, quên mật khẩu, đăng nhập → đẩy lượt chơi kèm mode/xp, kéo lịch sử về, đăng xuất xoá dữ liệu máy, link lỗi). **Chưa có project Supabase thật** (người dùng cần tạo, làm theo README mục "Đăng nhập và đồng bộ").

## Kiểm tra trên trình duyệt
Chrome có ở `C:/Program Files/Google/Chrome/Application/chrome.exe`. Có thể cài tạm `playwright-core` rồi dùng `executablePath` để chụp màn hình. Gỡ ra sau khi xong. Lưu ý trên Windows phải import bằng URL `file:///E:/...`.
