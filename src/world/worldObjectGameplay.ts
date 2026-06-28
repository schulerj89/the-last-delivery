import type {
  MailboxVariant,
  WorldGameplayDefinition,
  WorldGameplayRole,
  WorldInteractionAction,
  WorldMailboxDefinition,
  WorldObjectDefinition,
} from './types';

export const worldGameplayRoles = [
  'decorative',
  'player-spawn',
  'post-office',
  'delivery-board',
  'mailbox',
] as const satisfies readonly WorldGameplayRole[];

export const worldInteractionActions = [
  'none',
  'open-delivery-board',
  'complete-delivery',
] as const satisfies readonly WorldInteractionAction[];

export const mailboxVariants = ['blue', 'red', 'green'] as const satisfies readonly MailboxVariant[];

export const isWorldGameplayRole = (value: unknown): value is WorldGameplayRole => (
  typeof value === 'string' && worldGameplayRoles.includes(value as WorldGameplayRole)
);

export const isWorldInteractionAction = (value: unknown): value is WorldInteractionAction => (
  typeof value === 'string' && worldInteractionActions.includes(value as WorldInteractionAction)
);

export const isMailboxVariant = (value: unknown): value is MailboxVariant => (
  typeof value === 'string' && mailboxVariants.includes(value as MailboxVariant)
);

export const getDefaultActionForRole = (role: WorldGameplayRole): WorldInteractionAction => {
  if (role === 'delivery-board') {
    return 'open-delivery-board';
  }

  if (role === 'mailbox') {
    return 'complete-delivery';
  }

  return 'none';
};

const deriveGameplayFromKind = (object: WorldObjectDefinition): WorldGameplayDefinition => {
  if (object.kind === 'spawn-point') {
    return { role: 'player-spawn', action: 'none' };
  }

  if (object.kind === 'post-office') {
    return { role: 'post-office', action: 'none' };
  }

  if (object.kind === 'delivery-board') {
    return { role: 'delivery-board', action: 'open-delivery-board' };
  }

  if (object.kind === 'mailbox') {
    return {
      role: 'mailbox',
      action: 'complete-delivery',
      destinationName: object.mailbox?.destinationName,
      mailboxVariant: object.mailbox?.variant,
    };
  }

  return { role: 'decorative', action: 'none' };
};

export const getWorldObjectGameplay = (
  object: WorldObjectDefinition,
): WorldGameplayDefinition => {
  const derived = deriveGameplayFromKind(object);

  if (!object.gameplay) {
    return derived;
  }

  return {
    ...derived,
    ...object.gameplay,
    action: object.gameplay.action ?? getDefaultActionForRole(object.gameplay.role),
  };
};

export const getWorldObjectMailbox = (
  object: WorldObjectDefinition,
): WorldMailboxDefinition | null => {
  const gameplay = getWorldObjectGameplay(object);

  if (object.mailbox) {
    return object.mailbox;
  }

  if (gameplay.role !== 'mailbox' || !gameplay.destinationName || !gameplay.mailboxVariant) {
    return null;
  }

  return {
    destinationName: gameplay.destinationName,
    variant: gameplay.mailboxVariant,
  };
};
