import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="0" fill="#42624b"/><circle cx="256" cy="256" r="195" fill="#4c6c51"/><g fill="none" stroke="#f4eddb" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"><path d="M151 242h210v95c0 25-18 43-43 43H194c-25 0-43-18-43-43z"/><path d="M133 242h246M124 274h26m212 0h26M224 224v-17c0-17 14-31 32-31s32 14 32 31v17M212 144c-10-15-10-28 2-43m81 43c-10-15-10-28 2-43"/></g><path d="M252 291c-23-31-60-7-45 18 8 12 45 35 45 35s38-23 45-35c15-25-22-49-45-18" fill="#d2dcb5"/></svg>`;
await mkdir("public/icons", { recursive: true });
await writeFile("public/icons/icon.svg", svg);
for (const size of [192, 512])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(svg)).png().toFile("public/icons/maskable-512.png");
console.log("已生成 SVG、192 / 512 图标、遮罩图标及 Apple touch icon。");
