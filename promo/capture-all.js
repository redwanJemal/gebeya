const puppeteer = require('puppeteer');
const path = require('path');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  const configs = [
    { file: 'gebeya-thumb.html', output: 'gebeya-landscape.png', w: 1200, h: 628 },
    { file: 'gebeya-square.html', output: 'gebeya-square.png', w: 1080, h: 1080 },
    { file: 'gebeya-story.html', output: 'gebeya-story.png', w: 1080, h: 1920 },
  ];
  
  for (const cfg of configs) {
    await page.setViewport({ width: cfg.w, height: cfg.h, deviceScaleFactor: 2 });
    const htmlPath = 'file://' + path.join(__dirname, cfg.file);
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(__dirname, cfg.output), type: 'png' });
    console.log('✅', cfg.output);
  }
  
  await browser.close();
  console.log('All thumbnails created!');
})();
