// Конфигурация API
const API_CONFIG = {
    baseUrl: 'https://suppliers-api.wildberries.ru',
    contentUrl: 'https://content-suppliers.wildberries.ru',
    endpoints: {
        '/content/v2/get/cards/list': {
            url: 'https://content-suppliers.wildberries.ru/content/v2/get/cards/list',
            method: 'POST'
        },
        '/api/v1/supplier/sales': {
            url: 'https://suppliers-api.wildberries.ru/api/v1/supplier/sales',
            method: 'GET'
        },
        '/api/v1/supplier/stocks': {
            url: 'https://suppliers-api.wildberries.ru/api/v1/supplier/stocks',
            method: 'GET'
        }
    }
};

// Обработка CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // Создание заголовков для запроса
    createHeaders(apiKey) {
        return {
            'Content-Type': 'application/json',
            'Authorization': apiKey
        };
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

        // Проверяем API ключ
        apiUtils.validateApiKey(apiKey);

        // Получаем конфигурацию эндпоинта
        const endpoint = API_CONFIG.endpoints[path];
        if (!endpoint) {
            throw new Error('Неизвестный эндпоинт');
        }

        // Формируем параметры запроса
        const requestParams = {
            method: endpoint.method,
            headers: apiUtils.createHeaders(apiKey)
        };

        // Добавляем тело запроса для POST методов
        if (endpoint.method === 'POST') {
            requestParams.body = JSON.stringify({
                vendorCodes: [url.searchParams.get('nm')]
            });
        }

        // Формируем URL запроса
        let apiUrl = new URL(endpoint.url);
        if (endpoint.method === 'GET') {
            // Копируем все параметры из оригинального запроса
            for (const [key, value] of url.searchParams.entries()) {
                if (key !== 'path' && key !== 'key') {
                    apiUrl.searchParams.append(key, value);
                }
            }
        }

        // Выполняем запрос к API
        const response = await fetch(apiUrl.toString(), requestParams);
        const data = await response.json();

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
