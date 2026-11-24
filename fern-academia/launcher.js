/* Additive entry point for the existing Fern frontend. */
(() => {
  const script = document.currentScript;
  if (!script || document.getElementById("fern-academia-entry")) return;
  const base = new URL("./index.html", script.src);
  const host = document.querySelector("#v-home .home-actions") ||
    document.querySelector("#v-home, main") || document.body;
  const entry = document.createElement("div");
  entry.id = "fern-academia-entry";
  entry.style.cssText = "display:flex;align-items:center;flex-wrap:wrap;gap:.6rem 1rem;margin:.75rem 0";
  const links = [document.createElement("a"), document.createElement("a")];
  const routes = ["home", "games"];
  const sync = () => {
    const lang = document.documentElement.lang.startsWith("en") ? "en" : "th";
    const labels = lang === "en" ? ["Study Academy", "Playroom"] : ["ห้องเตรียมสอบ", "ห้องเกม"];
    links.forEach((link, index) => {
      const target = new URL(base);
      target.search = new URLSearchParams({ lang }).toString();
      target.hash = routes[index];
      link.textContent = labels[index];
      link.href = target.href;
    });
  };
  links.forEach(link => {
    link.style.cssText = "display:inline-flex;align-items:center;min-height:44px;color:inherit;text-underline-offset:5px;font-weight:650";
    entry.append(link);
  });
  sync();
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  // Las entradas van ANTES del grupo de acciones (hermanas, no dentro):
  // .home-actions es una tarjeta agrupada de cristal y las entradas son
  // tarjetas propias que deben destacar fuera de ella (v3.8/v4.0).
  if (host.classList && host.classList.contains("home-actions")) host.before(entry);
  else host.prepend(entry);
})();
