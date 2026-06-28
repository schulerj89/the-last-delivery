import { Vector3 } from 'three';
import { thirdPersonCameraSettings } from '../src/game/camera';
import { resolvePlayerCollision } from '../src/game/collision';
import { createDeliveryController } from '../src/game/delivery';
import { playerMovementSettings } from '../src/game/player';
import { createPlayground } from '../src/world/playground';
import { playgroundCollisionWorld } from '../src/world/playgroundCollision';
import { createPlaygroundInteractables } from '../src/world/playgroundInteractables';
import {
  createDeliveryBoardObjectiveMarker,
  createMailboxObjectiveMarker,
  updateObjectiveMarker,
} from '../src/world/playgroundObjectiveMarker';
import { deliveryTargetObjectId, villageWorldObjects } from '../src/world/villageDefinition';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const isFiniteVector3Tuple = (value: readonly number[]): boolean => (
  value.length === 3 && value.every((component) => Number.isFinite(component))
);

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
  const deliveryTarget = villageWorldObjects.find((object) => object.id === deliveryTargetObjectId);
  const deliveryBoard = villageWorldObjects.find((object) => object.id === 'delivery-board');
  const postOffice = villageWorldObjects.find((object) => object.id === 'post-office');
  const well = villageWorldObjects.find((object) => object.id === 'town-well');

  assert(deliveryTarget !== undefined, 'Delivery target world object should exist.');
  assert(deliveryTarget.kind === 'mailbox', 'Delivery target should be a mailbox.');
  assert(deliveryTarget.interactable !== undefined, 'Delivery target should be interactable.');
  assert(deliveryTarget.objectiveAnchor !== undefined, 'Delivery target should have an objective anchor.');
  assert(mailboxObjects.length === 2, 'Village should define exactly two mailbox placeholders.');
  assert(mailboxObjects.filter((object) => object.interactable).length === 1, 'Only one mailbox should be interactable for now.');
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

  assert(delivery.getState().status === 'idle', 'Delivery should start idle.');
  assert(delivery.getState().completedCount === 0, 'Completed count should start at 0.');

  assert(delivery.acceptDelivery() === 'Delivery accepted.', 'Accepting delivery should return confirmation.');
  assert(delivery.getState().status === 'delivery-accepted', 'Accepted delivery should update state.');

  assert(delivery.completeDelivery() === 'Delivery completed.', 'Completing delivery should return confirmation.');
  assert(delivery.getState().status === 'delivery-completed', 'Completed delivery should update state.');
  assert(delivery.getState().completedCount === 1, 'Completing delivery should increment count.');
};

const runInteractionSmoke = (): void => {
  const delivery = createDeliveryController();
  const interactables = createPlaygroundInteractables(delivery);
  const mailbox = interactables.find((interactable) => interactable.id === 'mailbox');
  const board = interactables.find((interactable) => interactable.id === 'delivery-board');

  assert(mailbox !== undefined, 'Mailbox interactable should initialize.');
  assert(board !== undefined, 'Delivery board interactable should initialize.');

  assert(typeof board.prompt === 'function' && board.prompt() === 'Accept delivery', 'Board should prompt for delivery acceptance.');
  assert(board.interact() === 'Delivery accepted.', 'Board interaction should accept delivery.');

  assert(typeof mailbox.prompt === 'function' && mailbox.prompt() === 'Complete delivery', 'Mailbox should prompt for completion after acceptance.');
  assert(mailbox.interact() === 'Delivery completed.', 'Mailbox interaction should complete delivery.');
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

  const resolved = resolvePlayerCollision(
    new Vector3(99, 0, 99),
    playgroundCollisionWorld,
    playerMovementSettings.radius,
  );
  assert(resolved.hitBounds, 'Collision should report bounds hit for out-of-bounds position.');
  assert(resolved.position.x <= playgroundCollisionWorld.bounds.maxX, 'Collision should clamp X inside bounds.');
  assert(resolved.position.z <= playgroundCollisionWorld.bounds.maxZ, 'Collision should clamp Z inside bounds.');

  const marker = createMailboxObjectiveMarker();
  assert(marker.name === 'objective:mailbox', 'Mailbox objective marker should initialize.');
  assert(marker.visible === false, 'Mailbox objective marker should start hidden.');

  const boardMarker = createDeliveryBoardObjectiveMarker();
  assert(boardMarker.name === 'objective:delivery-board', 'Delivery board objective marker should initialize.');
  updateObjectiveMarker(boardMarker, 1);
  assert(boardMarker.position.y > 0, 'Objective marker animation should keep marker above the ground.');
};

runWorldDefinitionSmoke();
runDeliveryStateSmoke();
runInteractionSmoke();
runModuleSmoke();

console.info('Smoke checks passed.');
