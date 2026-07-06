/**
 * Trip association module for RoadPilot Egypt.
 *
 * Handles associating locally-stored anonymous trips with a user
 * after they authenticate. This enables local-only mode where trips
 * are created without a userId, and then tagged post-login for sync.
 */

import { getDB } from '@/lib/idb/index';

/**
 * Associates all untagged local trips (userId === null) with the given userId.
 * After tagging, marks trips as 'pending' sync so the sync engine picks them up.
 *
 * @param userId - The authenticated user's ID to tag trips with.
 * @returns The number of trips that were associated.
 */
export async function associateTripsWithUser(userId: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('trips', 'readwrite');
  const store = tx.objectStore('trips');

  let cursor = await store.openCursor();
  let count = 0;

  while (cursor) {
    const trip = cursor.value;

    if (trip.userId === null || trip.userId === undefined) {
      const updatedTrip = {
        ...trip,
        userId,
        syncStatus: 'pending' as const,
        updatedAt: Date.now(),
      };
      await cursor.update(updatedTrip);
      count++;
    }

    cursor = await cursor.continue();
  }

  await tx.done;
  return count;
}

/**
 * Returns the count of local trips that have no userId (anonymous/local-only trips).
 */
export async function getUntaggedTripCount(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('trips', 'readonly');
  const store = tx.objectStore('trips');

  let cursor = await store.openCursor();
  let count = 0;

  while (cursor) {
    if (cursor.value.userId === null || cursor.value.userId === undefined) {
      count++;
    }
    cursor = await cursor.continue();
  }

  await tx.done;
  return count;
}
