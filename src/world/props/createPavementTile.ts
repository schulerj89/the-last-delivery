import * as THREE from 'three';

export interface PavementTileOptions {
  name: string;
  seed: string;
  dimensions: THREE.Vector3Tuple;
  position: THREE.Vector3Tuple;
  rotationY?: number;
}

export interface PavementTileGridSize {
  columns: number;
  rows: number;
}

export const pavementTileDetailConfig = {
  targetStoneSize: 1,
  maxColumns: 8,
  maxRows: 8,
  jointGap: 0.045,
  relief: 0.012,
  palette: [
    0x8f8a7a,
    0x9b927d,
    0x817b6c,
    0xa09582,
    0x756f62,
    0x96886f,
  ],
  sideDarken: 0.68,
} as const;

const clamp = (value: number, min: number, max: number): number => (
  Math.min(Math.max(value, min), max)
);

const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const getPavementTileGridSize = (
  dimensions: THREE.Vector3Tuple,
): PavementTileGridSize => {
  const width = Math.max(dimensions[0], 0.1);
  const depth = Math.max(dimensions[2], 0.1);

  return {
    columns: clamp(Math.round(width / pavementTileDetailConfig.targetStoneSize), 1, pavementTileDetailConfig.maxColumns),
    rows: clamp(Math.round(depth / pavementTileDetailConfig.targetStoneSize), 1, pavementTileDetailConfig.maxRows),
  };
};

const pushFace = (
  positions: number[],
  normals: number[],
  colors: number[],
  indices: number[],
  corners: readonly THREE.Vector3[],
  normal: THREE.Vector3,
  color: THREE.Color,
): void => {
  const vertexIndex = positions.length / 3;

  corners.forEach((corner) => {
    positions.push(corner.x, corner.y, corner.z);
    normals.push(normal.x, normal.y, normal.z);
    colors.push(color.r, color.g, color.b);
  });

  indices.push(
    vertexIndex,
    vertexIndex + 1,
    vertexIndex + 2,
    vertexIndex,
    vertexIndex + 2,
    vertexIndex + 3,
  );
};

const pushStone = (
  positions: number[],
  normals: number[],
  colors: number[],
  indices: number[],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  color: THREE.Color,
): void => {
  const sideColor = color.clone().multiplyScalar(pavementTileDetailConfig.sideDarken);
  const topColor = color;

  pushFace(positions, normals, colors, indices, [
    new THREE.Vector3(x0, y1, z0),
    new THREE.Vector3(x0, y1, z1),
    new THREE.Vector3(x1, y1, z1),
    new THREE.Vector3(x1, y1, z0),
  ], new THREE.Vector3(0, 1, 0), topColor);

  pushFace(positions, normals, colors, indices, [
    new THREE.Vector3(x0, y0, z1),
    new THREE.Vector3(x0, y0, z0),
    new THREE.Vector3(x1, y0, z0),
    new THREE.Vector3(x1, y0, z1),
  ], new THREE.Vector3(0, -1, 0), sideColor);

  pushFace(positions, normals, colors, indices, [
    new THREE.Vector3(x1, y0, z0),
    new THREE.Vector3(x0, y0, z0),
    new THREE.Vector3(x0, y1, z0),
    new THREE.Vector3(x1, y1, z0),
  ], new THREE.Vector3(0, 0, -1), sideColor);

  pushFace(positions, normals, colors, indices, [
    new THREE.Vector3(x0, y0, z1),
    new THREE.Vector3(x1, y0, z1),
    new THREE.Vector3(x1, y1, z1),
    new THREE.Vector3(x0, y1, z1),
  ], new THREE.Vector3(0, 0, 1), sideColor);

  pushFace(positions, normals, colors, indices, [
    new THREE.Vector3(x0, y0, z0),
    new THREE.Vector3(x0, y0, z1),
    new THREE.Vector3(x0, y1, z1),
    new THREE.Vector3(x0, y1, z0),
  ], new THREE.Vector3(-1, 0, 0), sideColor);

  pushFace(positions, normals, colors, indices, [
    new THREE.Vector3(x1, y0, z1),
    new THREE.Vector3(x1, y0, z0),
    new THREE.Vector3(x1, y1, z0),
    new THREE.Vector3(x1, y1, z1),
  ], new THREE.Vector3(1, 0, 0), sideColor);
};

export const createPavementTileGeometry = (
  dimensions: THREE.Vector3Tuple,
  seed: string,
): THREE.BufferGeometry => {
  const width = Math.max(dimensions[0], 0.1);
  const height = Math.max(dimensions[1], 0.02);
  const depth = Math.max(dimensions[2], 0.1);
  const { columns, rows } = getPavementTileGridSize([width, height, depth]);
  const cellWidth = width / columns;
  const cellDepth = depth / rows;
  const gap = Math.min(
    pavementTileDetailConfig.jointGap,
    cellWidth * 0.18,
    cellDepth * 0.18,
  );
  const y0 = -height / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const stoneHash = hashString(`${seed}:${row}:${column}`);
      const paletteColor = pavementTileDetailConfig.palette[stoneHash % pavementTileDetailConfig.palette.length];
      const reliefStep = ((stoneHash >>> 8) % 3) / 2;
      const y1 = height / 2 + reliefStep * pavementTileDetailConfig.relief;
      const rowOffset = row % 2 === 0 ? 0 : cellWidth * 0.16;
      const tileMinX = -width / 2;
      const tileMaxX = width / 2;
      const tileMinZ = -depth / 2;
      const tileMaxZ = depth / 2;
      const minX = tileMinX + column * cellWidth + (column === 0 ? 0 : gap / 2) + rowOffset;
      const maxX = tileMinX + (column + 1) * cellWidth - (column === columns - 1 ? 0 : gap / 2) + rowOffset;
      const x0 = column === 0 ? tileMinX : clamp(minX, tileMinX, tileMaxX);
      const x1 = column === columns - 1 ? tileMaxX : clamp(maxX, tileMinX, tileMaxX);
      const z0 = row === 0 ? tileMinZ : tileMinZ + row * cellDepth + gap / 2;
      const z1 = row === rows - 1 ? tileMaxZ : tileMinZ + (row + 1) * cellDepth - gap / 2;

      if (x1 <= x0 || z1 <= z0) {
        continue;
      }

      pushStone(
        positions,
        normals,
        colors,
        indices,
        x0,
        x1,
        y0,
        y1,
        z0,
        z1,
        new THREE.Color(paletteColor),
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

export const createPavementTileMaterial = (): THREE.MeshStandardMaterial => (
  new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  })
);

export const createPavementTileMesh = ({
  name,
  seed,
  dimensions,
  position,
  rotationY = 0,
}: PavementTileOptions): THREE.Mesh => {
  const mesh = new THREE.Mesh(
    createPavementTileGeometry(dimensions, seed),
    createPavementTileMaterial(),
  );

  mesh.name = name;
  mesh.userData.label = name;
  mesh.userData.pavementGrid = getPavementTileGridSize(dimensions);
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  mesh.receiveShadow = true;
  return mesh;
};
