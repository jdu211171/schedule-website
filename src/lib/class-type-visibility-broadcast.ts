// src/lib/class-type-visibility-broadcast.ts

export type VisibilityBroadcastMessage = {
  type: "hiddenClassTypesChanged";
  ids: string[];
};

export function postHiddenClassTypesChanged(ids: string[]) {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel("class-type-visibility");
    ch.postMessage({ type: "hiddenClassTypesChanged", ids } satisfies VisibilityBroadcastMessage);
    ch.close();
  } catch {}
}

export function subscribeHiddenClassTypesChanged(handler: (ids: string[]) => void) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel("class-type-visibility");
  const onMsg = (evt: MessageEvent<VisibilityBroadcastMessage>) => {
    if (evt.data?.type === "hiddenClassTypesChanged") {
      handler(evt.data.ids || []);
    }
  };
  ch.addEventListener("message", onMsg);
  return () => {
    try {
      ch.removeEventListener("message", onMsg);
      ch.close();
    } catch {}
  };
}

