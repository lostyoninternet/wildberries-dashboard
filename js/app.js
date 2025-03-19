// Constants
const API_URL = 'https://suppliers-api.wildberries.ru';
const PROXY_URL = 'https://cloudflare-workerjs.jaba-valerievna.workers.dev';

// Загрузка токена из файла API.txt
let TOKEN = null;
fetch('/API.txt')
    .then(response => response.text())
    .then(text => {
        TOKEN = text.trim();
        console.log('API токен успешно загружен');
    })
    .catch(error => {
        console.error('Ошибка загрузки токена:', error);
    });

// Config для API
const config = {
    // Никогда не использовать демо-данные
    useOnlyMockData: false,
    useFallbackData: false
};

// DOM Elements
const articleInput = document.getElementById('article-input');
const searchBtn = document.getElementById('search-btn');
const loader = document.getElementById('loader');
const welcomeScreen = document.getElementById('welcome-screen');
const dashboard = document.getElementById('dashboard');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Charts
let salesChart = null;
let funnelChart = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    searchBtn.addEventListener('click', searchProduct);
    articleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProduct();
        }
    });
});

// Поиск и отображение данных о товаре
async function searchProduct() {
    const articleNumber = articleInput.value.trim();
    
    if (!articleNumber) {
        showError('Введите артикул товара');
        return;
    }
    
    if (!TOKEN) {
        showError('API токен не загружен. Пожалуйста, проверьте файл API.txt и перезагрузите страницу.');
        return;
    }
    
    showLoader(true);
    showDashboard(false);
    errorMessage.style.display = 'none'; // Скрываем сообщение об ошибке
    
    try {
        // Получение информации о товаре и статистики через API
        const productInfo = await getProductInfo(articleNumber);
        const productStats = await getProductStats(articleNumber);
        
        // Обновление дашборда
        updateDashboard(productInfo, productStats);
        
        showDashboard(true);
    } catch (error) {
        console.error('Error fetching product data:', error);
        showError(error.message || 'Не удалось загрузить данные о товаре');
    } finally {
        showLoader(false);
    }
}

