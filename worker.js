// Конфигурация API
const API_CONFIG = {
    baseUrl: 'https://suppliers-api.wildberries.ru',
    contentUrl: 'https://content-suppliers.wildberries.ru',
    endpoints: {
        '/content/v2/get/cards/list': {
            url: 'https://content-suppliers.wildberries.ru/content/v2/get/cards/list',
            method: 'POST',
            headers: (key) => ({
                'Content-Type': 'application/json',
                'Authorization': key
            })
        },
        '/api/v1/supplier/sales': {
            url: 'https://suppliers-api.wildberries.ru/api/v1/supplier/sales',
            method: 'GET',
            headers: (key) => ({
                'Content-Type': 'application/json',
                'Authorization': key
            })
        },
        '/api/v1/supplier/stocks': {
            url: 'https://suppliers-api.wildberries.ru/api/v1/supplier/stocks',
            method: 'GET',
            headers: (key) => ({
                'Content-Type': 'application/json',
                'Authorization': key
            })
        }
    }
};

// Обработка CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*'
};

// Утилиты для работы с API
const apiUtils = {
    // Проверка и форматирование API ключа
    validateApiKey(key) {
        if (!key || typeof key !== 'string') {
            throw new Error('API ключ обязателен');
        }
        return key.trim();
    },

    // Обработка ошибок API
    handleApiError(error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Внутренняя ошибка сервера'
        }), {
            status: error.status || 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
};

// Обработчик запросов
async function handleRequest(request) {
    // Обработка CORS preflight запросов
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders
        });
    }

    try {
        // Получаем параметры запроса
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        const apiKey = url.searchParams.get('key');
        const nm = url.searchParams.get('nm');

        // Проверяем обязательные параметры
        if (!path) {
            throw new Error('Параметр path обязателен');
        }
        if (!apiKey) {
            throw new Error('Параметр key обязателен');
        }
        if (!nm) {
            throw new Error('Параметр nm обязателен');
        }

        // Получаем конфигурацию эндпоинта
        const endpoint = API_CONFIG.endpoints[path];
        if (!endpoint) {
            throw new Error('Неизвестный эндпоинт: ' + path);
        }

        // Формируем параметры запроса
        let apiUrl = new URL(endpoint.url);
        let requestParams = {
            method: endpoint.method,
            headers: endpoint.headers(apiKey)
        };

        // Подготавливаем данные в зависимости от метода
        if (endpoint.method === 'POST') {
            if (path === '/content/v2/get/cards/list') {
                requestParams.body = JSON.stringify({
                    vendorCodes: [nm]
                });
            }
        } else if (endpoint.method === 'GET') {
            // Добавляем параметры для GET запросов
            apiUrl.searchParams.set('nm', nm);
            
            // Копируем остальные параметры
            for (const [key, value] of url.searchParams.entries()) {
                if (!['path', 'key', 'nm'].includes(key)) {
                    apiUrl.searchParams.set(key, value);
                }
            }
        }

        console.log('Sending request to:', apiUrl.toString());
        console.log('Request params:', JSON.stringify(requestParams));

        // Выполняем запрос к API
        const response = await fetch(apiUrl.toString(), requestParams);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data).slice(0, 200));

        // Возвращаем результат
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        return apiUtils.handleApiError(error);
    }
}

// Регистрируем обработчик
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
