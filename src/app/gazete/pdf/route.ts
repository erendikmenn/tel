import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Her istekte taze PDF üretilir (sayfa zaten ISR ile önbellekte).
export const dynamic = "force-dynamic";

/** Makinedeki Chrome/Chromium: önce bilinen yollar, sonra Playwright önbelleği. */
const FIXED = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function playwrightBrowser(): string | undefined {
  const roots = [
    join(process.env.HOME ?? "", "Library/Caches/ms-playwright"),
    join(process.env.HOME ?? "", ".cache/ms-playwright"),
  ];
  const relative = [
    "chrome-headless-shell-mac-arm64/chrome-headless-shell",
    "chrome-headless-shell-mac-x64/chrome-headless-shell",
    "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    "chrome-linux/headless_shell",
    "chrome-linux/chrome",
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root)) {
      if (!dir.startsWith("chromium")) continue;
      for (const rel of relative) {
        const candidate = join(root, dir, rel);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

function findBrowser(): string | undefined {
  for (const path of FIXED) {
    if (path && existsSync(path)) return path;
  }
  return playwrightBrowser();
}

/** Headless tarayıcıyla sayfayı PDF'e basar. */
function printToPdf(browser: string, url: string, out: string, timeoutMs = 40_000) {
  return new Promise<void>((resolve, reject) => {
    const profile = mkdtempSync(join(tmpdir(), "tel-pdf-"));
    const child = spawn(
      browser,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=" + profile,
        // Tarayıcının kenar boşluğuna bastığı "localhost:3000" satırını kaldırır.
        "--no-pdf-header-footer",
        "--virtual-time-budget=8000",
        "--print-to-pdf=" + out,
        url,
      ],
      { stdio: "ignore" },
    );

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("tarayıcı zaman aşımına uğradı"));
    }, timeoutMs);

    const clean = () => {
      clearTimeout(timer);
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        // yoksay
      }
    };

    child.on("error", (error) => {
      clean();
      reject(error);
    });
    child.on("exit", (code) => {
      clean();
      if (code === 0 && existsSync(out)) resolve();
      else reject(new Error("tarayıcı çıkış kodu " + code));
    });
  });
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const browser = findBrowser();

  if (!browser) {
    return new Response(
      "PDF üretmek için Chrome/Chromium bulunamadı. Sayfadaki **Yazdır** düğmesiyle PDF olarak kaydedebilirsin.\n",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const workdir = mkdtempSync(join(tmpdir(), "tel-pdf-out-"));
  const out = join(workdir, "gazete.pdf");

  try {
    await printToPdf(browser, origin + "/gazete", out);
    const pdf = readFileSync(out);
    const name = "tel-" + new Date().toISOString().slice(0, 10) + ".pdf";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="' + name + '"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response("PDF üretilemedi: " + String(error) + "\n", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } finally {
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {
      // yoksay
    }
  }
}
