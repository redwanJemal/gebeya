import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sizes = [192, 512];
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Create a simple icon with a gradient background
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2481cc"/>
          <stop offset="100%" style="stop-color:#1a5f9e"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="100" fill="url(#bg)"/>
      <g transform="translate(256, 280)">
        <!-- Shopping cart icon -->
        <circle cx="0" cy="100" r="25" fill="white"/>
        <circle cx="80" cy="100" r="25" fill="white"/>
        <path d="M-140,-80 L-100,-80 L-60,60 L120,60 L140,-20 L-40,-20" 
              stroke="white" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;

  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));
    
    console.log(`Generated icon-${size}.png`);
  }

  // Also create apple-touch-icon (180x180)
  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  
  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
