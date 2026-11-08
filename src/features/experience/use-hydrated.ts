"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during server render and the client hydration pass, then true
 * once mounted. Lets store-backed UI render the same empty output as the server
 * first (avoiding hydration mismatches) before revealing persisted device state.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
