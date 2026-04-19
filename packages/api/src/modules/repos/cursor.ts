import { decodeCursor, encodeCursor } from "../shared/pagination";

export interface RepoPageCursor {
  syncTime: number;
  id: string;
}

export const encodeRepoCursor = (cursor: RepoPageCursor | null) => encodeCursor(cursor);

export const decodeRepoCursor = (cursor: string | undefined) => decodeCursor(cursor);
