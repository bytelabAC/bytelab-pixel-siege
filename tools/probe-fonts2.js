(async () => {
  const r = await fetch("https://registry.npmjs.org/@fontsource/jetbrains-mono");
  const j = await r.json();
  console.log("latest:", j["dist-tags"].latest);
  const ver = j["dist-tags"].latest;
  const flat = await (await fetch("https://data.jsdelivr.com/v1/package/npm/@fontsource/jetbrains-mono@" + ver + "/flat")).json();
  const files = flat.files.map(f => f.name);
  console.log("total files", files.length);
  console.log(files.filter(n => /latin-(400|700)-normal\.woff2$|LICENSE|OFL/i.test(n)).slice(0, 20).join("\n"));
  const vz = await (await fetch("https://data.jsdelivr.com/v1/package/npm/vazirmatn@33.0.3/flat")).json();
  console.log("--- vazirmatn license files ---");
  console.log(vz.files.map(f => f.name).filter(n => /OFL|LICENSE/i.test(n)).join("\n"));
})();
