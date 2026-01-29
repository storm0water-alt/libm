/**
 * 设备指纹识别工具
 * 用于生成唯一设备标识符，用于许可证绑定
 */

export interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  timezone: string;
  canvas: string;
  webgl: string;
  fonts: string[];
}

/**
 * 生成 Canvas 指纹
 */
async function getCanvasFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // 绘制文本
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Hello, world!", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Hello, world!", 4, 17);

    // 获取数据 URL
    const dataUrl = canvas.toDataURL();
    return dataUrl.slice(-50); // 取后50个字符作为指纹
  } catch (e) {
    return "";
  }
}

/**
 * 生成 WebGL 指纹
 */
async function getWebGLFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "";

    // Type assertion for WebGLRenderingContext
    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "";

    const vendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return `${vendor}|${renderer}`;
  } catch (e) {
    return "";
  }
}

/**
 * 检测可用字体
 */
async function getFontList(): Promise<string[]> {
  if (typeof window === "undefined") return [];

  const baseFonts = ["monospace", "sans-serif", "serif"];
  const testFonts = [
    "Arial",
    "Arial Black",
    "Arial Narrow",
    "Calibri",
    "Cambria",
    "Cambria Math",
    "Comic Sans MS",
    "Consolas",
    "Courier",
    "Courier New",
    "Georgia",
    "Helvetica",
    "Impact",
    "Lucida Console",
    "Luminari",
    "Microsoft Sans Serif",
    "Palatino Linotype",
    "Segoe UI",
    "Tahoma",
    "Times",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Monaco",
  ];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const availableFonts: string[] = [];

  testFonts.forEach((font) => {
    ctx.font = `72px ${font}`;
    const width = ctx.measureText("mmmmmmmmmmlli").width;

    for (const baseFont of baseFonts) {
      ctx.font = `72px ${baseFont}`;
      const baseWidth = ctx.measureText("mmmmmmmmmmlli").width;

      if (width !== baseWidth) {
        availableFonts.push(font);
        break;
      }
    }
  });

  return availableFonts.sort();
}

/**
 * 生成稳定的哈希值（固定32位）
 * 使用 crypto.subtle API 生成 SHA-256 哈希
 */
async function stableHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // 使用 SubtleCrypto API 生成 SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 取前12位作为设备码的哈希部分
  return hashHex.slice(0, 12);
}

/**
 * 生成简单的哈希值（备用方案，用于非浏览器环境）
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // 确保至少有12位，不足则补齐
  let hashStr = Math.abs(hash).toString(16);
  while (hashStr.length < 12) {
    hashStr += hashStr;
  }

  return hashStr.slice(0, 12);
}

/**
 * 收集设备信息
 */
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  if (typeof window === "undefined") {
    throw new Error("Device fingerprinting only works in the browser");
  }

  const [canvas, webgl, fonts] = await Promise.all([
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getFontList(),
  ]);

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas,
    webgl,
    fonts,
  };
}

/**
 * 生成设备码
 * 现在从服务器端获取物理主机的硬件指纹
 * 不再使用浏览器指纹
 */
export async function generateDeviceCode(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Device fingerprinting only works in the browser");
  }

  try {
    // 从服务器端 API 获取设备码
    const response = await fetch('/api/device-fingerprint');
    if (!response.ok) {
      throw new Error('Failed to get device code from server');
    }

    const data = await response.json();
    return data.deviceCode;
  } catch (error) {
    console.error('[Device Fingerprint] Failed to get server device code:', error);

    // 如果服务器端失败，回退到浏览器指纹（仅用于开发环境）
    console.warn('[Device Fingerprint] Falling back to browser fingerprint (dev only)');
    const deviceInfo = await collectDeviceInfo();
    const fingerprint = [
      deviceInfo.platform,
      deviceInfo.screenWidth,
      deviceInfo.screenHeight,
      deviceInfo.colorDepth,
      deviceInfo.timezone,
      deviceInfo.canvas,
      deviceInfo.webgl,
      deviceInfo.fonts.join(","),
    ].join("|");

    const hash = await stableHash(fingerprint);
    return `DEV-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`.toUpperCase();
  }
}

// 设备码版本号，当算法更新时递增此版本号
const DEVICE_CODE_VERSION = 2;
const STORAGE_KEY_VERSION = "device_code_version";
const STORAGE_KEY_CODE = "device_code";
const STORAGE_KEY_TIMESTAMP = "device_code_generated_at";

/**
 * 存储设备码到 localStorage
 */
export function saveDeviceCode(deviceCode: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY_CODE, deviceCode);
    localStorage.setItem(STORAGE_KEY_VERSION, DEVICE_CODE_VERSION.toString());
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
  } catch (e) {
    console.warn("Failed to save device code:", e);
  }
}

/**
 * 从 localStorage 读取设备码
 */
export function loadDeviceCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const savedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
    const currentVersion = DEVICE_CODE_VERSION.toString();

    // 如果版本不匹配，返回 null 触发重新生成
    if (savedVersion !== currentVersion) {
      console.log(`[Device Fingerprint] Version mismatch: ${savedVersion} -> ${currentVersion}, regenerating...`);
      return null;
    }

    return localStorage.getItem(STORAGE_KEY_CODE);
  } catch (e) {
    return null;
  }
}

/**
 * 获取或生成设备码
 * 会检查版本号，如果版本不匹配会重新生成
 */
export async function getOrGenerateDeviceCode(): Promise<string> {
  // 尝试从 localStorage 读取（包含版本检查）
  const existing = loadDeviceCode();
  if (existing) {
    // 检查是否是旧格式的设备码（DEV-开头），如果是则重新生成
    if (existing.startsWith("DEV-")) {
      console.log("[Device Fingerprint] Old browser fingerprint detected, regenerating with server algorithm...");
    } else {
      return existing;
    }
  }

  // 生成新的设备码
  const deviceCode = await generateDeviceCode();
  saveDeviceCode(deviceCode);
  return deviceCode;
}

/**
 * 验证设备码是否匹配
 */
export async function verifyDeviceCode(expectedCode: string): Promise<boolean> {
  const currentCode = await getOrGenerateDeviceCode();
  return currentCode === expectedCode;
}
