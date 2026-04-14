import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks - loaded immediately
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI framework - always needed
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-slot'],
          
          // Utilities - shared across features
          'vendor-common': [
            '@tanstack/react-query',
            'date-fns',
            'zustand',
            'sonner',
            'clsx',
            'class-variance-authority',
            'tailwind-merge'
          ],
          
          // Large libraries - lazy loaded on demand
          'vendor-charts': ['recharts'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          
          // Split admin features (lazy loaded)
          'admin-bundle': [
            'src/pages/admin/AdminDrivers.tsx',
            'src/pages/admin/AdminOverview.tsx',
            'src/components/admin/DriverEarningsAnalytics.tsx',
          ],
          
          // Split driver features (lazy loaded)
          'driver-bundle': [
            'src/pages/driver/DriverDashboard.tsx',
            'src/pages/driver/DriverProfile.tsx',
          ],
          
          // Split shuttle features (lazy loaded)
          'shuttle-bundle': [
            'src/pages/Shuttle.tsx',
            'src/components/shuttle/PickupSelector.tsx',
            'src/components/shuttle/SeatSelector.tsx',
          ],
        },
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg|webp)$/.test(name ?? '')) {
            return 'images/[name]-[hash][extname]';
          } else if (/\.css$/.test(name ?? '')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
}));
