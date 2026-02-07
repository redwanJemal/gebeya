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
  await page.setViewport({ width: 1200, height: 628, deviceScaleFactor: 2 });

  const htmlPath = 'file://' + path.join(__dirname, 'gebeya-thumb.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });
  
  // Wait for font to load
  await delay(2000);
  
  await page.screenshot({ 
    path: path.join(__dirname, 'gebeya-promo-thumb.png'),
    type: 'png'
  });
  
  console.log('✅ Thumbnail saved!');
  await browser.close();
})();
