import { Vector3 } from 'three';
import { assetRegistry, isKnownAssetId } from '../src/game/assets/assetRegistry';
import { thirdPersonCameraSettings } from '../src/game/camera';
import { resolvePlayerCollision } from '../src/game/collision';
import { createDeliveryController, deliveryJobs } from '../src/game/delivery';
import { playerMovementSettings } from '../src/game/player';
import { createPlayground } from '../src/world/playground';
import { playgroundCollisionWorld } from '../src/world/playgroundCollision';
import { createPlaygroundInteractables } from '../src/world/playgroundInteractables';
import {
  createDeliveryBoardObjectiveMarker,
  createDeliveryTargetObjectiveMarker,
  objectiveMarkerSettings,
  resolveObjectiveAnchorForWorldObject,
  setObjectiveMarkerTarget,
  updateObjectiveMarker,
} from '../src/world/playgroundObjectiveMarker';
import { villageWorldObjects } from '../src/world/villageDefinition';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const isFiniteVector3Tuple = (value: readonly number[]): boolean => (
  value.length === 3 && value.every((component) => Number.isFinite(component))
);

const runAssetRegistrySmoke = (): void => {
  const assetIds = new Set<string>();

  assetRegistry.forEach((asset) => {
    assert(!assetIds.has(asset.id), `Asset id should be unique: ${asset.id}`);
    assetIds.add(asset.id);
    assert(asset.kind === 'gltf', `Asset should use the GLTF loader path: ${asset.id}`);
    assert(asset.url.startsWith('/assets/models/'), `Asset should load from public assets models: ${asset.id}`);
    assert(asset.url.endsWith('.glb'), `Asset should point to a GLB file: ${asset.id}`);
    assert(asset.maxRecommendedBytes > 0, `Asset should define a positive size budget: ${asset.id}`);
  });
};

const runWorldDefinitionSmoke = (): void => {
  const ids = new Set<string>();

  villageWorldObjects.forEach((object) => {
    assert(!ids.has(object.id), `World object id should be unique: ${object.id}`);
    ids.add(object.id);
    assert(isFiniteVector3Tuple(object.position), `World object should have a valid position: ${object.id}`);

    if (object.dimensions) {
      assert(
        isFiniteVector3Tuple(object.dimensions) && object.dimensions.every((component) => component > 0),
        `World object should have positive dimensions: ${object.id}`,
      );
    }

    if (object.render?.mode === 'asset') {
      assert(isKnownAssetId(object.render.assetId), `World object assetId should reference a known asset: ${object.id}`);
    }

    if (object.interactable) {
      assert(isFiniteVector3Tuple(object.interactable.position), `Interactable should have a valid position: ${object.id}`);
      assert(object.interactable.radius > 0, `Interactable should have a positive radius: ${object.id}`);
    }

    if (object.collider) {
      assert(isFiniteVector3Tuple(object.collider.position), `Collider should have a valid position: ${object.id}`);
      assert(
        object.collider.size.every((component) => component > 0),
        `Collider should have positive size components: ${object.id}`,
      );
    }
  });

  const mailboxObjects = villageWorldObjects.filter((object) => object.kind === 'mailbox');
  const cottageObjects = villageWorldObjects.filter((object) => object.kind === 'cottage');
  const assetRenderedObjects = villageWorldObjects.filter((object) => object.render?.mode === 'asset');
  const deliveryBoard = villageWorldObjects.find((object) => object.id === 'delivery-board');
  const postOffice = villageWorldObjects.find((object) => object.id === 'post-office');
  const well = villageWorldObjects.find((object) => object.id === 'town-well');

  deliveryJobs.forEach((job) => {
    const target = villageWorldObjects.find((object) => object.id === job.targetWorldObjectId);

    assert(target !== undefined, `Delivery job target world object should exist: ${job.id}`);
    assert(target.kind === 'mailbox', `Delivery job target should be a mailbox: ${job.id}`);
    assert(target.id === job.targetInteractableId, `Delivery job target ids should match current mailbox interactables: ${job.id}`);
    assert(target.interactable !== undefined, `Delivery job target should be interactable: ${job.id}`);
    assert(target.objectiveAnchor !== undefined, `Delivery job target should have an objective anchor: ${job.id}`);
    assert(job.destinationName.trim().length > 0, `Delivery job should have a destination name: ${job.id}`);
    assert(job.destinationName.includes('House Mailbox'), `Delivery job destination should be player-readable: ${job.id}`);
    assert(job.description.trim().length > 0, `Delivery job should have a description: ${job.id}`);
    assert(Number.isFinite(job.reward) && job.reward > 0, `Delivery job reward should be positive: ${job.id}`);
  });

  assert(deliveryJobs.length >= 3, 'Village should define at least three delivery jobs.');
  assert(assetRenderedObjects.length === 1, 'Village should only opt one low-risk prop into GLB rendering for now.');
  assert(assetRenderedObjects[0].id === 'crate-large', 'The large crate should be the first optional GLB prop target.');
  assert(mailboxObjects.length === 2, 'Village should define exactly two mailbox placeholders.');
  assert(mailboxObjects.every((object) => object.interactable), 'Every village mailbox should be interactable.');
  assert(mailboxObjects.every((object) => object.objectiveAnchor), 'Every village mailbox should have an objective anchor.');
  assert(cottageObjects.length === 3, 'Village should define exactly three cottage placeholders.');
  assert(deliveryBoard !== undefined, 'Delivery board world object should exist.');
  assert(postOffice !== undefined, 'Post office world object should exist.');
  assert(well !== undefined, 'Town-square well world object should exist.');

  const boardToPostOfficeDistanceSq = (
    (deliveryBoard.position[0] - postOffice.position[0]) ** 2
    + (deliveryBoard.position[2] - postOffice.position[2]) ** 2
  );
  assert(boardToPostOfficeDistanceSq < 8, 'Delivery board should stay near the post office placeholder.');
};

