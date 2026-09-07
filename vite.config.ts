import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "recharts",
      "framer-motion",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "react-hook-form",
      "date-fns",
      "embla-carousel-react",
      "lucide-react",
    ],
    exclude: [
      "@capacitor/core",
      "@capacitor/push-notifications",
      "@capacitor/android",
      "@capacitor/ios",
    ],
  },
}));
