// CI-only browser smoke for the complete generated single HTML.
// Uses Chrome's synthetic camera; this confirms initialization, not counting accuracy.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from '../.smoke/node_modules/playwright/index.mjs';

const html = await readFile('dist/index.html');
const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(html);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const origin = 'http://127.0.0.1:' + address.port;
let browser;
let passed = false;
const errors = [];
const outgoing = [];
try {
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--no-default-browser-check'
    ]
  });
  const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (/^https?:\/\//.test(url) && !url.startsWith(origin + '/')) {
      outgoing.push(url);
    }
  });
  page.on('console', message => {
    // MediaPipe's XNNPACK native initialization emits an INFO line on console.error.
    // It is not a runtime failure, so exclude only this known informational message.
    if (message.type() === 'error' &&
        !/^INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const assets = await page.evaluate(() => window.StandaloneAssets?.list?.() ?? []);
  for (const expected of [
    'mediapipe/module', 'mediapipe/simd-loader', 'mediapipe/simd-wasm',
    'mediapipe/baseline-loader', 'mediapipe/baseline-wasm', 'person-model/tflite'
  ]) {
    assert(assets.includes(expected), 'Missing asset in readable HTML: ' + expected);
  }
  console.log('[smoke] All bundled model, WASM, and loader assets are present.');
  await page.locator('#cameraStart').click();
  await page.waitForFunction(() => {
    return /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent ?? '');
  }, null, { timeout: 90_000 });
  assert(await page.locator('#cameraFeed').evaluate(video => video.videoWidth > 0), 'Camera should provide frames');
  assert.match(await page.locator('#detectorInfo').textContent(), /EfficientDet/);
  console.log('[smoke] MediaPipe initialized from offline HTML and fake camera is live.');
  await page.locator('#beginCount').click();
  assert.match(await page.locator('#statusPill').textContent(), /計測中|Counting/);
  await page.locator('#pauseCount').click();
  assert.match(await page.locator('#statusPill').textContent(), /一時停止|Paused/);
  await page.locator('#beginCount').click();
  await page.locator('#finishCount').click();
  assert(await page.locator('#report').isVisible(), 'Result should be visible after finish');
  await page.locator('#languageSelect').selectOption('en');
  assert.match(await page.locator('#pageTitle').textContent(), /Count people/);
  await page.setViewportSize({ width: 360, height: 740 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow on mobile');
  console.log('[smoke] Start/pause/resume/finish, i18n, and mobile layout passed.');
  // The one-file requirement includes direct local opening, not just localhost.
  for (const filename of ['dist/index.html','dist/index.self-extract.html']) {
    const localPage=await context.newPage();
    localPage.on('pageerror', error => errors.push(filename+': '+error.message));
    localPage.on('request', request => {
      const url=request.url();
      if (/^https?:\/\//.test(url)) outgoing.push(filename+': '+url);
    });
    localPage.on('console', message => {
      if(message.type()==='error' &&
         !/^INFO: Created TensorFlow Lite XNNPACK delegate for CPU\.$/.test(message.text())) {
        errors.push(filename+': '+message.text());
      }
    });
    await localPage.goto(pathToFileURL(resolve(filename)).href,
      {waitUntil:'domcontentloaded',timeout:90_000});
    await localPage.locator('#cameraStart').waitFor({timeout:90_000});
    await localPage.locator('#cameraStart').click();
    await localPage.waitForFunction(() =>
      /計測準備完了|Ready to count/.test(document.querySelector('#statusPill')?.textContent ?? ''),
      null, {timeout:90_000});
    assert(await localPage.locator('#cameraFeed').evaluate(video=>video.videoWidth>0),
      filename+': local-file camera has no video');
    console.log('[smoke] Direct local '+filename+' launched embedded AI and camera.');
    await localPage.close();
  }
  assert.deepEqual(outgoing, [], 'Unexpected external HTTP requests');
  assert.deepEqual(errors, [], 'Console or unhandled errors occurred');
  passed = true;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (!passed) process.exitCode = 1;
else console.log('[smoke] PASS: no external HTTP request during cold camera/model initialization.');