const runDeliveryStateSmoke = (): void => {
  const delivery = createDeliveryController();
  const firstDelivery = deliveryJobs[0];
  const wrongTarget = deliveryJobs.find((job) => job.targetInteractableId !== firstDelivery.targetInteractableId);

  assert(wrongTarget !== undefined, 'Delivery jobs should include at least two mailbox targets.');

  assert(delivery.getState().status === 'idle', 'Delivery should start idle.');
  assert(delivery.getState().activeDeliveryId === null, 'Delivery should start without an active delivery.');
  assert(delivery.getState().completedCount === 0, 'Completed count should start at 0.');
  assert(delivery.getAvailableDeliveries().length === deliveryJobs.length, 'Available delivery list should initialize.');
  assert(delivery.acceptDelivery('missing-delivery') === 'Delivery job unavailable.', 'Invalid delivery ids should be handled safely.');
  assert(delivery.getState().activeDeliveryId === null, 'Invalid delivery ids should not set an active delivery.');

  assert(delivery.acceptDelivery(firstDelivery.id).includes(firstDelivery.title), 'Accepting delivery by id should return the active delivery title.');
  assert(delivery.getState().status === 'delivery-accepted', 'Accepted delivery should update status.');
  assert(delivery.getState().activeDeliveryId === firstDelivery.id, 'Accepting delivery should set the active delivery id.');
  assert(delivery.getState().activeTargetId === firstDelivery.targetInteractableId, 'Accepting delivery should set the active target id.');

  assert(
    delivery.completeDelivery(wrongTarget.targetInteractableId).startsWith('Wrong mailbox.'),
    'Wrong target should not complete the delivery.',
  );
  assert(delivery.getState().completedCount === 0, 'Wrong target should not increment completed count.');
  assert(delivery.getState().activeDeliveryId === firstDelivery.id, 'Wrong target should keep the active delivery.');

  assert(
    delivery.completeDelivery(firstDelivery.targetInteractableId).includes(firstDelivery.title),
    'Completing the correct target should return confirmation.',
  );
  assert(delivery.getState().status === 'delivery-completed', 'Completed delivery should update state.');
  assert(delivery.getState().completedCount === 1, 'Completing delivery should increment count.');
  assert(delivery.getState().completedDeliveryIds.includes(firstDelivery.id), 'Completing delivery should track completed ids.');
  assert(
    !delivery.getAvailableDeliveries().some((job) => job.id === firstDelivery.id),
    'Completed jobs should not stay available.',
  );

  const secondDelivery = deliveryJobs[1];
  assert(delivery.acceptDelivery(secondDelivery.id).includes(secondDelivery.title), 'Board should accept a selected available delivery.');
  assert(delivery.getState().activeDeliveryId === secondDelivery.id, 'Selected available delivery should become active.');
};

