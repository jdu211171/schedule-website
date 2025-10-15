// src/lib/class-types-broadcast.ts

export type ClassTypesBroadcastMessage = {
  type: "classTypesChanged";
};

export function postClassTypesChanged(): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel("class-types");
    ch.postMessage({ type: "classTypesChanged" } satisfies ClassTypesBroadcastMessage);
    ch.close();
  } catch {}
}

export function subscribeClassTypesChanged(handler: () => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel("class-types");
  const onMessage = (evt: MessageEvent) => {
    const msg = evt.data as ClassTypesBroadcastMessage | undefined;
    if (msg?.type === "classTypesChanged") handler();
  };
  ch.addEventListener("message", onMessage);
  return () => {
    try {
      ch.removeEventListener("message", onMessage);
      ch.close();
    } catch {}
  };
}

