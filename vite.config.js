import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './': đường dẫn tương đối để chạy được ở GitHub Pages (https://<user>.github.io/<repo>/) lẫn ở gốc tên miền.
// App định tuyến bằng hash (#/...) nên không cần 404.html.
export default defineConfig({ base: './', plugins: [react()] });
