import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DotTheme = Readonly<{
  bg: string;
  dot: string;
  invert?: boolean;
}>;

export type DotMapParams = Readonly<{
  cell: number;
  dotChar: string;
  driftAmp: number;
  noiseScale: number;
  scanAmp: number;
  flickerAmp: number;
  baseAlpha: number;
  featureThreshold: number;
}>;

export type DotMapProps = Readonly<{
  imageSrc: string;
  theme: DotTheme;
  params?: Partial<DotMapParams>;
  className?: string;
  style?: React.CSSProperties;
  fadeInDurationMs?: number;
  fitParent?: boolean;
}>;

const DEFAULT_PARAMS: DotMapParams = Object.freeze({
  baseAlpha: 14,
  cell: 8,
  dotChar: "·",
  driftAmp: 1.3,
  featureThreshold: 40,
  flickerAmp: 36,
  noiseScale: 0.2,
  scanAmp: 16,
});

const HEX_PREFIX_RE = /^#/;
interface RendererUniforms {
  resolution: WebGLUniformLocation | null;
  gridSize: WebGLUniformLocation | null;
  cell: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  dotColor: WebGLUniformLocation | null;
  bgColor: WebGLUniformLocation | null;
  invert: WebGLUniformLocation | null;
  driftAmp: WebGLUniformLocation | null;
  noiseScale: WebGLUniformLocation | null;
  scanAmp: WebGLUniformLocation | null;
  flickerAmp: WebGLUniformLocation | null;
  baseAlpha: WebGLUniformLocation | null;
  featureThreshold: WebGLUniformLocation | null;
  handsMode: WebGLUniformLocation | null;
  brightness: WebGLUniformLocation | null;
  phase: WebGLUniformLocation | null;
  glyph: WebGLUniformLocation | null;
}

interface RendererState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: RendererUniforms;
  quadBuffer: WebGLBuffer;
  brightnessTexture: WebGLTexture;
  phaseTexture: WebGLTexture;
  glyphTexture: WebGLTexture;
  gridW: number;
  gridH: number;
  builtImageSrc: string;
  builtCell: number;
  builtDotChar: string;
  dotRGB: ColorRGB;
  bgRGB: ColorRGB;
  animationId: number;
  startMs: number;
  onReady?: () => void;
  hasNotifiedReady: boolean;
  loadToken: number;
}

type ColorRGB = Readonly<{ r: number; g: number; b: number }>;

type RenderInput = Readonly<{
  imageSrc: string;
  theme: DotTheme;
  params: DotMapParams;
  width: number;
  height: number;
}>;

function parseHexColor(hex: string): ColorRGB {
  const h = hex.trim().replace(HEX_PREFIX_RE, "");
  if (h.length === 3) {
    const r = Number.parseInt(h.charAt(0).repeat(2), 16);
    const g = Number.parseInt(h.charAt(1).repeat(2), 16);
    const b = Number.parseInt(h.charAt(2).repeat(2), 16);
    return { b, g, r };
  }
  if (h.length === 6) {
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    return { b, g, r };
  }
  return { b: 0, g: 0, r: 0 };
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader.");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    throw new Error("Failed to create program.");
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "Unknown program link error.";
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

function createTexture(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create texture.");
  }
  return texture;
}

