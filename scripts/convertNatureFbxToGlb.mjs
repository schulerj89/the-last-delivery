import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const convert = require('fbx2gltf');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(repoRoot, 'raw-assets', 'low-poly-nature-pack-lite', 'models');
const outputDir = path.join(repoRoot, 'public', 'assets', 'models', 'nature', 'converted-glb');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const force = args.has('--force');
const expectedNatureFbxStems = [
  'branch01',
  'bush_berries_blue',
  'bush_berries_empty',
  'bush_berries_red',
  'dead_tree',
  'fence',
  'flower02_orange',
  'flower02_pink',
  'flower02_yellow',
  'grass_array01',
  'grass01',
  'grass03',
  'hat_mushroom_brown',
  'hat_mushroom_red',
  'hills01',
  'hills02',
  'log',
  'mountain01',
  'mushrooom01_brown',
  'mushrooom01_red',
  'pine01',
  'plant02',
  'rock',
  'rock_big01',
  'simple_bush',
  'stone01',
  'tent_blue',
  'tent_red',
  'tile_flat',
  'tree01',
  'tree_dead01',
];

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
};

const pathExists = async (targetPath) => {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
};

const getFbxSources = async () => {
  let entries;

  try {
    entries = await readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (checkOnly && error && error.code === 'ENOENT') {
      return expectedNatureFbxStems.map((stem) => `${stem}.fbx`);
    }

    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.fbx')
    .map((entry) => entry.name)
    .sort();
};

const shouldConvert = async (sourcePath, outputPath) => {
  if (force || !(await pathExists(outputPath))) {
    return true;
  }

  const [sourceStats, outputStats] = await Promise.all([stat(sourcePath), stat(outputPath)]);
  return sourceStats.mtimeMs > outputStats.mtimeMs;
};

const sources = await getFbxSources();

if (sources.length === 0) {
  throw new Error(`No FBX files found in ${path.relative(repoRoot, sourceDir)}`);
}

await mkdir(outputDir, { recursive: true });

const results = [];

for (const sourceFile of sources) {
  const sourcePath = path.join(sourceDir, sourceFile);
  const outputFile = `${path.basename(sourceFile, path.extname(sourceFile))}.glb`;
  const outputPath = path.join(outputDir, outputFile);
  const relativeSource = path.relative(repoRoot, sourcePath).replaceAll(path.sep, '/');
  const relativeOutput = path.relative(repoRoot, outputPath).replaceAll(path.sep, '/');

  if (checkOnly) {
    if (!(await pathExists(outputPath))) {
      throw new Error(`Missing converted GLB for ${relativeSource}: expected ${relativeOutput}`);
    }

    const outputStats = await stat(outputPath);
    results.push({ sourceFile, outputFile, bytes: outputStats.size, status: 'ok' });
    continue;
  }

  if (!(await shouldConvert(sourcePath, outputPath))) {
    const outputStats = await stat(outputPath);
    results.push({ sourceFile, outputFile, bytes: outputStats.size, status: 'unchanged' });
    continue;
  }

  await convert(sourcePath, outputPath);
  const outputStats = await stat(outputPath);
  results.push({ sourceFile, outputFile, bytes: outputStats.size, status: 'converted' });
}

const convertedCount = results.filter((result) => result.status === 'converted').length;
const unchangedCount = results.filter((result) => result.status === 'unchanged').length;
const okCount = results.filter((result) => result.status === 'ok').length;
const totalBytes = results.reduce((total, result) => total + result.bytes, 0);

console.info('Nature FBX to GLB');
console.info(`Source: ${path.relative(repoRoot, sourceDir)}`);
console.info(`Output: ${path.relative(repoRoot, outputDir)}`);
console.info(
  checkOnly
    ? `Files: ${results.length}, ok ${okCount}`
    : `Files: ${results.length}, converted ${convertedCount}, unchanged ${unchangedCount}`,
);
console.info(`Output size: ${formatBytes(totalBytes)}`);

for (const result of results) {
  console.info(`- ${result.outputFile} (${formatBytes(result.bytes)}, ${result.status})`);
}
