// Service worker do PWA. Existe por dois motivos:
//  1. o Chrome no Android só oferece "Instalar app" (WebAPK) quando há um SW
//     com handler de fetch — sem ele o menu cai no atalho comum do navegador;
//  2. dá ao app uma casca offline em vez da tela de erro nativa.
//
// Estratégia: navegação sempre da rede; o cache guarda só estáticos do Next e
// ícones (têm hash na URL ou nunca mudam). Página de dados não entra no cache.
//
// Antes as navegações eram gravadas no cache e devolvidas de lá quando a rede
// demorava mais que o prazo. Num aparelho lento isso mostrava a lista de
// pedidos de horas atrás com cara de lista atual: quem acabava de salvar um
// pedido não o encontrava e achava que ele havia sumido. Página velha calada é
// pior que aviso de "sem conexão", então sobrou só o aviso.
//
// O prazo também subiu: 8s derrubava requisição que ia completar (celular em
// 3G somado à função do servidor acordando), e cada derrubada dessas virava
// uma tela de erro sem motivo.

const CACHE_NAME = 'sandra-bolos-v2'
const NAVIGATION_TIMEOUT_MS = 25000

const OFFLINE_HTML =
  '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Sem conexão</title><script>setTimeout(function(){location.reload()},4000)<\/script>' +
  '</head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;' +
  'justify-content:center;min-height:100vh;margin:0;background:#f3f4f6;color:#374151">' +
  '<p>Sem conexão. Reconectando…</p></body></html>'

const offlineResponse = () =>
  new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    fetch(request).then(
      res => { clearTimeout(timer); resolve(res) },
      err => { clearTimeout(timer); reject(err) }
    )
  })
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  // Payloads RSC das navegações client-side do Next: sempre da rede, nunca em cache.
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return

  const isEstatico =
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|webmanifest)$/.test(url.pathname)

  if (isEstatico) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request)
          .then(response => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
            }
            return response
          })
          .catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' }))
      })
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      // redirect:'manual' devolve uma resposta opaca que o próprio navegador segue —
      // evita o response.redirected que o WKWebView (iOS) rejeita em navegação.
      fetchWithTimeout(new Request(request, { redirect: 'manual' }), NAVIGATION_TIMEOUT_MS)
        // Sem rede vai a casca offline, que se recarrega sozinha. Ela não
        // finge ter dado: o que não veio do servidor agora não aparece.
        .catch(() => offlineResponse())
    )
  }
})
