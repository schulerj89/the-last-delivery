import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawAssetRoot = path.join(repoRoot, 'raw-assets');
const publicModelsRoot = path.join(repoRoot, 'public', 'assets', 'models');
const expectedPacks = [
  'low-poly-nature-pack-lite',
  'fantasy-free-low-poly',
  'creative-characters-free',
];
const trackedExtensions = new Set(['.glb', '.gltf', '.fbx', '.obj']);

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

const readDirectories = async (targetPath) => {
  if (!(await pathExists(targetPath))) {
    return [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
};

const walkFiles = async (targetPath, packName) => {
  const files = [];
  const entries = await readdir(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath, packName));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!trackedExtensions.has(extension)) {
      continue;
    }

    const fileStats = await stat(fullPath);
    files.push({
      packName,
      extension,
      bytes: fileStats.size,
      relativePath: path.relative(rawAssetRoot, fullPath).replaceAll(path.sep, '/'),
    });
  }

  return files;
};

const walkRuntimeFiles = async (targetPath) => {
  if (!(await pathExists(targetPath))) {
    return [];
  }

  const files = [];
  const entries = await readdir(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkRuntimeFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileStats = await stat(fullPath);
    files.push({
      extension: path.extname(entry.name).toLowerCase(),
      bytes: fileStats.size,
      relativePath: path.relative(publicModelsRoot, fullPath).replaceAll(path.sep, '/'),
    });
  }

  return files;
};

const packFolders = await readDirectories(rawAssetRoot);
const foundExpectedPacks = expectedPacks.filter((packName) => packFolders.includes(packName));
const missingExpectedPacks = expectedPacks.filter((packName) => !packFolders.includes(packName));
const allFiles = [];
const runtimeFiles = await walkRuntimeFiles(publicModelsRoot);

for (const packName of foundExpectedPacks) {
  allFiles.push(...await walkFiles(path.join(rawAssetRoot, packName), packName));
}

const totalsByExtension = [...trackedExtensions].map((extension) => {
  const files = allFiles.filter((file) => file.extension === extension);
  const bytes = files.reduce((sum, file) => sum + file.bytes, 0);

  return {
    extension,
    count: files.length,
    bytes,
  };
});

const totalsByPack = foundExpectedPacks.map((packName) => {
  const files = allFiles.filter((file) => file.packName === packName);
  const bytes = files.reduce((sum, file) => sum + file.bytes, 0);

  return {
    packName,
    count: files.length,
    bytes,
  };
});
const runtimeModelBytes = runtimeFiles.reduce((sum, file) => sum + file.bytes, 0);
const selectedNatureRuntimeFiles = runtimeFiles.filter((file) => (
  file.relativePath.startsWith('nature/')
  && (file.extension === '.glb' || file.extension === '.gltf')
));
const selectedNatureRuntimeBytes = selectedNatureRuntimeFiles.reduce((sum, file) => sum + file.bytes, 0);

console.info('Asset scan');
console.info(`Raw asset root: ${path.relative(repoRoot, rawAssetRoot)}`);
console.info('');
console.info('Pack folders found:');
if (foundExpectedPacks.length === 0) {
  console.info('- none');
} else {
  foundExpectedPacks.forEach((packName) => console.info(`- ${packName}`));
}

console.info('');
console.info('Missing expected folders:');
if (missingExpectedPacks.length === 0) {
  console.info('- none');
} else {
  missingExpectedPacks.forEach((packName) => console.info(`- ${packName}`));
}

console.info('');
console.info('File types detected:');
totalsByExtension.forEach(({ extension, count, bytes }) => {
  console.info(`- ${extension}: ${count} files, ${formatBytes(bytes)}`);
});

console.info('');
console.info('Pack totals:');
if (totalsByPack.length === 0) {
  console.info('- none');
} else {
  totalsByPack.forEach(({ packName, count, bytes }) => {
    console.info(`- ${packName}: ${count} tracked files, ${formatBytes(bytes)}`);
  });
}

console.info('');
console.info('Runtime asset budget:');
console.info(`- public/assets/models total size: ${formatBytes(runtimeModelBytes)}`);
console.info(`- selected nature runtime assets: ${selectedNatureRuntimeFiles.length} files, ${formatBytes(selectedNatureRuntimeBytes)}`);

console.info('');
console.info('Files:');
if (allFiles.length === 0) {
  console.info('- none');
} else {
  allFiles
    .sort((a, b) => a.packName.localeCompare(b.packName) || a.relativePath.localeCompare(b.relativePath))
    .forEach((file) => {
      console.info(`- ${file.relativePath} (${formatBytes(file.bytes)})`);
    });
}