// Получение информации о товаре через официальный API
async function getProductInfo(articleNumber) {
    try {
        console.log(`Получение данных о товаре по артикулу: ${articleNumber}`);
        
        // Используем API для получения карточки товара через прокси
        const response = await fetch(`${PROXY_URL}?path=content/cards/cursor/list&token=${TOKEN}`);
        
        if (!response.ok) {
            throw new Error(`API вернул статус ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ответ API карточки:', data);
        
        // Найдем товар по артикулу в списке
        let product = null;
        
        if (data && data.data && data.data.cards) {
            product = data.data.cards.find(card => card.nmID == articleNumber);
        }
        
        if (!product) {
            // Если товар не найден в первой странице, получим следующую
            if (data && data.data && data.data.cursor) {
                const cursor = data.data.cursor.nextPage;
                if (cursor) {
                    const nextPageResponse = await fetch(`${PROXY_URL}?path=content/cards/cursor/list&token=${TOKEN}&cursor=${cursor}`);
                    if (nextPageResponse.ok) {
                        const nextPageData = await nextPageResponse.json();
                        if (nextPageData && nextPageData.data && nextPageData.data.cards) {
                            product = nextPageData.data.cards.find(card => card.nmID == articleNumber);
                        }
                    }
                }
            }
        }
        
        if (!product) {
            // Если товар не найден, попробуем получить его напрямую
            const directResponse = await fetch(`${PROXY_URL}?path=content/cards/filter&token=${TOKEN}&nmID=${articleNumber}`);
            if (directResponse.ok) {
                const directData = await directResponse.json();
                if (directData && directData.data && directData.data.cards && directData.data.cards.length > 0) {
                    product = directData.data.cards[0];
                }
            }
        }
        
        if (!product) {
            throw new Error(`Товар с артикулом ${articleNumber} не найден`);
        }
        
        console.log('Найденный товар:', product);
        
        // Форматируем данные для дашборда
        return {
            id: product.nmID || articleNumber,
            name: product.title || product.subjectName || 'Нет данных',
            brand: product.brand || 'Нет данных',
            reviewRating: product.rating || 0,
            feedbacks: product.feedbackCount || 0,
            pics: product.mediaFiles || [],
            colors: product.colors || [],
            sizes: product.sizes || [],
            priceU: product.price * 100 || 0, // Умножаем на 100 для сохранения формата
            salePriceU: (product.price - (product.price * (product.discount || 0) / 100)) * 100 || 0
        };
    } catch (error) {
        console.error('Error fetching product info:', error);
        throw new Error(`Ошибка получения данных о товаре: ${error.message}`);
    }
}

// Получение статистики товара с API
async function getProductStats(articleNumber) {
    try {
        console.log(`Получение статистики товара по артикулу: ${articleNumber}`);
        
        // Используем API для получения статистики через прокси
        // Получаем текущую дату и дату 30 дней назад
        const endDate = getCurrentDate();
        const startDate = getDateXDaysAgo(30);
        
        const requestData = {
            dateFrom: startDate,
            dateTo: endDate,
            dimension: "nmId",
            limit: 1000,
            offset: 0,
            filters: {
                nmId: parseInt(articleNumber)
            }
        };
        
        // Запрос к API аналитики
        const requestUrl = `${PROXY_URL}?path=analytics/nm-report&token=${TOKEN}&body=${encodeURIComponent(JSON.stringify(requestData))}`;
        console.log('Запрос к API аналитики:', requestUrl);
        
        const response = await fetch(requestUrl);
        
        if (!response.ok) {
            throw new Error(`API аналитики вернул статус ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ответ API аналитики:', data);
        
        // Проверяем наличие данных
        if (!data || !data.data || !data.data.length) {
            throw new Error('Данные о статистике товара не найдены');
        }
        
        // Обрабатываем данные для дашборда
        const statsData = {
            orders: 0,
            ordersSumRub: 0,
            buyoutPercent: 0,
            openCard: 0,
            addToCart: 0,
            conversion: 0,
            stockWbQty: 0,
            stockMpQty: 0,
            salesHistory: []
        };
        
        // Суммируем данные по всем записям
        data.data.forEach(item => {
            statsData.orders += item.orderCount || 0;
            statsData.ordersSumRub += item.orderSumRub || 0;
            statsData.openCard += item.openCardCount || 0;
            statsData.addToCart += item.addToCartCount || 0;
        });
        
        // Рассчитываем производные показатели
        statsData.buyoutPercent = calculateBuyoutPercent(statsData.orders, data.data.reduce((sum, item) => sum + (item.buyoutsCount || 0), 0));
        statsData.conversion = calculateConversion(statsData.openCard, statsData.orders);
        
        // Получаем данные об остатках
        const stockResponse = await fetch(`${PROXY_URL}?path=content/stocks&token=${TOKEN}&skus=${articleNumber}`);
        if (stockResponse.ok) {
            const stockData = await stockResponse.json();
            console.log('Данные об остатках:', stockData);
            
            if (stockData && stockData.data && stockData.data.length > 0) {
                const stock = stockData.data[0];
                statsData.stockWbQty = stock.wbQuantity || 0;
                statsData.stockMpQty = stock.quantity || 0;
            }
        }
        
        // Формируем историю продаж
        if (data.data && data.data.length > 0) {
            const sortedData = [...data.data].sort((a, b) => new Date(a.date) - new Date(b.date));
            statsData.salesHistory = sortedData.map(item => ({
                date: item.date,
                orderCount: item.orderCount || 0,
                orderSum: item.orderSumRub || 0
            }));
        } else {
            // Если нет данных для истории, создаем пустую историю
            for (let i = 0; i < 30; i++) {
                statsData.salesHistory.push({
                    date: getDateXDaysAgo(29 - i),
                    orderCount: 0,
                    orderSum: 0
                });
            }
        }
        
        console.log('Сформированные данные о статистике:', statsData);
        return statsData;
    } catch (error) {
        console.error('Error fetching product stats:', error);
        // Создаем базовую статистику с нулевыми значениями
        const emptyStats = {
            orders: 0,
            ordersSumRub: 0,
            buyoutPercent: 0,
            openCard: 0,
            addToCart: 0,
            conversion: 0,
            stockWbQty: 0,
            stockMpQty: 0,
            salesHistory: []
        };
        
        // Создаем пустую историю продаж
        for (let i = 0; i < 30; i++) {
            emptyStats.salesHistory.push({
                date: getDateXDaysAgo(29 - i),
                orderCount: 0,
                orderSum: 0
            });
        }
        
        return emptyStats;
    }
}

// Helper Functions
function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}

function showDashboard(show) {
    welcomeScreen.style.display = show ? 'none' : 'block';
    dashboard.style.display = show ? 'block' : 'none';
    errorMessage.style.display = 'none';
}

function showError(message) {
    welcomeScreen.style.display = 'none';
    dashboard.style.display = 'none';
    errorMessage.style.display = 'block';
    errorText.textContent = message;
}

function updateDashboard(productData, statsData) {
    // Update product info
    document.getElementById('product-name').textContent = productData.name || 'Название товара';
    document.getElementById('product-brand').textContent = productData.brand || 'Бренд';
    document.getElementById('article-value').textContent = productData.id || '';
    
    const price = productData.salePriceU ? (productData.salePriceU / 100).toLocaleString('ru-RU') : '0';
    document.getElementById('product-price').textContent = `${price} ₽`;
    
    const discount = calculateDiscount(productData.priceU, productData.salePriceU);
    document.getElementById('product-discount').textContent = `-${discount}%`;
    
    updateRating(productData.reviewRating || 0, productData.feedbacks || 0);
    
    // Update product image
    const imageUrl = productData.pics && productData.pics.length > 0 
        ? `https://images.wbstatic.net/c516x688/new/${Math.floor(productData.id / 10000)}0000/${productData.id}-1.jpg` 
        : 'https://via.placeholder.com/300';
    document.getElementById('product-image').src = imageUrl;
    
    // Update stats
    document.getElementById('orders-count').textContent = formatNumber(statsData.orders || 0);
    document.getElementById('sales-sum').textContent = `${formatNumber(statsData.ordersSumRub || 0)} ₽`;
    document.getElementById('buyout-percent').textContent = `${statsData.buyoutPercent || 0}%`;
    
    document.getElementById('open-card').textContent = formatNumber(statsData.openCard || 0);
    document.getElementById('add-to-cart').textContent = formatNumber(statsData.addToCart || 0);
    document.getElementById('conversion').textContent = `${statsData.conversion || 0}%`;
    
    document.getElementById('stock-wb').textContent = formatNumber(statsData.stockWbQty || 0);
    document.getElementById('stock-mp').textContent = formatNumber(statsData.stockMpQty || 0);
    
    // Update charts
    updateSalesChart(statsData.salesHistory || []);
    updateFunnelChart(statsData);
}

function updateRating(rating, reviewCount) {
    const starsContainer = document.getElementById('product-rating');
    const reviewsCountElement = document.getElementById('reviews-count');
    
    starsContainer.innerHTML = '';
    
    // Create 5 stars
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        if (i <= Math.floor(rating)) {
            star.className = 'fas fa-star';
        } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
            star.className = 'fas fa-star-half-alt';
        } else {
            star.className = 'far fa-star';
        }
        starsContainer.appendChild(star);
    }
    
    // Update reviews count
    reviewsCountElement.textContent = `(${formatNumber(reviewCount)} отзывов)`;
}

