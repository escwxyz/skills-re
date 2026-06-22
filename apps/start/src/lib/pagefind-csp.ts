const appendDirectiveToken = (directives: string[], name: string, token: string) => {
  const index = directives.findIndex((directive) => directive.trim().startsWith(`${name} `));
  if (index === -1) {
    directives.push(`${name} ${token}`);
    return;
  }
  const directive = directives[index] ?? "";
  if (!directive.split(/\s+/).includes(token)) {
    directives[index] = `${directive.trim()} ${token}`;
  }
};

export const applyPagefindCspCompatibility = (response: Response) => {
  const policy = response.headers.get("Content-Security-Policy");
  if (!policy) {
    return response;
  }

  const directives = policy
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean);
  appendDirectiveToken(directives, "script-src", "'wasm-unsafe-eval'");
  appendDirectiveToken(directives, "worker-src", "blob:");
  response.headers.set("Content-Security-Policy", directives.join("; "));
  return response;
};
