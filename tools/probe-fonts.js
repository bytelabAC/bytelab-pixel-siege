const urls = [
  "https://data.jsdelivr.com/v1/package/npm/vazirmatn@33.0.3/flat",
  "https://data.jsdelivr.com/v1/package/npm/@fontsource/jetbrains-mono/flat"
];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      const j = await r.json();
      const files = (j.files || []).map(f => f.name);
      console.log("==", u, "status", r.status, "files", files.length);
      console.log(files.filter(n => /woff2$/.test(n)).slice(0, 14).join("\n"));
    } catch (e) { console.log("ERR", u, e.message); }
  }
})();