function updateSalesChart(salesHistory) {
    const canvas = document.getElementById('sales-chart');
    canvas.style.height = '300px'; // Set fixed height
    canvas.style.width = '600px'; // Set fixed width
    const ctx = canvas.getContext('2d');
    
    // Destroy previous chart if exists
    if (salesChart) {
        salesChart.destroy();
    }
    
    // Prepare chart data
    const labels = salesHistory.map(item => item.date);
    const salesData = salesHistory.map(item => item.orderCount);
    const revenueData = salesHistory.map(item => item.orderSum);
    
    // Create new chart
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Заказы',
                    data: salesData,
                    backgroundColor: 'rgba(203, 17, 171, 0.2)',
                    borderColor: 'rgba(203, 17, 171, 1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3
                },
                {
                    label: 'Выручка (÷1000 ₽)',
                    data: revenueData.map(val => val / 1000),
                    backgroundColor: 'rgba(118, 5, 247, 0.2)',
                    borderColor: 'rgba(118, 5, 247, 1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

function updateFunnelChart(statsData) {
    const canvas = document.getElementById('funnel-chart');
    canvas.style.height = '300px'; // Set fixed height
    canvas.style.width = '600px'; // Set fixed width
    const ctx = canvas.getContext('2d');
    
    // Destroy previous chart if exists
    if (funnelChart) {
        funnelChart.destroy();
    }
    
    // Prepare chart data
    const data = [
        statsData.openCard || 0,
        statsData.addToCart || 0,
        statsData.orders || 0,
        statsData.buyoutCount || 0
    ];
    
    // Create new chart
    funnelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Просмотры', 'Корзина', 'Заказы', 'Выкуп'],
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(203, 17, 171, 0.7)',
                    'rgba(118, 5, 247, 0.7)',
                    'rgba(255, 212, 0, 0.7)',
                    'rgba(76, 175, 80, 0.7)'
                ],
                borderColor: [
                    'rgba(203, 17, 171, 1)',
                    'rgba(118, 5, 247, 1)',
                    'rgba(255, 212, 0, 1)',
                    'rgba(76, 175, 80, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function formatNumber(num) {
    return num.toLocaleString('ru-RU');
}

function calculateDiscount(originalPrice, salePrice) {
    if (!originalPrice || !salePrice || originalPrice <= salePrice) {
        return 0;
    }
    
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

function getCurrentDate() {
    const date = new Date();
    return date.toISOString().split('T')[0];
}

function getDateXDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

function calculateBuyoutPercent(orders, buyoutCount) {
    if (!orders || orders === 0) return 0;
    return Math.round((buyoutCount / orders) * 100);
}

function calculateConversion(openCard, orders) {
    if (!openCard || openCard === 0) return 0;
    return Math.round((orders / openCard) * 100);
}
