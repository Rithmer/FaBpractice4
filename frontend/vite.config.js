import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function resolveCertFiles(searchDirs) {
  const variants = [
    { cert: "localhost.pem", key: "localhost-key.pem" },
    { cert: "localhost+2.pem", key: "localhost+2-key.pem" },
  ];

  for (const dir of searchDirs) {
    for (const variant of variants) {
      const certPath = path.join(dir, variant.cert);
      const keyPath = path.join(dir, variant.key);
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return { certPath, keyPath };
      }
    }
  }

  return null;
}

export default defineConfig(({ command }) => {
  const server = {
    port: 3001,
    host: "localhost",
  };

  if (command === "serve") {
    const envCertPath = process.env.SSL_CERT_PATH;
    const envKeyPath = process.env.SSL_KEY_PATH;

    let certFiles = null;
    if (envCertPath && envKeyPath) {
      if (fs.existsSync(envCertPath) && fs.existsSync(envKeyPath)) {
        certFiles = { certPath: envCertPath, keyPath: envKeyPath };
      } else {
        throw new Error("Пути SSL_CERT_PATH/SSL_KEY_PATH заданы, но файлы не найдены.");
      }
    }

    if (!certFiles) {
      certFiles = resolveCertFiles([
        __dirname,
        projectRoot,
        path.join(projectRoot, "certs"),
      ]);
    }

    if (!certFiles) {
      throw new Error(
        "HTTPS сертификаты не найдены. Ожидаются localhost.pem + localhost-key.pem или localhost+2.pem + localhost+2-key.pem."
      );
    }

    server.https = {
      key: fs.readFileSync(certFiles.keyPath),
      cert: fs.readFileSync(certFiles.certPath),
    };
  }

  return {
    plugins: [react()],
    server,
  };
});
