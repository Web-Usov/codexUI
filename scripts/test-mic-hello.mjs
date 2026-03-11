import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const wavPath = process.env.WAV_PATH || path.resolve('hello.wav');
const screenshotPath = process.env.SCREENSHOT_PATH || path.resolve('output/playwright/mic-hello-response.png');
const timeoutMs = Number(process.env.RESPONSE_TIMEOUT_MS || 120000);

async function ensureWavExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`WAV file not found: ${filePath}`);
  }
}

async function run() {
  await ensureWavExists(wavPath);
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    class FakeMediaRecorder {
      constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        this.mimeType = 'audio/wav';
        this.ondataavailable = null;
        this.onstop = null;
      }
      start() {
        this.state = 'recording';
      }
      async stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        const response = await fetch('/hello.wav');
        const blob = await response.blob();
        if (typeof this.ondataavailable === 'function') {
          this.ondataavailable({ data: blob });
        }
        if (typeof this.onstop === 'function') {
          this.onstop();
        }
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() { return true; }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: FakeMediaRecorder,
    });

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {},
      });
    }

    navigator.mediaDevices.getUserMedia = async () => ({
      getTracks: () => [{ stop() {} }],
    });
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[browser:${msg.type()}] ${msg.text()}`);
    }
  });

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const micButton = page.getByRole('button', { name: /hold to dictate|stop dictation/i });
    await micButton.waitFor({ state: 'visible', timeout: 30000 });

    await micButton.dispatchEvent('mousedown');
    await page.waitForTimeout(700);
    await micButton.dispatchEvent('mouseup');

    const composer = page.getByRole('textbox', { name: /type a message/i });
    await composer.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('textarea.thread-composer-input');
      return !!el && el.value.trim().toLowerCase().includes('hello');
    }, null, { timeout: 30000 });

    const sendButton = page.getByRole('button', { name: /send message/i });
    await sendButton.click();

    await page.waitForFunction(() => {
      const assistantCards = Array.from(document.querySelectorAll('[data-role="assistant"] .message-card'));
      return assistantCards.some((node) => (node.textContent || '').trim().length > 0);
    }, null, { timeout: timeoutMs });

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const assistantText = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-role="assistant"] .message-card'));
      const last = cards[cards.length - 1];
      return (last?.textContent || '').trim();
    });

    console.log(`PASS: received assistant response (${assistantText.slice(0, 160)})`);
    console.log(`Screenshot: ${screenshotPath}`);
  } catch (error) {
    const failureShot = screenshotPath.replace(/\.png$/i, '.failed.png');
    await page.screenshot({ path: failureShot, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}`);
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error(`FAIL: ${message}`);
  process.exit(1);
});