function configureTextureDefaults(gl: WebGLRenderingContext, texture: WebGLTexture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function configureGlyphTexture(gl: WebGLRenderingContext, texture: WebGLTexture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function createGlyphImage(dotChar: string): ImageData {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create 2D context for glyph texture.");
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "64px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText(dotChar, size / 2, size / 2 + 2);

  return ctx.getImageData(0, 0, size, size);
}

function buildBrightnessAndPhaseTextures(input: {
  image: HTMLImageElement;
  gridW: number;
  gridH: number;
}): { brightness: Uint8Array; phase: Uint8Array } {
  const canvas = document.createElement("canvas");
  canvas.width = input.gridW;
  canvas.height = input.gridH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create 2D context for brightness map.");
  }

  ctx.clearRect(0, 0, input.gridW, input.gridH);

  const scale = Math.max(
    input.gridW / Math.max(1, input.image.naturalWidth),
    input.gridH / Math.max(1, input.image.naturalHeight),
  );

  const drawW = Math.max(1, input.image.naturalWidth * scale);
  const drawH = Math.max(1, input.image.naturalHeight * scale);
  const offsetX = (input.gridW - drawW) / 2;
  const offsetY = (input.gridH - drawH) / 2;

  ctx.drawImage(input.image, offsetX, offsetY, drawW, drawH);

  const imageData = ctx.getImageData(0, 0, input.gridW, input.gridH);
  const brightness = new Uint8Array(input.gridW * input.gridH);
  const phase = new Uint8Array(input.gridW * input.gridH * 4);

  for (let i = 0; i < input.gridW * input.gridH; i += 1) {
    const pixelIndex = i * 4;
    const r = imageData.data[pixelIndex] ?? 0;
    const g = imageData.data[pixelIndex + 1] ?? 0;
    const b = imageData.data[pixelIndex + 2] ?? 0;
    brightness[i] = Math.round((r + g + b) / 3);

    const phaseIndex = i * 4;
    phase[phaseIndex] = Math.floor(Math.random() * 256);
    phase[phaseIndex + 1] = Math.floor(Math.random() * 256);
    phase[phaseIndex + 2] = Math.floor(Math.random() * 256);
    phase[phaseIndex + 3] = Math.floor(Math.random() * 256);
  }

  return { brightness, phase };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  return img;
}

function initRenderer(canvas: HTMLCanvasElement, onReady?: () => void): RendererState | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    return null;
  }

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;

    varying vec2 v_uv;

    uniform sampler2D u_brightness;
    uniform sampler2D u_phase;
    uniform sampler2D u_glyph;

    uniform vec2 u_resolution;
    uniform vec2 u_gridSize;

    uniform float u_cell;
    uniform float u_time;

    uniform vec3 u_dotColor;
    uniform vec3 u_bgColor;

    uniform float u_invert;
    uniform float u_driftAmp;
    uniform float u_noiseScale;
    uniform float u_scanAmp;
    uniform float u_flickerAmp;
    uniform float u_baseAlpha;
    uniform float u_featureThreshold;
    uniform float u_handsMode;

    const float TAU = 6.28318530718;

    void main() {
      vec2 frag = vec2(v_uv.x, 1.0 - v_uv.y) * u_resolution;
      vec2 cellCoord = floor(frag / u_cell);

      if (cellCoord.x < 0.0 || cellCoord.y < 0.0 || cellCoord.x >= u_gridSize.x || cellCoord.y >= u_gridSize.y) {
        gl_FragColor = vec4(u_bgColor, 1.0);
        return;
      }

      vec2 sampleUv = (cellCoord + 0.5) / u_gridSize;
      float br = texture2D(u_brightness, sampleUv).r * 255.0;
      if (u_invert > 0.5) {
        br = 255.0 - br;
      }

      vec4 phases = texture2D(u_phase, sampleUv);
      float basePhase = phases.r * TAU;
      float featurePhase = phases.g * TAU;
      float driftPhaseX = phases.b * TAU;
      float driftPhaseY = phases.a * TAU;

      float nScale = max(0.05, u_noiseScale);
      float baseSpeed = 1.3 * nScale;
      float featureSpeed = 2.1 * nScale;
      float driftSpeedX = 1.1 * nScale;
      float driftSpeedY = 1.4 * nScale;

      float hands = clamp(u_handsMode, 0.0, 1.0);
      float amp = mix(u_driftAmp, u_driftAmp * 0.35, hands);
      float effectiveScanAmp = mix(u_scanAmp, u_scanAmp * 0.45, hands);
      float effectiveFlickerAmp = mix(u_flickerAmp, u_flickerAmp * 0.5, hands);
      float threshold = mix(u_featureThreshold, 52.0, hands);

      float dx = sin(u_time * driftSpeedX + driftPhaseX) * amp;
      float dy = cos(u_time * driftSpeedY + driftPhaseY) * amp;

      vec2 center = (cellCoord + 0.5) * u_cell + vec2(dx, dy);
      vec2 glyphUv = (frag - center) / u_cell + 0.5;
      float glyphAlpha = texture2D(u_glyph, glyphUv).a;

      if (glyphAlpha <= 0.001) {
        gl_FragColor = vec4(u_bgColor, 1.0);
        return;
      }

      float wave = sin(cellCoord.y * 0.08 + u_time * 2.2) * effectiveScanAmp;

      float n0 = sin(u_time * baseSpeed + basePhase);
      float a0 = clamp(u_baseAlpha + n0 * 5.0 + wave * 0.08, 0.0, 255.0) / 255.0;
      a0 = mix(a0, a0 * 0.4, hands);

      float a1 = 255.0 - br;
      a1 = (a1 * a1) / 255.0;
      float n1 = cos(u_time * featureSpeed + featurePhase);
      a1 = a1 + wave + n1 * (effectiveFlickerAmp * 0.5);
      float featureAlpha = a1 < threshold ? 0.0 : clamp(a1, 0.0, 255.0) / 255.0;

      // Suppress low-confidence edge pixels in hands mode, but keep the core shape.
      float handsEdgeMask = smoothstep(threshold + 8.0, threshold + 34.0, a1);
      featureAlpha *= mix(1.0, handsEdgeMask, hands);

      float combinedAlpha = 1.0 - (1.0 - a0) * (1.0 - featureAlpha);
      combinedAlpha *= glyphAlpha;
      float shimmer = sin(u_time * 1.35 + cellCoord.x * 0.09 + cellCoord.y * 0.05);
      combinedAlpha = clamp(combinedAlpha + shimmer * mix(0.018, 0.012, hands), 0.0, 1.0);
      combinedAlpha *= mix(1.0, 0.55, hands);

      vec3 color = mix(u_bgColor, u_dotColor, combinedAlpha);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const program = createProgram(gl, vertexSource, fragmentSource);
  const quadBuffer = gl.createBuffer();
  if (!quadBuffer) {
    gl.deleteProgram(program);
    throw new Error("Failed to create quad buffer.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const brightnessTexture = createTexture(gl);
  const phaseTexture = createTexture(gl);
  const glyphTexture = createTexture(gl);

  configureTextureDefaults(gl, brightnessTexture);
  configureTextureDefaults(gl, phaseTexture);
  configureGlyphTexture(gl, glyphTexture);

  activateProgram(gl, program);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  if (positionLocation === -1) {
    throw new Error("Failed to resolve a_position attribute.");
  }

  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  return {
    animationId: 0,
    bgRGB: { r: 0, g: 0, b: 0 },
    brightnessTexture,
    builtCell: -1,
    builtDotChar: "",
    builtImageSrc: "",
    dotRGB: { r: 255, g: 255, b: 255 },
    gl,
    glyphTexture,
    gridH: 1,
    gridW: 1,
    hasNotifiedReady: false,
    loadToken: 0,
    onReady,
    phaseTexture,
    program,
    quadBuffer,
    startMs: performance.now(),
    uniforms: {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      gridSize: gl.getUniformLocation(program, "u_gridSize"),
      cell: gl.getUniformLocation(program, "u_cell"),
      time: gl.getUniformLocation(program, "u_time"),
      dotColor: gl.getUniformLocation(program, "u_dotColor"),
      bgColor: gl.getUniformLocation(program, "u_bgColor"),
      invert: gl.getUniformLocation(program, "u_invert"),
      driftAmp: gl.getUniformLocation(program, "u_driftAmp"),
      noiseScale: gl.getUniformLocation(program, "u_noiseScale"),
      scanAmp: gl.getUniformLocation(program, "u_scanAmp"),
      flickerAmp: gl.getUniformLocation(program, "u_flickerAmp"),
      baseAlpha: gl.getUniformLocation(program, "u_baseAlpha"),
      featureThreshold: gl.getUniformLocation(program, "u_featureThreshold"),
      handsMode: gl.getUniformLocation(program, "u_handsMode"),
      brightness: gl.getUniformLocation(program, "u_brightness"),
      phase: gl.getUniformLocation(program, "u_phase"),
      glyph: gl.getUniformLocation(program, "u_glyph"),
    },
  };
}

function disposeRenderer(state: RendererState | null) {
  if (!state) {
    return;
  }
  const { gl } = state;
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }
  gl.deleteTexture(state.brightnessTexture);
  gl.deleteTexture(state.phaseTexture);
  gl.deleteTexture(state.glyphTexture);
  gl.deleteBuffer(state.quadBuffer);
  gl.deleteProgram(state.program);
}

function updateCanvasSize(
  canvas: HTMLCanvasElement,
  state: RendererState,
  width: number,
  height: number,
) {
  const targetW = Math.max(1, Math.floor(width));
  const targetH = Math.max(1, Math.floor(height));
  if (canvas.width === targetW && canvas.height === targetH) {
    return;
  }
  canvas.width = targetW;
  canvas.height = targetH;
  canvas.style.width = `${targetW}px`;
  canvas.style.height = `${targetH}px`;
  state.gl.viewport(0, 0, targetW, targetH);
}

function uploadGlyphTexture(state: RendererState, dotChar: string) {
  if (state.builtDotChar === dotChar) {
    return;
  }
  const glyphImage = createGlyphImage(dotChar);
  const { gl } = state;
  configureGlyphTexture(gl, state.glyphTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    glyphImage.width,
    glyphImage.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    glyphImage.data,
  );
  state.builtDotChar = dotChar;
}

async function rebuildImageTextures(state: RendererState, input: RenderInput) {
  const nextGridW = Math.max(1, Math.floor(input.width / input.params.cell));
  const nextGridH = Math.max(1, Math.floor(input.height / input.params.cell));
  const token = (state.loadToken += 1);

  const image = await loadImage(input.imageSrc);
  if (token !== state.loadToken) {
    return;
  }

  const { brightness, phase } = buildBrightnessAndPhaseTextures({
    gridH: nextGridH,
    gridW: nextGridW,
    image,
  });

  const { gl } = state;

  configureTextureDefaults(gl, state.brightnessTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    nextGridW,
    nextGridH,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    brightness,
  );

  configureTextureDefaults(gl, state.phaseTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    nextGridW,
    nextGridH,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    phase,
  );

  state.gridW = nextGridW;
  state.gridH = nextGridH;
  state.builtImageSrc = input.imageSrc;
  state.builtCell = input.params.cell;
  state.hasNotifiedReady = true;
  state.onReady?.();
}

function applyUniforms(state: RendererState, input: RenderInput, nowMs: number) {
  const { gl, uniforms } = state;
  const isHands = input.imageSrc.includes("hands");
  const elapsed = (nowMs - state.startMs) / 1000;
  const time = elapsed * (isHands ? 0.4 : 1);

  activateProgram(gl, state.program);

  state.bgRGB = parseHexColor(input.theme.bg);
  state.dotRGB = parseHexColor(input.theme.dot);

  gl.uniform2f(uniforms.resolution, canvasWidth(gl), canvasHeight(gl));
  gl.uniform2f(uniforms.gridSize, state.gridW, state.gridH);
  gl.uniform1f(uniforms.cell, input.params.cell);
  gl.uniform1f(uniforms.time, time);

  gl.uniform3f(uniforms.dotColor, state.dotRGB.r / 255, state.dotRGB.g / 255, state.dotRGB.b / 255);
  gl.uniform3f(uniforms.bgColor, state.bgRGB.r / 255, state.bgRGB.g / 255, state.bgRGB.b / 255);

  gl.uniform1f(uniforms.invert, input.theme.invert ? 1 : 0);
  gl.uniform1f(uniforms.driftAmp, input.params.driftAmp);
  gl.uniform1f(uniforms.noiseScale, input.params.noiseScale);
  gl.uniform1f(uniforms.scanAmp, input.params.scanAmp);
  gl.uniform1f(uniforms.flickerAmp, input.params.flickerAmp);
  gl.uniform1f(uniforms.baseAlpha, input.params.baseAlpha);
  gl.uniform1f(uniforms.featureThreshold, input.params.featureThreshold);
  gl.uniform1f(uniforms.handsMode, isHands ? 1 : 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, state.brightnessTexture);
  gl.uniform1i(uniforms.brightness, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, state.phaseTexture);
  gl.uniform1i(uniforms.phase, 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, state.glyphTexture);
  gl.uniform1i(uniforms.glyph, 2);
}

function canvasWidth(gl: WebGLRenderingContext): number {
  return gl.drawingBufferWidth;
}

function canvasHeight(gl: WebGLRenderingContext): number {
  return gl.drawingBufferHeight;
}

function activateProgram(gl: WebGLRenderingContext, program: WebGLProgram | null) {
  gl.useProgram(program);
}

function drawBackgroundOnly(state: RendererState, theme: DotTheme) {
  const { gl } = state;
  const bg = parseHexColor(theme.bg);
  gl.clearColor(bg.r / 255, bg.g / 255, bg.b / 255, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export function DotMapP5(props: DotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RendererState | null>(null);
  const renderInputRef = useRef<RenderInput | null>(null);
  const previousImageSrcRef = useRef(props.imageSrc);
  const [isVisible, setIsVisible] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [parentSize, setParentSize] = useState({ height: 1, width: 1 });
  const [viewportSize, setViewportSize] = useState({ height: 1, width: 1 });
  const fadeInDuration = Math.max(0, props.fadeInDurationMs ?? 700);

  const handleRendererReady = useCallback(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (previousImageSrcRef.current === props.imageSrc) {
      return;
    }
    previousImageSrcRef.current = props.imageSrc;
    setIsVisible(false);
  }, [props.imageSrc]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      setViewportSize({
        height: Math.max(1, Math.floor(window.innerHeight)),
        width: Math.max(1, Math.floor(window.innerWidth)),
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const node = containerRef.current;
    let frame = 0;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setParentSize({
        height: Math.max(1, Math.floor(rect.height)),
        width: Math.max(1, Math.floor(rect.width)),
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(updateSize);
    });

    observer.observe(node);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      observer.disconnect();
    };
  }, []);

  const mergedParams = useMemo<DotMapParams>(
    () => ({
      ...DEFAULT_PARAMS,
      ...props.params,
      cell: Math.max(2, Math.floor((props.params?.cell ?? DEFAULT_PARAMS.cell) as number)),
      dotChar: (props.params?.dotChar ?? DEFAULT_PARAMS.dotChar) || DEFAULT_PARAMS.dotChar,
    }),
    [props.params],
  );

  const renderInput = useMemo<RenderInput>(() => {
    const fitParent = props.fitParent ?? true;

    return {
      height: fitParent ? parentSize.height : viewportSize.height,
      imageSrc: props.imageSrc,
      params: mergedParams,
      theme: props.theme,
      width: fitParent ? parentSize.width : viewportSize.width,
    };
  }, [props.imageSrc, props.theme, mergedParams, props.fitParent, parentSize, viewportSize]);

  useEffect(() => {
    renderInputRef.current = renderInput;
  }, [renderInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    const renderer = initRenderer(canvas, handleRendererReady);
    rendererRef.current = renderer;

    if (!renderer) {
      setWebglSupported(false);
      return;
    }

    setWebglSupported(true);

    const renderFrame = async (nowMs: number) => {
      if (cancelled) {
        return;
      }

      const input = renderInputRef.current;
      if (!input) {
        renderer.animationId = requestAnimationFrame(renderFrame);
        return;
      }

      updateCanvasSize(canvas, renderer, input.width, input.height);
      uploadGlyphTexture(renderer, input.params.dotChar);

      const needsRebuild =
        renderer.builtImageSrc !== input.imageSrc ||
        renderer.builtCell !== input.params.cell ||
        renderer.gridW !== Math.max(1, Math.floor(input.width / input.params.cell)) ||
        renderer.gridH !== Math.max(1, Math.floor(input.height / input.params.cell));

      if (needsRebuild) {
        try {
          await rebuildImageTextures(renderer, input);
        } catch (error) {
          console.error("WebGL dot-map image rebuild failed", error);
        }
      }

      if (!(renderer.gridW > 0 && renderer.gridH > 0 && renderer.hasNotifiedReady)) {
        drawBackgroundOnly(renderer, input.theme);
        renderer.animationId = requestAnimationFrame(renderFrame);
        return;
      }

      applyUniforms(renderer, input, nowMs);
      renderer.gl.drawArrays(renderer.gl.TRIANGLES, 0, 6);
      renderer.animationId = requestAnimationFrame(renderFrame);
    };

    renderer.animationId = requestAnimationFrame(renderFrame);

    return () => {
      cancelled = true;
      disposeRenderer(renderer);
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
    };
  }, [handleRendererReady]);

  return (
    <div
      className={props.className}
      ref={containerRef}
      style={{
        background: props.theme.bg,
        height: "100%",
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${fadeInDuration}ms ease`,
        width: "100%",
        willChange: "opacity",
        ...props.style,
      }}
    >
      {webglSupported ? (
        <canvas ref={canvasRef} style={{ display: "block", height: "100%", width: "100%" }} />
      ) : null}
    </div>
  );
}

export const DOT_THEMES = {
  dark: { bg: "#000000", dot: "#FFFFFF", invert: false } as DotTheme,
  light: { bg: "#FFFFFF", dot: "#000000", invert: true } as DotTheme,
} as const;
