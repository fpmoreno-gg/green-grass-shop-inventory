import { useEffect, useState } from "react";

// Generic helper: subscribes to a repository `subscribeX` method for the
// lifetime of the component and keeps React state in sync. Also reports
// whether the subscription has delivered its first snapshot yet — callers
// that do `items.find(id)` right after mount need this to tell "still
// loading" apart from "genuinely doesn't exist" (an empty array looks the
// same as "not found" otherwise).
export function useCollection<T>(subscribe: (cb: (items: T[]) => void) => () => void): [T[], boolean] {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    return subscribe((data) => {
      setItems(data);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);
  return [items, ready];
}
