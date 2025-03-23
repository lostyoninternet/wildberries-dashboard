// Конфигурация API
const API_CONFIG = {
    endpoints: {
        // Content API
        'content/cards': {
            url: 'https://suppliers-api.wildberries.ru/content/v2/cards/list',
            method: 'POST',
            headers: (key) => ({
                'Authorization': key,
                'Content-Type': 'application/json'
            })
        },
        // Statistics API
        'statistics/sales': {
            url: 'https://statistics-api.wildberries.ru/api/v1/supplier/sales',
            method: 'GET',
            headers: (key) => ({
                'Authorization': key
            })
        },
        // Statistics API - детальная статистика
        'statistics/sales/detail': {
            url: 'https://statistics-api.wildberries.ru/api/v1/supplier/sales/detail',
            method: 'GET',
            headers: (key) => ({
                'Authorization': key
            })
        },
        // Statistics API - остатки
        'statistics/stocks': {
            url: 'https://statistics-api.wildberries.ru/api/v1/supplier/stocks',
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
    // Получение информации о товарах
    async 'content/cards'(params) {
        const { key, nm } = params;
        if (!key || !nm) {
            throw new Error('Параметры key и nm обязательны');
        }

        const endpoint = API_CONFIG.endpoints['content/cards'];
        const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: endpoint.headers(key),
            body: JSON.stringify({
                vendorCodes: [nm],
                allowedCategoriesIds: []
            })
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения информации о товаре: ${response.status}`);
        }

        const data = await response.json();
        return { data };
    },

    // Получение статистики продаж
    async 'statistics/sales'(params) {
        const { key, nm, dateFrom, dateTo } = params;
        if (!key || !dateFrom || !dateTo) {
            throw new Error('Параметры key, dateFrom и dateTo обязательны');
        }

        const endpoint = API_CONFIG.endpoints['statistics/sales'];
        const url = new URL(endpoint.url);
        url.searchParams.set('dateFrom', dateFrom);
        url.searchParams.set('dateTo', dateTo);
        if (nm) {
            url.searchParams.set('nmId', nm);
        }

        const response = await fetch(url.toString(), {
            headers: endpoint.headers(key)
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения статистики продаж: ${response.status}`);
        }

        const data = await response.json();
        return { data };
    },

    // Получение детальной статистики продаж
    async 'statistics/sales/detail'(params) {
        const { key, nm, dateFrom, dateTo } = params;
        if (!key || !dateFrom || !dateTo) {
            throw new Error('Параметры key, dateFrom и dateTo обязательны');
        }

        const endpoint = API_CONFIG.endpoints['statistics/sales/detail'];
        const url = new URL(endpoint.url);
        url.searchParams.set('dateFrom', dateFrom);
        url.searchParams.set('dateTo', dateTo);
        if (nm) {
            url.searchParams.set('nmId', nm);
        }

        const response = await fetch(url.toString(), {
            headers: endpoint.headers(key)
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения детальной статистики: ${response.status}`);
        }

        const data = await response.json();
        return { data };
    },

    // Получение информации об остатках
    async 'statistics/stocks'(params) {
        const { key, dateFrom } = params;
        if (!key || !dateFrom) {
            throw new Error('Параметры key и dateFrom обязательны');
        }

        const endpoint = API_CONFIG.endpoints['statistics/stocks'];
        const url = new URL(endpoint.url);
        url.searchParams.set('dateFrom', dateFrom);

        const response = await fetch(url.toString(), {
            headers: endpoint.headers(key)
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения информации об остатках: ${response.status}`);
        }

        const data = await response.json();
        return { data };
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
