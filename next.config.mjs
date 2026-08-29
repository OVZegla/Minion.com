/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  /**
   * Pour l'application de bureau, Next produit un serveur autonome
   * (server.js + dépendances minimales) qu'Electron démarre sur 127.0.0.1.
   * Ce mode n'est activé que par « npm run desktop:build ».
   */
  output: process.env.DESKTOP_BUILD === '1' ? 'standalone' : undefined,
};

export default nextConfig;
