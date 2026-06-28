import type { DeliveryController, DeliveryJob, DeliveryState } from './types';

export interface DeliveryBoardOverlay {
  open(): string;
  close(): void;
  update(state: DeliveryState): void;
  isOpen(): boolean;
  dispose(): void;
}

export interface DeliveryBoardOverlayOptions {
  delivery: DeliveryController;
  parent: HTMLElement;
  inputTarget?: Window;
}

const createTextElement = (
  tagName: keyof HTMLElementTagNameMap,
  className: string,
  textContent: string,
): HTMLElement => {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = textContent;
  return element;
};

export const createDeliveryBoardOverlay = ({
  delivery,
  parent,
  inputTarget = window,
}: DeliveryBoardOverlayOptions): DeliveryBoardOverlay => {
  const overlay = document.createElement('section');
  overlay.className = 'delivery-board-overlay';
  overlay.dataset.deliveryBoardOverlay = 'true';
  overlay.hidden = true;
  parent.append(overlay);

  let visibleJobs: readonly DeliveryJob[] = [];
  let open = false;
  let renderKey = '';

  const getRenderKey = (state: DeliveryState): string => (
    [
      state.status,
      state.activeDeliveryId ?? 'none',
      state.completedDeliveryIds.join(','),
    ].join('|')
  );

  const close = (): void => {
    open = false;
    overlay.hidden = true;
  };

  const acceptJob = (jobId: string): string => {
    const result = delivery.acceptDelivery(jobId);
    if (delivery.getState().activeDeliveryId === jobId) {
      close();
    } else {
      render();
    }

    return result;
  };

  const renderJob = (job: DeliveryJob, index: number): HTMLElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delivery-board-job';
    button.dataset.deliveryJobId = job.id;

    const number = createTextElement('span', 'delivery-board-job__number', String(index + 1));
    const content = document.createElement('span');
    content.className = 'delivery-board-job__content';
    content.append(
      createTextElement('span', 'delivery-board-job__title', job.title),
      createTextElement('span', 'delivery-board-job__destination', job.destinationName),
      createTextElement('span', 'delivery-board-job__description', job.description),
    );
    const reward = createTextElement('span', 'delivery-board-job__reward', `${job.reward} coin`);

    button.append(number, content, reward);
    button.addEventListener('click', () => {
      acceptJob(job.id);
    });

    return button;
  };

  const render = (state = delivery.getState()): void => {
    renderKey = getRenderKey(state);

    const header = document.createElement('div');
    header.className = 'delivery-board-overlay__header';
    header.append(
      createTextElement('h2', 'delivery-board-overlay__title', 'Delivery Board'),
      createTextElement('p', 'delivery-board-overlay__hint', '1-3 accept, Esc closes'),
    );

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'delivery-board-overlay__close';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', close);
    header.append(closeButton);

    const body = document.createElement('div');
    body.className = 'delivery-board-overlay__body';

    if (state.status === 'delivery-accepted' && state.activeDelivery) {
      body.append(
        createTextElement('p', 'delivery-board-overlay__status', `Delivery in progress: ${state.activeDelivery.title}`),
        createTextElement('p', 'delivery-board-overlay__copy', `Target: ${state.activeDelivery.destinationName}`),
      );
      visibleJobs = [];
    } else {
      visibleJobs = delivery.getAvailableDeliveries();

      if (visibleJobs.length === 0) {
        body.append(createTextElement('p', 'delivery-board-overlay__status', 'No available deliveries.'));
      } else {
        visibleJobs.forEach((job, index) => {
          body.append(renderJob(job, index));
        });
      }
    }

    overlay.replaceChildren(header, body);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!open) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    const jobNumber = Number.parseInt(event.key, 10);
    if (Number.isInteger(jobNumber) && jobNumber >= 1 && jobNumber <= visibleJobs.length) {
      event.preventDefault();
      acceptJob(visibleJobs[jobNumber - 1].id);
    }
  };

  inputTarget.addEventListener('keydown', handleKeyDown);

  return {
    open() {
      open = true;
      render();
      overlay.hidden = false;

      return delivery.getState().status === 'delivery-accepted'
        ? 'Delivery already in progress.'
        : 'Delivery board opened.';
    },
    close,
    update(state) {
      if (!open || overlay.hidden) {
        return;
      }

      if (getRenderKey(state) !== renderKey) {
        render(state);
      }
    },
    isOpen() {
      return open;
    },
    dispose() {
      inputTarget.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
    },
  };
};
