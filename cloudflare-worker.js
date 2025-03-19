// Cloudflare Worker для проксирования запросов к API Wildberries
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Разрешаем только GET-запросы
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Получаем URL из параметра запроса
  const url = new URL(request.url)
  const apiPath = url.searchParams.get('path')
  const articleNumber = url.searchParams.get('nm')

  if (!apiPath) {
    return new Response('Missing required "path" parameter', { status: 400 })
  }

  let apiUrl = ''
  let headers = {}

  // Определяем, какой эндпоинт API нужно использовать
  if (apiPath === 'detail') {
    apiUrl = `https://card.wb.ru/cards/detail?nm=${articleNumber}`
  } else if (apiPath === 'v1/detail') {
    apiUrl = `https://card.wb.ru/cards/v1/detail?nm=${articleNumber}`
  } else if (apiPath === 'nm-report') {
    apiUrl = 'https://suppliers-api.wildberries.ru/api/v2/nm-report/detail'
    headers = {
      'Authorization': url.searchParams.get('token') || ''
    }
  }

  // Если URL не определен, возвращаем ошибку
  if (!apiUrl) {
    return new Response('Invalid API path', { status: 400 })
  }

  try {
    // Делаем запрос к API Wildberries
    const response = await fetch(apiUrl, {
      headers: headers,
      cf: {
        cacheTtl: 3600, // Кэширование на 1 час
        cacheEverything: true
      }
    })

    // Получаем данные ответа
    const data = await response.json()

    // Создаем новый Response с CORS-заголовками
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
