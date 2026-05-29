import { defineConfig } from 'vite';

export default defineConfig({
    base: '/project-peak/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    server: {
        port: 3000,
        open: true
    }
});
