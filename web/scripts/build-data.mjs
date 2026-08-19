import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const webDir = path.resolve(scriptDir, "..");

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: source };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    }
    meta[key] = value;
  }

  return { meta, body: source.slice(match[0].length).trim() };
}

function extractMapInfo(readme) {
  const description = readme.match(/^#[^\n]*\n\n([^\n]+)/m)?.[1]?.trim() ?? "";
  const subfields = readme.match(/## 子领域\s+([^#]+)/)?.[1]
    ?.trim()
    .split("·")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
  return { description, subfields };
}

function extractSummary(body) {
  return body.match(/\*\*一句话描述：\*\*\s*([^\n]+)/)?.[1]?.trim()
    ?? body.match(/## 现象（Observation）\s+[-*]\s*(?:\*\*[^*]+：\*\*\s*)?([^\n]+)/)?.[1]?.trim()
    ?? "";
}

function extractSections(body) {
  return [...body.matchAll(/^##\s+(.+?)(?:\s+\([^)]*\))?\s*$/gm)].map((match) => ({
    title: match[1].trim(),
    anchor: match[1].trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, ""),
  }));
}

async function build() {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const mapDirs = entries
    .filter((entry) => entry.isDirectory() && /^(0[0-8])\s/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const maps = [];
  const models = [];

  for (const mapDir of mapDirs) {
    const number = mapDir.name.slice(0, 2);
    const absoluteDir = path.join(rootDir, mapDir.name);
    const readme = await fs.readFile(path.join(absoluteDir, "README.md"), "utf8");
    const mapInfo = extractMapInfo(readme);
    const files = (await fs.readdir(absoluteDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
      .sort((a, b) => a.name.localeCompare(b.name));

    maps.push({
      id: number,
      name: mapDir.name.slice(3),
      fullName: mapDir.name,
      description: mapInfo.description,
      subfields: mapInfo.subfields,
      modelCount: files.length,
    });

    for (const file of files) {
      const source = await fs.readFile(path.join(absoluteDir, file.name), "utf8");
      const { meta, body } = parseFrontmatter(source);
      if (!meta.id || !meta.title) continue;
      models.push({
        ...meta,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        mapId: number,
        mapName: mapDir.name.slice(3),
        file: `${mapDir.name}/${file.name}`,
        summary: extractSummary(body),
        sections: extractSections(body),
        body,
      });
    }
  }

  const connectionSource = await fs.readFile(path.join(rootDir, "_system/CONNECTIONS.md"), "utf8");
  const connections = connectionSource.split(/\r?\n/).flatMap((line) => {
    if (!line.startsWith("| WM-")) return [];
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const sourceId = cells[0]?.match(/WM-\d{2}-\d{3}/)?.[0];
    const targetId = cells[2]?.match(/WM-\d{2}-\d{3}/)?.[0];
    if (!sourceId || !targetId) return [];
    return [{ source: sourceId, relation: cells[1], target: targetId, mechanism: cells[3], status: cells[4] }];
  });

  const latestUpdated = models.map((model) => model.updated).filter(Boolean).sort().at(-1) ?? null;
  const data = { latestUpdated, maps, models, connections };
  const output = `/* 由 web/scripts/build-data.mjs 自动生成，请勿手动编辑。 */\nwindow.WORLD_MODEL_DATA = ${JSON.stringify(data, null, 2)};\n`;
  await fs.writeFile(path.join(webDir, "data.generated.js"), output, "utf8");
  console.log(`Generated web data: ${models.length} models, ${maps.length} maps, ${connections.length} connections.`);
}

await build();
