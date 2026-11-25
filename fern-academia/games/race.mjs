const fallbackAvatar = new URL("./rally3d/assets/avatar.webp", import.meta.url).href;
const animatedMascot = new URL("./rally3d/assets/fern-cargando.gif", import.meta.url).href;
let stylesheet;

function loadStyle() {
  if (stylesheet) return stylesheet;
  const href = new URL("./rally3d/style.css", import.meta.url).href;
  if ([...document.styleSheets].some(sheet => sheet.href === href)) return Promise.resolve();
  stylesheet = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", () => {
      link.remove();
      reject(new Error("Fern Rally styles could not be loaded."));
    }, { once: true });
    document.head.append(link);
  }).catch(error => {
    stylesheet = undefined;
    throw error;
  });
  return stylesheet;
}

function progress(container, lang, label) {
  const wrap = document.createElement("div");
  wrap.className = "rr3-loading";
  wrap.setAttribute("role", "status");
  const image = document.createElement("img");
  image.src = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? fallbackAvatar : animatedMascot;
  image.addEventListener("error", () => { image.src = fallbackAvatar; }, { once: true });
  image.alt = "";
  image.width = image.height = 50;
  image.style.objectFit = "contain";
  const message = document.createElement("span");
  message.textContent = label ?? (lang === "th" ? "กำลังเปิดสนาม…" : "Preparing the starting grid…");
  wrap.append(image, message);
  container.replaceChildren(wrap);
}

export function mount(container, context = {}) {
  const ctx = { ...context, asset: context.asset || (() => fallbackAvatar) };
  let cancelled = false;
  let classic = false;
  let dispose;
  let revision = 0;
  progress(container, ctx.lang);

  async function openClassic() {
    if (cancelled || classic) return;
    classic = true;
    dispose?.();
    dispose = undefined;
    revision++;
    progress(container, ctx.lang, ctx.lang === "th" ? "เปิดกราฟิกแบบคลาสสิก…" : "Opening classic graphics…");
    try {
      const module = await import("./rally3d/classic/race.mjs");
      if (cancelled) return;
      const indicator = document.createElement("p");
      indicator.className = "rr3-foot";
      indicator.textContent = ctx.lang === "th" ? "กราฟิกแบบคลาสสิก" : "Classic graphics";
      if (ctx.exitHref) {
        const back = document.createElement("a");
        back.href = ctx.exitHref;
        back.textContent = ctx.lang === "th" ? " · กลับ" : " · Back";
        indicator.append(back);
      }
      const host = document.createElement("div");
      container.replaceChildren(indicator, host);
      dispose = module.mount(host, ctx);
    } catch {
      if (cancelled) return;
      const message = document.createElement("p");
      message.className = "rr3-foot";
      message.textContent = ctx.lang === "th" ? "เปิดสนามไม่ได้ ลองโหลดหน้านี้อีกครั้ง" : "The circuit could not open. Reload this page to try again.";
      message.setAttribute("role", "alert");
      container.replaceChildren(message);
    }
  }

  async function open3D() {
    const request = ++revision;
    try {
      const [game] = await Promise.all([import("./rally3d/game.mjs"), loadStyle()]);
      if (cancelled || request !== revision) return;
      await new Promise(resolve => setTimeout(resolve, 0));
      if (cancelled || request !== revision) return;
      dispose = game.launch3D(container, ctx, () => void openClassic());
    } catch (error) {
      if (cancelled || request !== revision) return;
      console.warn("Fern Rally switched to classic graphics.", error);
      void openClassic();
    }
  }

  const selected = new URLSearchParams(location.search).get("rallyGraphics");
  if (selected === "classic") void openClassic();
  else void open3D();
  return () => {
    if (cancelled) return;
    cancelled = true;
    revision++;
    dispose?.();
  };
}
