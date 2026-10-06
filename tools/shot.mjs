// 確認用スクリーンショット: node tools/shot.mjs <url> <out.png> [width] [height] [script.js]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [url, out, w = '1400', h = '900', script] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox', '--lang=ja-JP'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch((e) => logs.push('goto: ' + e.message));
await new Promise((r) => setTimeout(r, 600));
if (script) {
  const code = fs.readFileSync(script, 'utf8');
  const res = await page.evaluate(code).catch((e) => 'eval error: ' + e.message);
  if (res !== undefined) console.log('eval:', typeof res === 'string' ? res : JSON.stringify(res));
  await new Promise((r) => setTimeout(r, 700));
}
await page.screenshot({ path: out });
console.log(logs.filter((l) => !/Failed to load resource|CORS|net::ERR|workers\.dev/.test(l)).join('\n') || '(no console errors)');
await browser.close();
