// Конфигурация API
const API_CONFIG = {
    endpoints: {
        'wb/card': {
            url: 'https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&spp=0',
            method: 'GET',
            transform: (nm) => `&nm=${nm}`
        },
        'wb/price-history': {
            url: 'https://basket-10.wb.ru/vol',
            method: 'GET',
            transform: (nm) => `${Math.floor(nm / 100000)}/part${Math.floor(nm / 1000)}/cards/${nm}.json`
        },
        'api/stats': {
            url: 'https://statistics-api.wildberries.ru/api/v1/supplier/sales',
            method: 'GET',
            headers: (key) => ({
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
            throw new Error('API ключ обязателен для этого запроса');
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
    },

    // Форматирование ответа
    formatResponse(data) {
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
};

// Обработчики различных типов запросов
const handlers = {
    async 'wb/card'(params) {
        const { nm } = params;
        if (!nm) {
            throw new Error('Параметр nm обязателен');
        }

        const endpoint = API_CONFIG.endpoints['wb/card'];
        const url = `${endpoint.url}${endpoint.transform(nm)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка получения карточки товара: ${response.status}`);
        }

        const data = await response.json();
        if (!data.data || !data.data.products || data.data.products.length === 0) {
            throw new Error('Товар не найден');
        }

        return data;
    },

    async 'wb/price-history'(params) {
        const { nm } = params;
        if (!nm) {
            throw new Error('Параметр nm обязателен');
        }

        const endpoint = API_CONFIG.endpoints['wb/price-history'];
        const url = `${endpoint.url}/${endpoint.transform(nm)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка получения истории цен: ${response.status}`);
        }

        return response.json();
    },

    async 'api/stats'(params) {
        const { key, nm, dateFrom, dateTo } = params;
        
        // Для статистики нужен API ключ
        apiUtils.validateApiKey(key);
        
        if (!nm || !dateFrom || !dateTo) {
            throw new Error('Параметры nm, dateFrom и dateTo обязательны');
        }

        const endpoint = API_CONFIG.endpoints['api/stats'];
        const url = new URL(endpoint.url);
        url.searchParams.set('nm', nm);
        url.searchParams.set('dateFrom', dateFrom);
        url.searchParams.set('dateTo', dateTo);

        const response = await fetch(url.toString(), {
            headers: endpoint.headers(key)
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения статистики: ${response.status}`);
        }

        return response.json();
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

        // Проверяем наличие пути
        if (!path) {
            throw new Error('Параметр path обязателен');
        }

        // Проверяем существование обработчика
        const handler = handlers[path];
        if (!handler) {
            throw new Error(`Неизвестный путь: ${path}`);
        }

        // Собираем все параметры запроса
        const params = {};
        for (const [key, value] of url.searchParams) {
            if (key !== 'path') {
                params[key] = value;
            }
        }

        // Выполняем запрос через соответствующий обработчик
        const data = await handler(params);
        
        // Возвращаем результат
        return apiUtils.formatResponse(data);

    } catch (error) {
        return apiUtils.handleApiError(error);
    }
}

// Регистрируем обработчик
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
