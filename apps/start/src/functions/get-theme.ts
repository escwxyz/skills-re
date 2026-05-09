import { parseThemeCookie } from "@/lib/theme";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const getTheme = createServerFn({
  method: "GET",
}).handler(() => parseThemeCookie(getRequestHeader("cookie")));
