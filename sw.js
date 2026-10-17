/* ============================================================
 * 呼吸训练 · Service Worker
 * ------------------------------------------------------------
 * 作用：把本页自身的资源缓存下来，之后断网也能打开。
 *
 * 策略说明（cache-first / 缓存优先）：
 *   1. 收到请求先查缓存，命中就直接返回 —— 所以离线可用、秒开
 *   2. 没命中才去网络请求，成功后回写缓存，下次就快了
 *
 * 注意：
 *   - CACHE 名带 v1，以后改代码要手动改版本号，否则用户端一直用旧缓存
 *   - 只缓存同源资源，跨域的 CDN 资源不缓存（本项目是纯离线的，没有 CDN 依赖）
 * ========================================================== */

const CACHE = 'breathing-exercise-v1';

// 需要预缓存的文件清单（相对路径）
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

// 安装阶段：把清单里的资源一次性塞进缓存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  // 立即接管页面，不用等旧 SW 释放
  self.skipWaiting();
});

// 激活阶段：清理掉旧版本的缓存，避免越攒越多
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 拦截请求：缓存优先，未命中再走网络
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求，POST 之类不缓存
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // 只缓存同源的成功响应，避免把错误页面也存进去
          if (!response || response.status !== 200) return response;

          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // 离线且无缓存：导航请求兜底返回首页
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
