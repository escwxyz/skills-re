import type { IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import {
  FileArchiveIcon,
  FileAudioIcon,
  FileCIcon,
  FileCodeIcon,
  FileCppIcon,
  FileCSharpIcon,
  FileCssIcon,
  FileCsvIcon,
  FileDocIcon,
  FileHtmlIcon,
  FileImageIcon,
  FileIniIcon,
  FileJpgIcon,
  FileJsIcon,
  FileJsxIcon,
  FileMdIcon,
  FilePdfIcon,
  FilePngIcon,
  FilePptIcon,
  FilePyIcon,
  FileRsIcon,
  FileSqlIcon,
  FileSvgIcon,
  FileTextIcon,
  FileTsIcon,
  FileTsxIcon,
  FileTxtIcon,
  FileVideoIcon,
  FileXlsIcon,
  FileZipIcon,
} from "@phosphor-icons/react";

type FileIconComponent = ComponentType<IconProps>;

const FILE_ICON_BY_EXTENSION: Record<string, FileIconComponent> = {
  ai: FileCodeIcon,
  apk: FileArchiveIcon,
  audio: FileAudioIcon,
  bash: FileCodeIcon,
  c: FileCIcon,
  cc: FileCppIcon,
  conf: FileCodeIcon,
  config: FileCodeIcon,
  cpp: FileCppIcon,
  cs: FileCSharpIcon,
  csharp: FileCSharpIcon,
  css: FileCssIcon,
  csv: FileCsvIcon,
  cxx: FileCppIcon,
  doc: FileDocIcon,
  docx: FileDocIcon,
  env: FileCodeIcon,
  gif: FileImageIcon,
  go: FileCodeIcon,
  gradle: FileCodeIcon,
  graphql: FileCodeIcon,
  gql: FileCodeIcon,
  h: FileCodeIcon,
  htm: FileHtmlIcon,
  html: FileHtmlIcon,
  hpp: FileCppIcon,
  ini: FileIniIcon,
  java: FileCodeIcon,
  jdbc: FileCodeIcon,
  jpeg: FileImageIcon,
  jpg: FileJpgIcon,
  js: FileJsIcon,
  json: FileCodeIcon,
  json5: FileCodeIcon,
  jsonc: FileCodeIcon,
  jsx: FileJsxIcon,
  kt: FileCodeIcon,
  log: FileTextIcon,
  make: FileCodeIcon,
  md: FileMdIcon,
  mdx: FileMdIcon,
  pdf: FilePdfIcon,
  php: FileCodeIcon,
  pl: FileCodeIcon,
  png: FilePngIcon,
  ppt: FilePptIcon,
  pptx: FilePptIcon,
  properties: FileCodeIcon,
  py: FilePyIcon,
  pyw: FilePyIcon,
  r: FileCodeIcon,
  rb: FileCodeIcon,
  rs: FileRsIcon,
  scala: FileCodeIcon,
  sh: FileCodeIcon,
  sql: FileSqlIcon,
  svg: FileSvgIcon,
  swift: FileCodeIcon,
  tar: FileArchiveIcon,
  toml: FileCodeIcon,
  ts: FileTsIcon,
  tsx: FileTsxIcon,
  tsv: FileCodeIcon,
  txt: FileTxtIcon,
  wav: FileAudioIcon,
  webm: FileVideoIcon,
  webp: FileImageIcon,
  xls: FileXlsIcon,
  xlsx: FileXlsIcon,
  yaml: FileCodeIcon,
  yml: FileCodeIcon,
  zip: FileZipIcon,
};

const getFileExtension = (path: string) => {
  const fileName = path.split("/").toReversed().find(Boolean) ?? path;
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return null;
  }

  return fileName.slice(dotIndex + 1).toLowerCase();
};

export const getFileIconForPath = (path: string): FileIconComponent => {
  const extension = getFileExtension(path);

  if (!extension) {
    return FileTextIcon;
  }

  return FILE_ICON_BY_EXTENSION[extension] ?? FileTextIcon;
};
