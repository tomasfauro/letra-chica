/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // 🔒 Evita que se cargue el entrypoint con demo (index.js)
    // y dirige todo a lib/pdf-parse.js
    config.resolve.alias["pdf-parse"] = "pdf-parse/lib/pdf-parse.js";
    config.resolve.alias["pdf-parse/index.js"] = "pdf-parse/lib/pdf-parse.js";
    return config;
  },
};

export default nextConfig;
