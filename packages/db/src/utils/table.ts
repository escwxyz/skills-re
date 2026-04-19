import { idColumn } from "./id";
import { createdAtColumn, updatedAtColumn } from "./time";

export const baseTableColumns = <TId extends string>(idName = "id") => ({
  id: idColumn<TId>(idName),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});
