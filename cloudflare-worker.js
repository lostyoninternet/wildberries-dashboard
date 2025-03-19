// Cloudflare Worker для проксирования запросов к API Wildberries
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Разрешаем только GET-запросы
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Разрешаем CORS для OPTIONS запросов (preflight)
  if (request.method === 'OPTIONS') {
    return handleCors(request);
  }

  // Получаем URL из параметра запроса
  const url = new URL(request.url)
  const apiPath = url.searchParams.get('path')
  const articleNumber = url.searchParams.get('nm')
  const token = url.searchParams.get('token')

  if (!apiPath) {
    return new Response(JSON.stringify({ error: 'Missing required "path" parameter' }), { 
      status: 400,
      headers: corsHeaders()
    })
  }

  let apiUrl = ''
  let headers = {}
  let method = 'GET'
  let body = null

  // Определяем, какой эндпоинт API нужно использовать
  if (apiPath === 'detail') {
    apiUrl = `https://card.wb.ru/cards/detail?nm=${articleNumber}`
  } else if (apiPath === 'v1/detail') {
    apiUrl = `https://card.wb.ru/cards/v1/detail?nm=${articleNumber}`
  } else if (apiPath === 'nm-report') {
    apiUrl = 'https://suppliers-api.wildberries.ru/api/v2/nm-report/detail'
    method = 'POST'
    headers = {
      'Content-Type': 'application/json',
      'Authorization': token || ''
    }
    
    // Подготовка данных для запроса статистики
    const currentDate = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    body = JSON.stringify({
      nmIDs: [parseInt(articleNumber)],
      period: {
        start: thirtyDaysAgo,
        end: currentDate
      },
      timezone: "Europe/Moscow"
    })
  }

  // Если URL не определен, возвращаем ошибку
  if (!apiUrl) {
    return new Response(JSON.stringify({ error: 'Invalid API path' }), { 
      status: 400,
      headers: corsHeaders()
    })
  }

  console.log(`Proxying request to: ${apiUrl}, method: ${method}`)

  try {
    // Делаем запрос к API Wildberries
    const fetchOptions = {
      method: method,
      headers: headers,
      body: method === 'POST' ? body : null,
      redirect: 'follow'
    }
    
    const response = await fetch(apiUrl, fetchOptions)
    
    // Если ответ не успешный, возвращаем ошибку
    if (!response.ok) {
      console.error(`API responded with status: ${response.status}`)
      return new Response(
        JSON.stringify({ 
          error: `API responded with status: ${response.status}`,
          url: apiUrl,
          method: method
        }), 
        { 
          status: response.status,
          headers: corsHeaders()
        }
      )
    }

    // Получаем данные ответа
    const responseText = await response.text()
    let data
    
    try {
      data = JSON.parse(responseText)
      console.log('API responded with data structure:', Object.keys(data))
    } catch (e) {
      console.error('Failed to parse JSON response:', e)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in API response', 
          text: responseText.substring(0, 500) + '...'
        }), 
        { 
          status: 500,
          headers: corsHeaders()
        }
      )
    }

    // Создаем новый Response с CORS-заголовками
    return new Response(JSON.stringify(data), {
      headers: corsHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      })
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        stack: error.stack,
        url: apiUrl
      }), 
      {
        status: 500,
        headers: corsHeaders()
      }
    )
  }
}

// Вспомогательная функция для CORS-заголовков
function corsHeaders(additionalHeaders = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...additionalHeaders
  }
}

// Обработка preflight запросов
function handleCors(request) {
  // Мок-ответ для preflight запросов
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  })
}
