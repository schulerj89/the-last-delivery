import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const villageDefinitionPath = path.join(repoRoot, 'src', 'world', 'villageDefinition.ts');
const assetRegistryPath = path.join(repoRoot, 'src', 'game', 'assets', 'assetRegistry.ts');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const layoutOverrideDocumentVersion = 1;
const assetFitModes = new Set(['none', 'contain', 'cover', 'exact']);
const worldObjectKinds = new Set([
  'barrel',
  'bush',
  'cart',
  'cottage',
  'crate',
  'delivery-board',
  'mailbox',
  'pavement',
  'post-office',
  'rock',
  'sack',
  'signpost',
  'spawn-point',
  'tree',
  'well',
]);
const gameplayRoles = new Set(['decorative', 'player-spawn', 'post-office', 'delivery-board', 'mailbox']);
const interactionActions = new Set(['none', 'open-delivery-board', 'complete-delivery']);
const mailboxVariants = new Set(['blue', 'red', 'green']);

const getOptionValue = (name) => {
  const inlineValue = args
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (inlineValue !== undefined) {
    return inlineValue;
  }

  const optionIndex = args.indexOf(name);
  const nextArgument = optionIndex >= 0 ? args[optionIndex + 1] : undefined;

  if (optionIndex >= 0 && (!nextArgument || nextArgument.startsWith('--'))) {
    console.error(`[layout] ${name} requires a path value.`);
    process.exit(1);
  }

  return nextArgument;
};

const resolveRepoPath = (value) => (
  path.isAbsolute(value) ? value : path.join(repoRoot, value)
);

const editsPath = resolveRepoPath(getOptionValue('--input') ?? path.join('layout-edits', 'village-layout.json'));
const generatedOutputPath = resolveRepoPath(
  getOptionValue('--output') ?? path.join('src', 'world', 'villageOverrides.generated.ts'),
);

const formatRelative = (filePath) => path.relative(repoRoot, filePath).replaceAll(path.sep, '/');

const readKnownObjectIds = () => {
  const source = readFileSync(villageDefinitionPath, 'utf8');
  const ids = new Set();

  for (const match of source.matchAll(/^\s+id:\s+'([^']+)'/gm)) {
    ids.add(match[1]);
  }

  return ids;
};

const readKnownAssetIds = () => {
  const source = readFileSync(assetRegistryPath, 'utf8');
  const ids = new Set();

  for (const match of source.matchAll(/^\s+id:\s+'([^']+)'/gm)) {
    ids.add(match[1]);
  }

  return ids;
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteTuple3 = (value) => (
  Array.isArray(value)
  && value.length === 3
  && value.every((component) => typeof component === 'number' && Number.isFinite(component))
);

const inferBaseTemplateIdFromObjectId = (objectId, knownObjectIds) => {
  if (!objectId.startsWith('editor-')) {
    return null;
  }

  return Array.from(knownObjectIds)
    .sort((a, b) => b.length - a.length)
    .find((knownObjectId) => objectId.startsWith(`editor-${knownObjectId}-`))
    ?? null;
};

const createRawOverridesById = (overrides) => {
  const overridesById = new Map();

  overrides.forEach((override) => {
    if (isRecord(override) && typeof override.id === 'string') {
      overridesById.set(override.id, override);
    }
  });

  return overridesById;
};

const resolveGeneratedTemplateId = (objectId, templateId, overridesById, knownObjectIds) => {
  let nextTemplateId = templateId;
  const seenObjectIds = new Set([objectId]);

  while (nextTemplateId) {
    if (knownObjectIds.has(nextTemplateId)) {
      return nextTemplateId;
    }

    if (seenObjectIds.has(nextTemplateId)) {
      return null;
    }

    seenObjectIds.add(nextTemplateId);
    const templateOverride = overridesById.get(nextTemplateId);

    if (isRecord(templateOverride)) {
      nextTemplateId = typeof templateOverride.templateId === 'string'
        ? templateOverride.templateId
        : inferBaseTemplateIdFromObjectId(nextTemplateId, knownObjectIds);
    } else {
      nextTemplateId = inferBaseTemplateIdFromObjectId(nextTemplateId, knownObjectIds);
    }
  }

  return inferBaseTemplateIdFromObjectId(objectId, knownObjectIds);
};

