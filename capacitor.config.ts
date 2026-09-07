import type { CapacitorConfig } from "@capacitor/cli";

const remoteServerUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "br.com.grupoconexao.app",
  appName: "Grupo Conexão",
  webDir: "dist",
  ...(remoteServerUrl
    ? {
        server: {
          url: remoteServerUrl,
          cleartext: remoteServerUrl.startsWith("http://"),
        },
      }
    : {}),
};

export default config;
