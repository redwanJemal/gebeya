const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const outputDir = path.join(__dirname, 'promo');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 628, deviceScaleFactor: 2 });

  // Load the thumbnail generator
  await page.goto('http://localhost:3088', { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(2000);
  
  // Configure for Gebeya thumbnail - update the form
  await page.evaluate(() => {
    // Find and update the hook/title input
    const hookInput = document.querySelector('input[placeholder*="hook"]') || 
                      document.querySelector('textarea') ||
                      document.querySelectorAll('input')[0];
    if (hookInput) {
      hookInput.value = 'ገበያ - Ethiopian Marketplace';
      hookInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  
  await delay(500);
  
  // Take screenshot of the preview area
  const preview = await page.$('[class*="preview"]') || await page.$('main');
  if (preview) {
    await preview.screenshot({ path: path.join(outputDir, 'gebeya-thumb-1.png') });
    console.log('Thumbnail 1 saved!');
  } else {
    await page.screenshot({ path: path.join(outputDir, 'gebeya-thumb-1.png') });
    console.log('Full page screenshot saved');
  }
  
  await browser.close();
})();
