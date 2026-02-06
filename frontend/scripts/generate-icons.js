const sharp = require('sharp');
const path = require('path');

const sizes = [192, 512];
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Create a simple icon with a shopping cart emoji-like design
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="100" fill="#2481cc"/>
      <text x="256" y="340" text-anchor="middle" font-size="280" fill="white">🛒</text>
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
