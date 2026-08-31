import { _electron as electron } from 'playwright';
const app = await electron.launch({
  executablePath: './dist-desktop/linux-unpacked/minion-com',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await app.firstWindow({ timeout: 60000 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(4000);
console.log('URL   :', page.url());
console.log('TITRE :', await page.title());
const body = (await page.textContent('body')) ?? '';
console.log('CORPS :', JSON.stringify(body.slice(0, 300)));
await page.screenshot({ path: '/tmp/packaged-window.png' });
await app.close();
