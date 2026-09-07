import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://kdjatuxlryulapclqnud.supabase.co";
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkamF0dXhscnl1bGFwY2xxbnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzQzNDgsImV4cCI6MjA5NTE1MDM0OH0.kcsb-rFvcQprVklbqrDN5TIppJ2Wid-3z_ncJYzfBsQ";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
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
  };
});
