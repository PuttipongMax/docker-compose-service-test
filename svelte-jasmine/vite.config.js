import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/jasmine/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true }, // เปิดให้ทดสอบ PWA ตอนรัน dev ได้
      manifest: {
        name: 'Jasmine Scanner',
        short_name: 'JasmineApp',
        description: 'แอปสแกนดอกมะลิออฟไลน์',
        theme_color: '#4CAF50',
        background_color: '#ffffff',
        display: 'standalone', // ทำให้เปิดมาแล้วไม่มีแถบ URL ของเบราว์เซอร์
        icons: [
          {
            src: 'https://via.placeholder.com/192/4CAF50/FFFFFF?text=J', // ไอคอนชั่วคราว
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://via.placeholder.com/512/4CAF50/FFFFFF?text=J',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    watch: { usePolling: true }
  }
})