const validateLayoutDocument = (value, knownObjectIds) => {
  const errors = [];
  const seenIds = new Set();

  if (!isRecord(value)) {
    return ['Layout override document must be an object.'];
  }

  if (value.version !== layoutOverrideDocumentVersion) {
    errors.push(`Layout override document version must be ${layoutOverrideDocumentVersion}.`);
  }

  if (typeof value.updatedAt !== 'string' || value.updatedAt.trim().length === 0) {
    errors.push('Layout override document must include updatedAt metadata.');
  }

  if (!Array.isArray(value.overrides)) {
    errors.push('Layout override document must include an overrides array.');
    return errors;
  }

  const rawOverridesById = createRawOverridesById(value.overrides);

  value.overrides.forEach((override, index) => {
    if (!isRecord(override)) {
      errors.push(`Override at index ${index} must be an object.`);
      return;
    }

    if (typeof override.id !== 'string' || override.id.trim().length === 0) {
      errors.push(`Override at index ${index} must include a non-empty object id.`);
      return;
    }

    if (seenIds.has(override.id)) {
      errors.push(`Duplicate layout override id: ${override.id}.`);
    }

    seenIds.add(override.id);
    const rawTemplateId = typeof override.templateId === 'string' && override.templateId.trim().length > 0
      ? override.templateId
      : undefined;
    const resolvedTemplateId = resolveGeneratedTemplateId(
      override.id,
      rawTemplateId,
      rawOverridesById,
      knownObjectIds,
    );
    const hasTemplateReference = (
      rawTemplateId !== undefined && knownObjectIds.has(rawTemplateId)
    ) || resolvedTemplateId !== null;

    if (override.kind !== undefined && !worldObjectKinds.has(override.kind)) {
      errors.push(`Override ${override.id} kind must be a valid world object kind.`);
    }

    if (
      override.templateId !== undefined
      && (typeof override.templateId !== 'string' || (!knownObjectIds.has(override.templateId) && resolvedTemplateId === null))
    ) {
      errors.push(`Override ${override.id} templateId must reference a known object id.`);
    }

    if (!knownObjectIds.has(override.id) && override.kind === undefined && !hasTemplateReference) {
      errors.push(`Unknown layout override object id ${override.id} must include kind to create a new object.`);
    }

    if (
      !knownObjectIds.has(override.id)
      && override.templateId === undefined
      && !hasTemplateReference
      && (override.position === undefined || override.dimensions === undefined)
    ) {
      errors.push(`Unknown layout override object id ${override.id} must include templateId or both position and dimensions.`);
    }

    if (override.active !== undefined && typeof override.active !== 'boolean') {
      errors.push(`Override ${override.id} active must be a boolean.`);
    }

    if (override.position !== undefined && !isFiniteTuple3(override.position)) {
      errors.push(`Override ${override.id} position must be a finite [x, y, z] tuple.`);
    }

    if (override.rotation !== undefined && !isFiniteTuple3(override.rotation)) {
      errors.push(`Override ${override.id} rotation must be a finite [x, y, z] tuple.`);
    }

    if (
      override.scaleMultiplier !== undefined
      && (
        typeof override.scaleMultiplier !== 'number'
        || !Number.isFinite(override.scaleMultiplier)
        || override.scaleMultiplier <= 0
      )
    ) {
      errors.push(`Override ${override.id} scaleMultiplier must be a positive number.`);
    }

    if (
      override.yOffset !== undefined
      && (typeof override.yOffset !== 'number' || !Number.isFinite(override.yOffset))
    ) {
      errors.push(`Override ${override.id} yOffset must be a finite number.`);
    }

    if (
      override.dimensions !== undefined
      && (!isFiniteTuple3(override.dimensions) || !override.dimensions.every((component) => component > 0))
    ) {
      errors.push(`Override ${override.id} dimensions must be a positive [x, y, z] tuple.`);
    }

    if (
      override.renderMode !== undefined
      && override.renderMode !== 'primitive'
      && override.renderMode !== 'asset'
    ) {
      errors.push(`Override ${override.id} renderMode must be primitive or asset.`);
    }

    if (
      override.assetId !== undefined
      && (typeof override.assetId !== 'string' || !knownAssetIds.has(override.assetId))
    ) {
      errors.push(`Override ${override.id} assetId must reference a known asset.`);
    }

    if (override.renderMode === 'asset' && typeof override.assetId !== 'string') {
      errors.push(`Override ${override.id} renderMode asset requires assetId.`);
    }

    if (
      override.fitMode !== undefined
      && (typeof override.fitMode !== 'string' || !assetFitModes.has(override.fitMode))
    ) {
      errors.push(`Override ${override.id} fitMode must be a valid asset fit mode.`);
    }

    if (override.collider !== undefined) {
      if (override.collider !== null && (
        !isRecord(override.collider)
        || !isFiniteTuple3(override.collider.position)
        || !isFiniteTuple3(override.collider.size)
        || !override.collider.size.every((component) => component > 0)
      )) {
        errors.push(`Override ${override.id} collider must be null or include position and positive size tuples.`);
      }
    }

    if (override.interactable !== undefined) {
      if (override.interactable !== null && (
        !isRecord(override.interactable)
        || !isFiniteTuple3(override.interactable.position)
        || typeof override.interactable.radius !== 'number'
        || !Number.isFinite(override.interactable.radius)
        || override.interactable.radius <= 0
      )) {
        errors.push(`Override ${override.id} interactable must be null or include position and positive radius.`);
      }
    }

    if (override.objectiveAnchor !== undefined) {
      if (override.objectiveAnchor !== null && (
        !isRecord(override.objectiveAnchor)
        || !isFiniteTuple3(override.objectiveAnchor.position)
      )) {
        errors.push(`Override ${override.id} objectiveAnchor must be null or include a position tuple.`);
      }
    }

    if (override.mailbox !== undefined) {
      if (override.mailbox !== null && (
        !isRecord(override.mailbox)
        || !mailboxVariants.has(override.mailbox.variant)
        || typeof override.mailbox.destinationName !== 'string'
        || override.mailbox.destinationName.trim().length === 0
      )) {
        errors.push(`Override ${override.id} mailbox must be null or include variant and destinationName.`);
      }
    }

    if (override.gameplay !== undefined) {
      if (override.gameplay !== null) {
        if (!isRecord(override.gameplay) || !gameplayRoles.has(override.gameplay.role)) {
          errors.push(`Override ${override.id} gameplay must be null or include a valid role.`);
        }

        if (
          isRecord(override.gameplay)
          && override.gameplay.action !== undefined
          && !interactionActions.has(override.gameplay.action)
        ) {
          errors.push(`Override ${override.id} gameplay action must be a valid interaction action.`);
        }

        if (
          isRecord(override.gameplay)
          && override.gameplay.destinationName !== undefined
          && typeof override.gameplay.destinationName !== 'string'
        ) {
          errors.push(`Override ${override.id} gameplay destinationName must be a string.`);
        }

        if (
          isRecord(override.gameplay)
          && override.gameplay.mailboxVariant !== undefined
          && !mailboxVariants.has(override.gameplay.mailboxVariant)
        ) {
          errors.push(`Override ${override.id} gameplay mailboxVariant must be blue, red, or green.`);
        }
      }
    }

    if (
      override.updatedAt !== undefined
      && (typeof override.updatedAt !== 'string' || override.updatedAt.trim().length === 0)
    ) {
      errors.push(`Override ${override.id} updatedAt must be a non-empty string when provided.`);
    }
  });

  return errors;
};

