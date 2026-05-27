import { measureAsync } from "@/lib/dev-performance";
import { parseThemeCookie } from "@/lib/theme";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const getTheme = createServerFn({
  method: "GET",
}).handler(() =>
  measureAsync("serverFn.getTheme", {}, () => parseThemeCookie(getRequestHeader("cookie"))),
);
