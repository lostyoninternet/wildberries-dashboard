// Constants
const API_URL = 'https://suppliers-api.wildberries.ru';
const TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjUwMjE3djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc1ODE3MTY1MCwiaWQiOiIwMTk1YWY1OS1jNDE1LTc0NjYtOWUyZi1lZDcwOWExMWYxYTYiLCJpaWQiOjkxMzY3NDM3LCJvaWQiOjQwNzg3MTIsInMiOjEwNzM3NDQ5NTgsInNpZCI6ImRlNThmYmRmLWE4ZDYtNDU0NS1iOTM2LTU0N2UzZTJkNjRkNSIsInQiOmZhbHNlLCJ1aWQiOjkxMzY3NDM3fQ.HqykgwTwzrinA91xGG63Y6OMgjh2Z0xoq4n-o_YyZJtnw9HU5IpvGaaCPnUOB9TzHGTOYLcYGPDccivIFFWgXQ';

// Прокси-сервер Cloudflare Worker для обхода CORS
const PROXY_URL = 'https://cloudflare-workerjs.jaba-valerievna.workers.dev'; // URL вашего Worker

// Config для демонстрационного режима
const config = {
    // Всегда использовать реальный API через прокси
    useOnlyMockData: false,
    // Использовать демо-данные при отказе API
    useFallbackData: true
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

// Functions
async function searchProduct() {
    const articleNumber = articleInput.value.trim();
    
    if (!articleNumber) {
        showError('Введите артикул товара');
        return;
    }
    
    showLoader(true);
    showDashboard(false);
    errorMessage.style.display = 'none'; // Скрываем сообщение об ошибке
    
    try {
        let productInfo, productStats;
        
        if (window.mockProducts && window.mockProducts[articleNumber]) {
            console.log(`Использую демо-данные для товара с артикулом ${articleNumber}`);
            productInfo = formatMockProductInfo(window.mockProducts[articleNumber]);
            productStats = formatMockProductStats(window.mockProducts[articleNumber].stats);
        } else if (config.useOnlyMockData) {
            console.log(`Товар не найден в демо-базе, использую случайные данные`);
            productInfo = getMockedProductInfo(articleNumber);
            productStats = getMockedStatsData(articleNumber);
        } else {
            // Получение информации о товаре и статистики через API
            productInfo = await getProductInfo(articleNumber);
            productStats = await getProductStats(articleNumber);
        }
        
        // Обновление дашборда
        updateDashboard(productInfo, productStats);
        
        showDashboard(true);
    } catch (error) {
        console.error('Error fetching product data:', error);
        showError('Не удалось загрузить данные о товаре');
    } finally {
        showLoader(false);
    }
}

async function getProductInfo(articleNumber) {
    try {
        // Используем прокси для обхода CORS-ограничений
        console.log(`Отправка запроса к прокси: ${PROXY_URL}?path=detail&nm=${articleNumber}`);
        const response = await fetch(`${PROXY_URL}?path=detail&nm=${articleNumber}`);
        
        if (!response.ok) {
            console.error(`API вернул статус ${response.status}`);
            throw new Error(`API вернул статус ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ответ API (полные данные):', data);
        
        // Проверяем, есть ли данные и имеют ли они ожидаемую структуру
        if (!data) {
            console.error('Пустой ответ от API');
            throw new Error('Нет данных от API');
        }
        
        let product;
        
        // В зависимости от структуры ответа API, выбираем правильный путь к данным товара
        if (data.data && data.data.products && data.data.products.length > 0) {
            // Формат v1/detail API
            product = data.data.products[0];
        } else if (data.data && data.data.product) {
            // Альтернативный формат
            product = data.data.product;
        } else if (data.products && data.products.length > 0) {
            // Еще один возможный формат
            product = data.products[0];
        } else {
            console.error('Товар не найден в ответе API:', data);
            // Включаем демо-режим, чтобы пользователь мог увидеть хоть какие-то данные
            config.useFallbackData = true;
            throw new Error('Товар не найден в ответе API');
        }
        
        console.log('Данные о товаре:', product);
        
        return {
            id: product.id || articleNumber,
            name: product.name || 'Нет данных',
            brand: product.brand || 'Нет данных',
            reviewRating: product.reviewRating || 0,
            feedbacks: product.feedbacks || 0,
            pics: product.pics || [],
            colors: product.colors || [],
            sizes: product.sizes || [],
            priceU: product.priceU || 0,
            salePriceU: product.salePriceU || 0
        };
    } catch (error) {
        console.error('Error fetching product info:', error);
        
        if (config.useFallbackData) {
            console.log('Переключение на демо-режим из-за ошибки API');
            return getMockedProductInfo(articleNumber);
        } else {
            throw error;
        }
    }
}

async function getProductStats(articleNumber) {
    try {
        // Используем прокси для обхода CORS-ограничений
        const response = await fetch(`${PROXY_URL}?path=nm-report&nm=${articleNumber}&token=${TOKEN}`);
        
        if (!response.ok) {
            throw new Error(`API вернул статус ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Product stats:', data);
        
        // Обработка данных статистики
        const statsData = {
            orders: data.orders || 0,
            ordersSumRub: data.ordersSumRub || 0,
            buyoutPercent: calculateBuyoutPercent(data.orders, data.buyouts) || 0,
            
            openCard: data.openCard || 0,
            addToCart: data.addToCart || 0,
            conversion: calculateConversion(data.openCard, data.orders) || 0,
            
            stockWbQty: data.stockWbQty || 0,
            stockMpQty: data.stockMpQty || 0,
            
            salesHistory: generateSalesHistory(data)
        };
        
        return statsData;
    } catch (error) {
        console.error('Error fetching product stats:', error);
        
        if (config.useFallbackData) {
            console.log('Переключение на демо-режим для статистики из-за ошибки API');
            return getMockedStatsData(articleNumber);
        } else {
            throw error;
        }
    }
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

// Helper function to generate sales history
function generateSalesHistory(productStats) {
    // If we have daily data from API
    if (productStats.dailyData && Array.isArray(productStats.dailyData) && productStats.dailyData.length > 0) {
        return productStats.dailyData.map(day => ({
            date: new Date(day.date).toLocaleDateString('ru-RU'),
            orderCount: day.orders || 0,
            orderSum: day.ordersSumRub || 0
        }));
    }
    
    // If no daily data, use mock data with realistic scaling based on the overall stats
    const salesHistory = [];
    const totalOrders = productStats.orders || Math.floor(Math.random() * 500) + 100;
    const totalSum = productStats.ordersSumRub || totalOrders * 2000;
    
    // Distribute the total over 14 days with some randomness
    for (let i = 14; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random distribution factor
        const factor = 0.5 + Math.random();
        const dayShare = factor / 14;
        
        const orderCount = Math.max(1, Math.floor(totalOrders * dayShare));
        const orderSum = Math.max(100, Math.floor(totalSum * dayShare));
        
        salesHistory.push({
            date: date.toLocaleDateString('ru-RU'),
            orderCount: orderCount,
            orderSum: orderSum
        });
    }
    
    return salesHistory;
}

// Helper function to calculate buyout percent
function calculateBuyoutPercent(orders, buyoutCount) {
    if (!orders || orders === 0) return 0;
    return Math.round((buyoutCount / orders) * 100);
}

// Helper function to calculate conversion
function calculateConversion(openCard, orders) {
    if (!openCard || openCard === 0) return 0;
    return Math.round((orders / openCard) * 100);
}

// Форматирование данных о товаре из наших демо-данных
function formatMockProductInfo(mockProduct) {
    return {
        imt_id: mockProduct.id,
        nm_id: mockProduct.id,
        name: mockProduct.name,
        brand: mockProduct.brand,
        priceU: mockProduct.priceU,
        salePriceU: mockProduct.salePriceU,
        reviewRating: mockProduct.reviewRating,
        feedbacks: mockProduct.feedbacks,
        pics: mockProduct.pics,
        colors: [{name: "Стандартный"}]
    };
}

// Форматирование статистики из наших демо-данных
function formatMockProductStats(statsData) {
    // Генерируем историю продаж на основе данных dailyData
    const salesHistory = statsData.dailyData.length > 0 
        ? statsData.dailyData.map(day => ({
            date: new Date(day.date).toLocaleDateString('ru-RU'),
            orderCount: day.orders || 0,
            orderSum: day.ordersSumRub || 0
        }))
        : generateSalesHistoryFromTotals(statsData);
    
    return {
        openCard: statsData.openCard || 0,
        addToCart: statsData.addToCart || 0,
        orders: statsData.orders || 0,
        ordersSumRub: statsData.ordersSumRub || 0,
        buyoutCount: statsData.buyoutCount || 0,
        buyoutPercent: calculateBuyoutPercent(statsData.orders, statsData.buyoutCount),
        conversion: calculateConversion(statsData.openCard, statsData.orders),
        stockWbQty: statsData.stockWbQty || 0,
        stockMpQty: statsData.stockMpQty || 0,
        salesHistory: salesHistory
    };
}

// Генерация истории продаж на основе суммарных показателей
function generateSalesHistoryFromTotals(statsData) {
    const salesHistory = [];
    const totalOrders = statsData.orders || Math.floor(Math.random() * 500) + 100;
    const totalSum = statsData.ordersSumRub || totalOrders * 2000;
    
    // Distribute the total over 14 days with some randomness
    for (let i = 14; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random distribution factor
        const factor = 0.5 + Math.random();
        const dayShare = factor / 14;
        
        const orderCount = Math.max(1, Math.floor(totalOrders * dayShare));
        const orderSum = Math.max(100, Math.floor(totalSum * dayShare));
        
        salesHistory.push({
            date: date.toLocaleDateString('ru-RU'),
            orderCount: orderCount,
            orderSum: orderSum
        });
    }
    
    return salesHistory;
}

// Mock Data (for demo purposes)
function getMockedProductInfo(articleNumber) {
    return {
        id: parseInt(articleNumber),
        name: 'Демонстрационный товар Wildberries',
        brand: 'Demo Brand',
        priceU: 299900,
        salePriceU: 199900,
        reviewRating: 4.7,
        feedbacks: 128,
        pics: [1, 2, 3]
    };
}

function getMockedStatsData(articleNumber) {
    // Generate random sales history for the last 14 days
    const salesHistory = [];
    for (let i = 14; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const orderCount = Math.floor(Math.random() * 50) + 10;
        const orderSum = orderCount * (Math.floor(Math.random() * 1000) + 1000);
        
        salesHistory.push({
            date: date.toLocaleDateString('ru-RU'),
            orderCount: orderCount,
            orderSum: orderSum
        });
    }
    
    // Funnel stats
    const openCard = Math.floor(Math.random() * 5000) + 2000;
    const addToCart = Math.floor(openCard * (Math.random() * 0.3 + 0.1));
    const orders = Math.floor(addToCart * (Math.random() * 0.5 + 0.3));
    const buyoutCount = Math.floor(orders * (Math.random() * 0.3 + 0.6));
    
    return {
        openCard: openCard,
        addToCart: addToCart,
        orders: orders,
        ordersSumRub: salesHistory.reduce((sum, item) => sum + item.orderSum, 0),
        buyoutCount: buyoutCount,
        buyoutPercent: Math.round((buyoutCount / orders) * 100),
        conversion: Math.round((orders / openCard) * 100),
        stockWbQty: Math.floor(Math.random() * 500) + 100,
        stockMpQty: Math.floor(Math.random() * 300) + 50,
        salesHistory: salesHistory
    };
}
