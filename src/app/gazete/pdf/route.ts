import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

/**
 * Hedef yükseklik: A4 yazdırma alanı (297 − 2×7 = 283 mm) eksi küçük bir pay.
 * Tam 283'e ölçekleyince alt piksel yuvarlaması ikinci sayfayı doğuruyordu.
 */
const PAGE_AREA_MM = 281.5;
/** Yazdırma alanı ölçüleri: 196 × 283 mm (A4 eksi 2×7 mm kenar). */
const PRINT_WIDTH_PX = Math.round((196 / 25.4) * 96);
const PRINT_HEIGHT_PX = Math.round((283 / 25.4) * 96);

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

/** Makinedeki Chrome/Chromium: bilinen yollar → Playwright önbelleği. */
function findBrowser(): string | undefined {
  for (const path of FIXED) {
    if (path && existsSync(path)) return path;
  }
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

type Cdp = {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  close: () => void;
};

/** Tarayıcıyı CDP ile açar (ölçüm + PDF için). */
async function launch(browser: string) {
  const profile = mkdtempSync(join(tmpdir(), "tel-pdf-"));
  const child: ChildProcess = spawn(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + profile,
      "--remote-debugging-port=0",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const wsUrl = await new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("tarayıcı açılamadı (DevTools zaman aşımı)")), 25_000);
    child.stderr?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/ws:\/\/[^\s]+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  return { child, profile, wsUrl };
}

async function connect(wsUrl: string): Promise<Cdp> {
  const httpBase = wsUrl.replace(/^ws:\/\//, "http://").replace(/\/devtools\/browser\/.*$/, "");
  const list = (await (await fetch(httpBase + "/json/list")).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const page = list.find((target) => target.type === "page") ?? list[0];
  if (!page) throw new Error("sayfa hedefi bulunamadı");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map<number, (value: Record<string, unknown>) => void>();

  socket.addEventListener("message", (event: MessageEvent) => {
    const message = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown> };
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)?.(message.result ?? {});
      pending.delete(message.id);
    }
  });

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("DevTools bağlantısı kurulamadı")), { once: true });
  });

  return {
    send: (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        socket.send(JSON.stringify({ id, method, params }));
      }),
    close: () => socket.close(),
  };
}

/** PDF üretir: içeriği ölçer, sayfayı tam dolduracak ölçeği hesaplar. */
async function renderPdf(browser: string, url: string) {
  const { child, profile, wsUrl } = await launch(browser);
  try {
    const cdp = await connect(wsUrl);
    try {
      await cdp.send("Page.enable");
      // ÖNEMLİ: yazdırmada sayfa genişliği 210mm değil, kenar payları düşünce
      // 196mm'dir. 794px (210mm) ile ölçmek kolonları geniş gösterip metni
      // kısaltıyor ve ölçüm ~22mm yanlış çıkıyordu.
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: PRINT_WIDTH_PX,
        height: PRINT_HEIGHT_PX,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
      await cdp.send("Page.navigate", { url });
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 1) İçeriğin doğal yüksekliğini ölç.
      // 2) Artan boşluğu "kısa kısa" bloğuna min-height olarak ekle: kolonlar
      //    öğeleri yayar, sayfa tam dolar, YENİDEN DİZİLİM OLMAZ.
      //    (scale > 1 kullanmak sayfayı daraltıp metni uzatıyordu → 2 sayfa.)
      const measured = (await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const pxPerMm = 96 / 25.4;
          const paper = document.querySelector('.paper');
          const briefs = document.querySelector('.paper-briefs');
          if (!paper || !briefs) return null;
          paper.style.height = 'auto';
          paper.style.minHeight = '0';
          paper.style.overflow = 'visible';
          const naturalMm = paper.getBoundingClientRect().height / pxPerMm;
          const fillMm = Math.max(0, ${PAGE_AREA_MM} - naturalMm);
          const briefsMm = briefs.getBoundingClientRect().height / pxPerMm;
          if (fillMm > 0.5) briefs.style.minHeight = briefsMm + fillMm + 'mm';
          return { naturalMm, fillMm, finalMm: paper.getBoundingClientRect().height / pxPerMm };
        })()`,
        returnByValue: true,
      })) as { result?: { value?: { naturalMm: number; fillMm: number; finalMm: number } | null } };

      const measurement = measured.result?.value;
      if (!measurement) throw new Error("gazete sayfası ölçülemedi");

      // Uzun gün emniyeti: içerik yine de taşarsa küçült (scale < 1 daraltmaz, genişletir).
      const scale = measurement.finalMm > PAGE_AREA_MM
        ? Math.max(0.6, PAGE_AREA_MM / measurement.finalMm)
        : 1;

      const printed = (await cdp.send("Page.printToPDF", {
        printBackground: true,
        preferCSSPageSize: true,
        scale,
      })) as { data?: string };

      const data = printed.data;
      if (!data) throw new Error("PDF verisi boş döndü");
      return { pdf: Buffer.from(data, "base64"), ...measurement, scale };
    } finally {
      cdp.close();
    }
  } finally {
    child.kill("SIGKILL");
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // yoksay
    }
  }
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

  try {
    const { pdf, naturalMm, fillMm, finalMm, scale } = await renderPdf(browser, origin + "/gazete");
    const name = "tel-" + new Date().toISOString().slice(0, 10) + ".pdf";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="' + name + '"',
        "cache-control": "no-store",
        "x-tel-paper":
          "dogal=" + Math.round(naturalMm) + "mm dolgu=" + Math.round(fillMm) + "mm son=" + Math.round(finalMm) + "mm olcek=" + scale.toFixed(3),
      },
    });
  } catch (error) {
    return new Response("PDF üretilemedi: " + String(error) + "\n", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
