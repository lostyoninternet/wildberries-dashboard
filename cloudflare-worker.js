// Cloudflare Worker для проксирования запросов к API Wildberries
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Настройка CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  }

  // Обработка OPTIONS запросов для CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  try {
    // Получаем параметры запроса
    const url = new URL(request.url)
    const path = url.searchParams.get('path')
    const token = url.searchParams.get('token')
    const nmID = url.searchParams.get('nmID')

    if (!path || !token) {
      return new Response('Missing required parameters', { 
        status: 400,
        headers: corsHeaders
      })
    }

    // Формируем URL для API Wildberries
    const apiUrl = `https://suppliers-api.wildberries.ru/${path}`
    
    // Добавляем nmID к URL если он есть
    const finalUrl = nmID ? `${apiUrl}?nmID=${nmID}` : apiUrl

    // Выполняем запрос к API Wildberries
    const response = await fetch(finalUrl, {
      headers: {
        'Authorization': token
      }
    })

    // Получаем данные
    const data = await response.json()

    // Возвращаем ответ с CORS-заголовками
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    // Обработка ошибок
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}
