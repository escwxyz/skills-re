import { oc } from "@orpc/contract";

import { commonErrorMap } from "./errors";

export const baseContract = oc.errors(commonErrorMap);
