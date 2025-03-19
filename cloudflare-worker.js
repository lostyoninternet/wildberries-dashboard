// Cloudflare Worker для проксирования запросов к API Wildberries
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Разрешаем только GET-запросы
  if (request.method !== 'GET' && request.method !== 'POST') {
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
  const cursor = url.searchParams.get('cursor')
  const body = url.searchParams.get('body')
  const skus = url.searchParams.get('skus')

  if (!apiPath) {
    return new Response(JSON.stringify({ error: 'Missing required "path" parameter' }), { 
      status: 400,
      headers: corsHeaders()
    })
  }

  let apiUrl = ''
  let headers = {}
  let method = 'GET'
  let requestBody = null

  // Маппинг путей Wildberries API
  // API Контент
  if (apiPath === 'content/cards/cursor/list') {
    apiUrl = `https://suppliers-api.wildberries.ru/content/v1/cards/cursor/list`
    method = 'GET'
    headers = {
      'Authorization': token
    }
    
    // Добавляем курсор, если он есть
    if (cursor) {
      apiUrl += `?cursor=${cursor}`
    }
  } 
  else if (apiPath === 'content/cards/filter') {
    apiUrl = `https://suppliers-api.wildberries.ru/content/v1/cards/filter`
    method = 'POST'
    headers = {
      'Content-Type': 'application/json',
      'Authorization': token
    }
    
    // Создаем тело запроса для фильтрации по nmID
    requestBody = JSON.stringify({
      filter: {
        nmID: parseInt(articleNumber)
      },
      sort: {
        cursor: {
          limit: 1
        }
      }
    })
  }
  else if (apiPath === 'content/stocks') {
    apiUrl = `https://suppliers-api.wildberries.ru/api/v3/stocks/${skus}`
    method = 'GET'
    headers = {
      'Authorization': token
    }
  }
  // API Аналитика
  else if (apiPath === 'analytics/nm-report') {
    apiUrl = `https://suppliers-api.wildberries.ru/api/v1/supplier/reportDetailByPeriod`
    method = 'POST'
    headers = {
      'Content-Type': 'application/json',
      'Authorization': token
    }
    
    // Если передано тело запроса, используем его
    if (body) {
      try {
        requestBody = body
      } catch (e) {
        console.error('Failed to parse body:', e)
      }
    }
  }
  // API Цены и скидки
  else if (apiPath === 'pricing/getPrices') {
    apiUrl = `https://suppliers-api.wildberries.ru/public/api/v1/info?supplierArticle=${articleNumber}`
    method = 'GET'
    headers = {
      'Authorization': token
    }
  }
  // Публичные эндпоинты для карточек товаров (legacy, но иногда работают лучше)
  else if (apiPath === 'detail') {
    apiUrl = `https://card.wb.ru/cards/detail?nm=${articleNumber}`
  } 
  else if (apiPath === 'v1/detail') {
    apiUrl = `https://card.wb.ru/cards/v1/detail?nm=${articleNumber}`
  }

  // Если URL не определен, возвращаем ошибку
  if (!apiUrl) {
    return new Response(JSON.stringify({ error: 'Invalid API path', path: apiPath }), { 
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
      body: method === 'POST' ? requestBody : null,
      redirect: 'follow'
    }
    
    const response = await fetch(apiUrl, fetchOptions)
    
    // Если ответ не успешный, логируем и возвращаем ошибку
    if (!response.ok) {
      console.error(`API responded with status: ${response.status}`)
      
      // Попробуем прочитать детали ошибки
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
      } catch (e) {}
      
      return new Response(
        JSON.stringify({ 
          error: `API responded with status: ${response.status}`,
          url: apiUrl,
          method: method,
          details: errorDetails
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
      
      // Проверка ответа от открытых API Wildberries
      if (apiPath === 'detail' || apiPath === 'v1/detail') {
        if (data && data.data && data.data.products && data.data.products.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: `Товар не найден`,
              nm: articleNumber
            }),
            { 
              status: 404,
              headers: corsHeaders()
            }
          )
        }
      }
      
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
        'Cache-Control': 'public, max-age=60' // Кешируем на 60 секунд
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
