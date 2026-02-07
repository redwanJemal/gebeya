const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Set mobile viewport with high resolution
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });

  // Inject Telegram WebApp for theming
  await page.evaluateOnNewDocument(() => {
    window.Telegram = {
      WebApp: {
        initData: 'mock',
        initDataUnsafe: { user: { id: 482306502, first_name: 'Demo', username: 'demo' } },
        version: '7.0', platform: 'ios', colorScheme: 'dark',
        themeParams: {
          bg_color: '#18222d', text_color: '#ffffff', hint_color: '#7d8b99',
          link_color: '#5eb5f7', button_color: '#5eb5f7', button_text_color: '#ffffff',
          secondary_bg_color: '#232e3c'
        },
        isExpanded: true, viewportHeight: 844, viewportStableHeight: 844,
        ready: () => {}, expand: () => {}, close: () => {},
        MainButton: { hide: () => {}, show: () => {}, onClick: () => {}, setText: () => {} },
        BackButton: { hide: () => {}, show: () => {}, onClick: () => {} },
        HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} },
        requestContact: (cb) => cb && cb(false), openLink: () => {}, showPopup: () => {}
      }
    };
  });

  console.log('Loading dev app...');
  await page.goto('http://localhost:3099', { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(3000);
  
  // Screenshot 1: Home page with listings
  console.log('Screenshot 1: Home page...');
  await page.screenshot({ path: path.join(screenshotsDir, '01-home.png'), fullPage: false });
  
  // Screenshot 2: Click filter button
  console.log('Screenshot 2: Filter modal...');
  try {
    await page.click('[class*="SlidersHorizontal"]', { timeout: 2000 });
  } catch (e) {
    // Try clicking by position in header area
    await page.evaluate(() => {
      const filterBtn = document.querySelector('button:has(svg)');
      if (filterBtn) filterBtn.click();
    });
  }
  await delay(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '02-filters.png'), fullPage: false });
  
  // Close modal
  await page.keyboard.press('Escape');
  await delay(500);
  
  // Screenshot 3: Click on a listing
  console.log('Screenshot 3: Listing detail...');
  await page.evaluate(() => {
    const card = document.querySelector('[class*="grid"] > div');
    if (card) card.click();
  });
  await delay(2000);
  await page.screenshot({ path: path.join(screenshotsDir, '03-detail.png'), fullPage: false });
  
  // Screenshot 4: Go back and navigate to profile
  console.log('Screenshot 4: Profile page...');
  await page.goBack();
  await delay(1000);
  await page.evaluate(() => {
    const profileTab = document.querySelector('nav button:last-child');
    if (profileTab) profileTab.click();
  });
  await delay(2000);
  await page.screenshot({ path: path.join(screenshotsDir, '04-profile.png'), fullPage: false });
  
  console.log('All screenshots saved!');
  await browser.close();
})();