const readLayoutDocument = () => {
  if (!existsSync(editsPath)) {
    return null;
  }

  return JSON.parse(readFileSync(editsPath, 'utf8'));
};

const createGeneratedSource = (document) => `import type { LayoutOverrideDocument } from './layoutOverrides';

export const generatedVillageLayoutOverrides: LayoutOverrideDocument = ${JSON.stringify(document, null, 2)};
`;

const normalizeLayoutDocument = (document, knownObjectIds) => {
  const rawOverridesById = createRawOverridesById(document.overrides);

  return {
    ...document,
    overrides: document.overrides.map((override) => {
      const rawTemplateId = typeof override.templateId === 'string' && override.templateId.trim().length > 0
        ? override.templateId
        : undefined;
      const resolvedTemplateId = resolveGeneratedTemplateId(
        override.id,
        rawTemplateId,
        rawOverridesById,
        knownObjectIds,
      );

      return resolvedTemplateId && resolvedTemplateId !== override.templateId
        ? { ...override, templateId: resolvedTemplateId }
        : override;
    }),
  };
};

const knownObjectIds = readKnownObjectIds();
const knownAssetIds = readKnownAssetIds();
const document = readLayoutDocument();

if (!document) {
  if (checkOnly) {
    console.info(`[layout] No ${formatRelative(editsPath)} found; nothing to validate.`);
    process.exit(0);
  }

  console.error(`[layout] Missing ${formatRelative(editsPath)}. Export JSON from the placement editor before applying.`);
  process.exit(1);
}

const errors = validateLayoutDocument(document, knownObjectIds);

if (errors.length > 0) {
  errors.forEach((error) => console.error(`[layout] ${error}`));
  process.exit(1);
}

if (checkOnly) {
  console.info(`[layout] ${formatRelative(editsPath)} is valid with ${document.overrides.length} override(s).`);
  process.exit(0);
}

writeFileSync(generatedOutputPath, createGeneratedSource(normalizeLayoutDocument(document, knownObjectIds)), 'utf8');
console.info(`[layout] Wrote ${formatRelative(generatedOutputPath)} from ${formatRelative(editsPath)}.`);
