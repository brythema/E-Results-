import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icons/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const iconConfigs = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-180.png', size: 180 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-128.png', size: 128 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
];

async function generate() {
  for (const icon of iconConfigs) {
    const outputPath = path.resolve('public/icons', icon.name);
    await sharp(svgBuffer)
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }
  // Also save favicon.png in public root
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.resolve('public/favicon.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('All PWA Icons generated successfully.');
}

generate().catch(console.error);
