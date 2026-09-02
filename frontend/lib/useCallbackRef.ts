import { useCallback, useEffect, useRef } from "react";

export function useCallbackRef<T extends (...args: any[]) => any>(cb: T): T {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });

  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
