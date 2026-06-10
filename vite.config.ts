import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
    ],
    base: '/Fabris-Gurjao/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                nexus: resolve(__dirname, 'nexus/index.html'),
                financeiro: resolve(__dirname, 'financeiro/index.html'),
            },
        },
    },
})
