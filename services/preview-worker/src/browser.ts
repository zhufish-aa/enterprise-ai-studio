import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { components, SiteHttpInput } from '@eas/api-contract';
type S = components['schemas'];
interface PendingQuery {
  id: string;
  input: S['StudioQuery'];
}
interface Session {
  context: BrowserContext;
  page: Page;
  events: S['StudioDebugEvent'][];
  queries: Map<string, PendingQuery>;
  requests: Map<string, { id: string; input: SiteHttpInput }>;
  html: string;
  lastUsed: number;
  closed: boolean;
}
const sessions = new Map<string, Session>();
let browser: Promise<Browser> | undefined;
const safeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'data:' ? 'data:' : url.origin + url.pathname;
  } catch {
    return value;
  }
};
function event(
  s: Session,
  type: S['StudioDebugEvent']['type'],
  level: string,
  message: string,
  extra: Partial<S['StudioDebugEvent']> = {},
) {
  s.events.push({
    sequence: s.events.length + 1,
    timestamp: new Date().toISOString(),
    type,
    level,
    message,
    ...extra,
  });
}
async function getBrowser() {
  if (!browser)
    browser = chromium
      .launch({
        headless: true,
        chromiumSandbox: true,
        ...(process.env['PREVIEW_BROWSER_EXECUTABLE']
          ? { executablePath: process.env['PREVIEW_BROWSER_EXECUTABLE'] }
          : {}),
      })
      .catch((error) => {
        browser = undefined;
        throw error;
      });
  return browser;
}
function get(id: string) {
  const s = sessions.get(id);
  if (!s || s.closed) throw new Error('DEBUG_SESSION_CLOSED');
  s.lastUsed = Date.now();
  return s;
}
function shell(html: string, appId: string, versionId: string) {
  const script = `const frame=document.querySelector('iframe');window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!=='null'||!event.data||typeof event.data!=='object')return;const d=event.data;if(d.type==='site.request'&&typeof d.id==='string')window.__easDebugEvent({kind:'request',id:d.id,input:{method:d.method,path:d.path,body:d.body,headers:d.headers??{}}});if(d.type==='studio.query'&&typeof d.id==='string')window.__easDebugEvent({kind:'query',id:d.id,input:{queryKey:d.queryKey,filters:d.filters??[],...(d.timeRange?{timeRange:d.timeRange}:{})}});if(d.type==='studio.cancel'&&typeof d.id==='string')window.__easDebugEvent({kind:'cancel',id:d.id});});`;
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe sandbox="allow-scripts allow-forms" name="' +
    ('eas-runtime:' + JSON.stringify({ environment: 'test', appId, versionId }))
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;') +
    '" srcdoc="' +
    html.replaceAll('&', '&amp;').replaceAll('"', '&quot;') +
    '"></iframe><script>' +
    script +
    '</script></body></html>'
  );
}
export async function open(
  id: string,
  preview: S['StudioPreview'],
  viewport: { width: number; height: number },
) {
  if (preview.environment !== 'test') throw new Error('DEBUG_TEST_VERSION_REQUIRED');
  if (sessions.has(id)) return { ready: true };
  const context = await (
    await getBrowser()
  ).newContext({ viewport, acceptDownloads: false, serviceWorkers: 'block', deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const s: Session = {
      context,
      page,
      events: [],
      queries: new Map(),
      requests: new Map(),
      html: shell(preview.html, preview.appId, preview.versionId),
      lastUsed: Date.now(),
      closed: false,
    };
    sessions.set(id, s);
    // A fixed, fulfilled loopback origin preserves Secure Context APIs (crypto.randomUUID)
    // without making a network request or accepting a caller-supplied URL.
    const shellUrl = 'http://127.0.0.1/__enterprise_debug_shell/' + id;
    await context.route('**/*', (route) =>
      route.request().url() === shellUrl &&
      route.request().isNavigationRequest() &&
      route.request().frame() === page.mainFrame()
        ? route.fulfill({ status: 200, contentType: 'text/html', body: s.html })
        : route.abort('blockedbyclient'),
    );
    await context.routeWebSocket('**/*', (socket) => socket.close());
    context.on('page', (popup) => {
      if (popup !== page) void popup.close();
    });
    page.on('console', (message) => {
      const loc = message.location();
      event(s, 'console', message.type(), message.text(), {
        location: { url: safeUrl(loc.url), line: loc.lineNumber + 1, column: loc.columnNumber + 1 },
      });
    });
    page.on('pageerror', (error) =>
      event(s, 'pageerror', 'error', error.message, { stack: error.stack ?? error.message }),
    );
    page.on('requestfailed', (request) =>
      event(
        s,
        'requestfailed',
        'error',
        request.method() +
          ' ' +
          safeUrl(request.url()) +
          ' · ' +
          (request.failure()?.errorText ?? 'request failed'),
      ),
    );
    page.on('dialog', (dialog) => {
      event(s, 'console', 'warning', '页面弹窗：' + dialog.message());
      void dialog.dismiss();
    });
    await page.exposeBinding('__easDebugEvent', (source, value: unknown) => {
      // Only the trusted shell can bridge queries; the app remains an opaque iframe.
      if (source.frame !== page.mainFrame() || !value || typeof value !== 'object') return;
      const data = value as {
        kind?: string;
        id?: string;
        input?: S['StudioQuery'] | SiteHttpInput;
      };
      if (typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.id)) return;
      if (data.kind === 'query' && data.input && !s.queries.has(data.id))
        s.queries.set(data.id, { id: data.id, input: data.input as S['StudioQuery'] });
      if (data.kind === 'request' && data.input && !s.requests.has(data.id))
        s.requests.set(data.id, { id: data.id, input: data.input as SiteHttpInput });
      if (data.kind === 'cancel') s.queries.delete(data.id);
    });
    await page.goto(shellUrl, { waitUntil: 'domcontentloaded' });
    event(s, 'lifecycle', 'info', '已打开指定版本的真实 TEST 预览。');
    return { ready: true };
  } catch (error) {
    await context.close();
    sessions.delete(id);
    throw error;
  }
}
export async function observe(id: string, after = 0) {
  const s = get(id);
  if (s.queries.size)
    await s.page.evaluate(
      (ids) => {
        const target = document.querySelector('iframe')?.contentWindow;
        for (const id of ids) target?.postMessage({ type: 'studio.pending', id }, '*');
      },
      [...s.queries.keys()],
    );
  return {
    events: s.events.filter((e) => e.sequence > after),
    queries: [...s.queries.values()],
    requests: [...s.requests.values()],
  };
}
export async function resolveQuery(id: string, queryId: string, response: object) {
  const s = get(id);
  if (s.requests.delete(queryId)) {
    await s.page.evaluate(
      ({ queryId, response }) => {
        document
          .querySelector('iframe')
          ?.contentWindow?.postMessage({ type: 'site.result', id: queryId, ...response }, '*');
      },
      { queryId, response },
    );
    return { delivered: true };
  }
  if (!s.queries.delete(queryId)) return { delivered: false };
  await s.page.evaluate(
    ({ queryId, response }) => {
      document
        .querySelector('iframe')
        ?.contentWindow?.postMessage({ type: 'studio.result', id: queryId, ...response }, '*');
    },
    { queryId, response },
  );
  return { delivered: true };
}
export async function action(id: string, input: S['StudioDebugAction']) {
  const s = get(id),
    frame = s.page.frameLocator('iframe'),
    selector = 'selector' in input ? input.selector : undefined;
  const locator = selector ? frame.locator(selector) : undefined;
  switch (input.type) {
    case 'click':
      await locator!.click();
      break;
    case 'hover':
      await locator!.hover();
      break;
    case 'fill':
      await locator!.fill(input.value);
      break;
    case 'select':
      await locator!.selectOption(input.value);
      break;
    case 'press':
      await locator!.press(input.value);
      break;
    case 'key_down':
      await frame.locator('body').evaluate((body) => {
        body.setAttribute('tabindex', '-1');
        body.focus();
      });
      await s.page.keyboard.down(input.key);
      break;
    case 'key_up':
      await s.page.keyboard.up(input.key);
      break;
    case 'mouse':
      await s.page.mouse.move(input.x, input.y);
      if (input.event === 'click') await s.page.mouse.click(input.x, input.y);
      else if (input.event === 'down') await s.page.mouse.down();
      else if (input.event === 'up') await s.page.mouse.up();
      break;
    case 'evaluate': {
      const appFrame = s.page
        .frames()
        .find((candidate) => candidate.parentFrame() === s.page.mainFrame());
      if (!appFrame) throw new Error('DEBUG_APP_FRAME_UNAVAILABLE');
      const result: unknown = await appFrame.evaluate(input.expression);
      return {
        result: JSON.parse(
          JSON.stringify(result ?? null, (_key, value: unknown) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        ) as unknown,
      };
    }
    case 'check':
      await locator!.setChecked(input.checked);
      break;
    case 'resize':
      await s.page.setViewportSize({ width: input.width, height: input.height });
      break;
    case 'scroll':
      await frame
        .locator('body')
        .evaluate(
          (body, position) => body.ownerDocument.defaultView!.scrollBy(position.x, position.y),
          { x: input.x, y: input.y },
        );
      break;
    case 'wait':
      if (locator) await locator.waitFor({ state: 'visible' });
      if (input.milliseconds)
        await new Promise((resolve) => setTimeout(resolve, input.milliseconds));
      break;
    case 'reload':
      s.queries.clear();
      await s.page.reload({ waitUntil: 'domcontentloaded' });
      break;
    case 'inspect': {
      const observation = await locator!.evaluate((element) => {
        const rect = element.getBoundingClientRect(),
          win = element.ownerDocument.defaultView!,
          style = win.getComputedStyle(element),
          clone = element.cloneNode(true) as Element;
        clone.querySelectorAll('script,style').forEach((node) => node.remove());
        const keys = [
          'display',
          'position',
          'width',
          'height',
          'minWidth',
          'minHeight',
          'maxWidth',
          'maxHeight',
          'overflow',
          'overflowX',
          'overflowY',
          'color',
          'backgroundColor',
          'fontSize',
          'lineHeight',
          'padding',
          'margin',
          'gap',
          'gridTemplateColumns',
          'flexDirection',
          'zIndex',
        ];
        return {
          html: clone.outerHTML,
          text: (element as HTMLElement).innerText ?? element.textContent,
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          scroll: {
            width: element.scrollWidth,
            height: element.scrollHeight,
            left: element.scrollLeft,
            top: element.scrollTop,
          },
          viewport: { width: win.innerWidth, height: win.innerHeight },
          styles: Object.fromEntries(keys.map((key) => [key, Reflect.get(style, key) as string])),
        };
      });
      return { ...observation, accessibility: await locator!.ariaSnapshot() };
    }
  }
  return { type: input.type, completed: true, viewport: s.page.viewportSize() };
}
export async function screenshot(id: string, fullPage: boolean, selector?: string) {
  const s = get(id);
  let png: Buffer;
  if (selector)
    png = await s.page.frameLocator('iframe').locator(selector).screenshot({ type: 'png' });
  else if (fullPage) {
    const height = await s.page
      .frameLocator('iframe')
      .locator('html')
      .evaluate((html) =>
        Math.max(html.scrollHeight, html.ownerDocument.body?.scrollHeight ?? 0, html.clientHeight),
      );
    try {
      await s.page.locator('iframe').evaluate((frame, height) => {
        frame.style.height = height + 'px';
        document.documentElement.style.overflow = 'visible';
        document.body.style.overflow = 'visible';
      }, height);
      png = await s.page.screenshot({ type: 'png', fullPage: true });
    } finally {
      await s.page.locator('iframe').evaluate((frame) => {
        frame.style.height = '100%';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      });
    }
  } else png = await s.page.screenshot({ type: 'png' });
  return {
    base64: png.toString('base64'),
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    mediaType: 'image/png' as const,
    capturedAt: new Date().toISOString(),
  };
}
export async function close(id: string) {
  const s = sessions.get(id);
  if (s) {
    s.closed = true;
    await s.context.close();
    sessions.delete(id);
  }
  return { closed: true };
}
const cleanup = setInterval(() => {
  const idle = Number(process.env['PREVIEW_IDLE_MS'] ?? 1800000);
  for (const [id, s] of sessions) if (Date.now() - s.lastUsed > idle) void close(id);
}, 60000);
cleanup.unref();
export async function shutdown() {
  clearInterval(cleanup);
  await Promise.all([...sessions.keys()].map(close));
  if (browser) await (await browser).close();
}