const runInteractionSmoke = (): void => {
  const delivery = createDeliveryController();
  let boardOpened = false;
  const interactables = createPlaygroundInteractables(delivery, {
    openDeliveryBoard: () => {
      boardOpened = true;
      return 'Delivery board opened.';
    },
  });
  const mailbox = interactables.find((interactable) => interactable.id === 'mailbox');
  const eastMailbox = interactables.find((interactable) => interactable.id === 'mailbox-east');
  const board = interactables.find((interactable) => interactable.id === 'delivery-board');

  assert(mailbox !== undefined, 'Mailbox interactable should initialize.');
  assert(eastMailbox !== undefined, 'East mailbox interactable should initialize.');
  assert(board !== undefined, 'Delivery board interactable should initialize.');

  assert(typeof board.prompt === 'function' && board.prompt() === 'Open delivery board', 'Board should prompt for opening the delivery board.');
  assert(board.interact() === 'Delivery board opened.', 'Board interaction should open the delivery board.');
  assert(boardOpened, 'Board interaction should call the delivery board overlay opener.');
  assert(delivery.getState().activeDeliveryId === null, 'Opening the board should not auto-accept a delivery.');

  assert(delivery.acceptDelivery(deliveryJobs[0].id).includes(deliveryJobs[0].title), 'Selected delivery should be accepted by id.');
  assert(typeof board.prompt === 'function' && board.prompt().includes('in progress'), 'Board should report an active delivery.');

  assert(typeof mailbox.prompt === 'function' && mailbox.prompt() === 'Complete delivery', 'Mailbox should prompt for completion after acceptance.');
  assert(typeof eastMailbox.prompt === 'function' && eastMailbox.prompt() === 'Wrong mailbox', 'Wrong mailbox should prompt clearly.');
  assert(eastMailbox.interact().startsWith('Wrong mailbox.'), 'Wrong mailbox interaction should not complete delivery.');
  assert(delivery.getState().completedCount === 0, 'Wrong mailbox interaction should not increment delivery count.');
  assert(mailbox.interact().includes(deliveryJobs[0].title), 'Correct mailbox interaction should complete delivery.');
  assert(delivery.getState().completedCount === 1, 'Mailbox completion should increment delivery count.');
};

const runModuleSmoke = (): void => {
  assert(playerMovementSettings.maxSpeed > 0, 'Player max speed should be positive.');
  assert(playerMovementSettings.radius > 0, 'Player collision radius should be positive.');
  assert(thirdPersonCameraSettings.distance > 0, 'Camera distance should be positive.');
  assert(thirdPersonCameraSettings.minPitch < thirdPersonCameraSettings.maxPitch, 'Camera pitch limits should be ordered.');
  assert(playgroundCollisionWorld.boxes.length >= 2, 'Playground collision boxes should initialize.');
  assert(
    playgroundCollisionWorld.boxes.length === villageWorldObjects.filter((object) => object.collider).length,
    'Collision boxes should be generated from collidable world objects.',
  );
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'mailbox'), 'Mailbox collision box should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'post-office'), 'Post office collision box should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'cottage-west'), 'Village cottage collision should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'town-well'), 'Town well collision should initialize.');

  const playground = createPlayground();
  assert(playground.name === 'village:square-blockout', 'Village square blockout should initialize.');
  assert(playground.children.length > 20, 'Village square should include primitive blockout children.');
  assert(playground.getObjectByName('village:crate-large') !== undefined, 'Asset-targeted crate fallback should initialize.');
  assert(playground.getObjectByName('village:label-post-office') !== undefined, 'Post office label sign should initialize.');
  assert(playground.getObjectByName('village:label-blue-house') !== undefined, 'Blue house label sign should initialize.');
  assert(playground.getObjectByName('village:label-red-house') !== undefined, 'Red house label sign should initialize.');
  assert(playground.getObjectByName('village:label-side-path') !== undefined, 'Side path label sign should initialize.');

  const resolved = resolvePlayerCollision(
    new Vector3(99, 0, 99),
    playgroundCollisionWorld,
    playerMovementSettings.radius,
  );
  assert(resolved.hitBounds, 'Collision should report bounds hit for out-of-bounds position.');
  assert(resolved.position.x <= playgroundCollisionWorld.bounds.maxX, 'Collision should clamp X inside bounds.');
  assert(resolved.position.z <= playgroundCollisionWorld.bounds.maxZ, 'Collision should clamp Z inside bounds.');

  const marker = createDeliveryTargetObjectiveMarker();
  assert(marker.name === 'objective:delivery-target', 'Delivery target objective marker should initialize.');
  assert(marker.visible === false, 'Delivery target objective marker should start hidden.');
  assert(marker.getObjectByName('objective:delivery-target:halo') !== undefined, 'Delivery target objective marker should include a readable halo.');
  assert(objectiveMarkerSettings.bobAmplitude >= 0.1, 'Objective marker bob should be readable from distance.');
  assert(resolveObjectiveAnchorForWorldObject(deliveryJobs[0].targetWorldObjectId).length === 3, 'Objective marker should resolve active target anchors.');
  assert(setObjectiveMarkerTarget(marker, deliveryJobs[0].targetWorldObjectId), 'Objective marker should accept an active target.');
  assert(marker.userData.targetWorldObjectId === deliveryJobs[0].targetWorldObjectId, 'Objective marker should track target object id.');

  const boardMarker = createDeliveryBoardObjectiveMarker();
  assert(boardMarker.name === 'objective:delivery-board', 'Delivery board objective marker should initialize.');
  updateObjectiveMarker(boardMarker, 1);
  assert(boardMarker.position.y > 0, 'Objective marker animation should keep marker above the ground.');
};

runAssetRegistrySmoke();
runWorldDefinitionSmoke();
runDeliveryStateSmoke();
runInteractionSmoke();
runModuleSmoke();

console.info('Smoke checks passed.');
