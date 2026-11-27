import { useEffect } from "react";
import { ENVIRONMENTS } from "./garden/expo-environment";

export function useNightBrowserTint(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const tint = document.createElement("meta");
    tint.name = "theme-color";
    tint.content = ENVIRONMENTS.night.top;
    document.head.prepend(tint);
    const root = document.documentElement.style;
    const body = document.body.style;
    const previous = [root.backgroundColor, body.backgroundColor];
    root.backgroundColor = body.backgroundColor = tint.content;
    return () => {
      tint.remove();
      root.backgroundColor = previous[0];
      body.backgroundColor = previous[1];
    };
  }, [active]);
}
