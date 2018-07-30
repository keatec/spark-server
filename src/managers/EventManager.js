// @flow

import type { EventPublisher } from 'spark-protocol';
import type { Event, EventData } from '../types';

type FilterOptions = {
  connectionID?: ?string,
  deviceID?: string,
  listenToBroadcastedEvents?: boolean,
  listenToInternalEvents?: boolean,
  mydevices?: boolean,
  userID?: string,
};

class EventManager {
  _eventPublisher: EventPublisher;

  constructor(eventPublisher: EventPublisher) {
    this._eventPublisher = eventPublisher;
  }

  subscribe = (
    eventNamePrefix: ?string,
    eventHandler: (event: Event) => void,
    filterOptions: FilterOptions,
  ): string =>
    this._eventPublisher.subscribe(eventNamePrefix || undefined, eventHandler, {
      filterOptions,
    });

  unsubscribe = (subscriptionID: string): void =>
    this._eventPublisher.unsubscribe(subscriptionID);

  publish = (eventData: EventData): void =>
    this._eventPublisher.publish(eventData);
}

export default EventManager;
