// Конфигурация
const API_CONFIG = {
    baseUrl: 'https://cloudflare-workerjs.jaba-valerievna.workers.dev',
    defaultDateRange: 30 // дней
};

// Форматирование
const formatters = {
    date: new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    }),
    
    currency: new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }),
    
    number: new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })
};

// Управление API ключом
const apiKeyManager = {
    storageKey: 'wb_api_key',
    
    get: function() {
        return localStorage.getItem(this.storageKey);
    },
    
    set: function(key) {
        localStorage.setItem(this.storageKey, key);
    },
    
    check: function() {
        const key = this.get();
        if (!key) {
            throw new Error('API ключ не найден. Пожалуйста, введите ваш API ключ.');
        }
        return key;
    }
};

// API клиент
const apiClient = {
    async request(path, params = {}) {
        const queryParams = new URLSearchParams({
            ...params,
            path
        });

        // Добавляем API ключ только для запросов к API статистики
        if (path.startsWith('api/')) {
            queryParams.set('key', apiKeyManager.check());
        }
        
        const response = await fetch(`${API_CONFIG.baseUrl}?${queryParams}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data;
    },
    
    // Получение информации о товаре
    async getProduct(articleNumber) {
        const response = await this.request('wb/card', {
            nm: articleNumber
        });
        
        if (!response.data || !response.data.products || response.data.products.length === 0) {
            throw new Error('Товар не найден');
        }
        
        const product = response.data.products[0];
        return {
            nmId: product.id,
            name: product.name,
            brand: product.brand,
            category: product.subjectName,
            price: product.salePriceU / 100,
            discount: product.sale || 0
        };
    },
    
    // Получение истории цен
    async getPriceHistory(articleNumber) {
        try {
            const response = await this.request('wb/price-history', {
                nm: articleNumber
            });
            
            return {
                history: response.data || []
            };
        } catch (error) {
            console.warn('Failed to fetch price history:', error);
            return { history: [] };
        }
    },
    
    // Получение статистики продаж
    async getSalesStats(articleNumber) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - API_CONFIG.defaultDateRange);
        
        const response = await this.request('api/stats', {
            nm: articleNumber,
            dateFrom: startDate.toISOString().split('T')[0],
            dateTo: endDate.toISOString().split('T')[0]
        });
        
        return {
            totalSales: response.data.sales || 0,
            history: response.data.history || []
        };
    }
};

// Управление графиками
const chartManager = {
    priceChart: null,
    salesChart: null,
    
    createPriceChart(data) {
        const ctx = document.getElementById('price-chart').getContext('2d');
        
        if (this.priceChart) {
            this.priceChart.destroy();
        }
        
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [
                    {
                        label: 'Цена',
                        data: data.prices,
                        borderColor: '#cb11ab',
                        backgroundColor: 'rgba(203, 17, 171, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Скидка %',
                        data: data.discounts,
                        borderColor: '#2196f3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Цена (₽)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Скидка (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    },
    
    createSalesChart(data) {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        
        this.salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.dates,
                datasets: [
                    {
                        label: 'Продажи',
                        data: data.sales,
                        backgroundColor: 'rgba(203, 17, 171, 0.7)'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Количество продаж'
                        }
                    }
                }
            }
        });
    }
};

// UI менеджер
const uiManager = {
    elements: {
        apiKeyInput: document.getElementById('api-key'),
        searchForm: document.getElementById('search-form'),
        articleInput: document.getElementById('article-input'),
        searchButton: document.getElementById('search-button'),
        loader: document.getElementById('loader'),
        errorMessage: document.getElementById('error-message'),
        productSection: document.getElementById('product-section'),
        productInfo: document.getElementById('product-info'),
        productStats: document.getElementById('product-stats'),
        priceHistoryTable: document.getElementById('price-history-table').querySelector('tbody'),
        salesHistoryTable: document.getElementById('sales-history-table').querySelector('tbody')
    },
    
    showLoader() {
        this.elements.loader.style.display = 'block';
        this.elements.searchButton.disabled = true;
    },
    
    hideLoader() {
        this.elements.loader.style.display = 'none';
        this.elements.searchButton.disabled = false;
    },
    
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        this.elements.productSection.style.display = 'none';
    },
    
    hideError() {
        this.elements.errorMessage.style.display = 'none';
    },
    
    showProductSection() {
        this.elements.productSection.style.display = 'block';
    },
    
    updateProductInfo(data) {
        this.elements.productInfo.innerHTML = `
            <p><strong>Артикул:</strong> ${data.nmId}</p>
            <p><strong>Название:</strong> ${data.name}</p>
            <p><strong>Бренд:</strong> ${data.brand}</p>
            <p><strong>Категория:</strong> ${data.category}</p>
        `;
    },
    
    updateProductStats(data) {
        this.elements.productStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${formatters.currency.format(data.currentPrice)}</div>
                <div>Текущая цена</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.discount}%</div>
                <div>Скидка</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatters.number.format(data.totalSales)}</div>
                <div>Всего продаж</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatters.number.format(data.currentStock || 0)}</div>
                <div>Остаток</div>
            </div>
        `;
    },
    
    updatePriceHistory(data) {
        this.elements.priceHistoryTable.innerHTML = data.map(item => `
            <tr>
                <td>${formatters.date.format(new Date(item.dt * 1000))}</td>
                <td>${formatters.currency.format(item.price / 100)}</td>
                <td>${item.discount || 0}%</td>
                <td>${formatters.currency.format((item.price * (100 - (item.discount || 0))) / 10000)}</td>
            </tr>
        `).join('');
    },
    
    updateSalesHistory(data) {
        this.elements.salesHistoryTable.innerHTML = data.map(item => `
            <tr>
                <td>${formatters.date.format(new Date(item.date))}</td>
                <td>${formatters.number.format(item.sales)}</td>
                <td>${formatters.currency.format(item.revenue)}</td>
                <td>${formatters.number.format(item.stock || 0)}</td>
            </tr>
        `).join('');
    }
};

// Инициализация приложения
async function init() {
    // Загрузка API ключа из localStorage
    const savedApiKey = apiKeyManager.get();
    if (savedApiKey) {
        uiManager.elements.apiKeyInput.value = savedApiKey;
    }
    
    // Обработчик изменения API ключа
    uiManager.elements.apiKeyInput.addEventListener('change', (e) => {
        apiKeyManager.set(e.target.value.trim());
    });
    
    // Обработчик формы поиска
    uiManager.elements.searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const articleNumber = uiManager.elements.articleInput.value.trim();
        if (!articleNumber) {
            uiManager.showError('Введите артикул товара');
            return;
        }
        
        try {
            uiManager.hideError();
            uiManager.showLoader();
            
            // Получаем данные о товаре
            const [productData, priceHistory, salesData] = await Promise.all([
                apiClient.getProduct(articleNumber),
                apiClient.getPriceHistory(articleNumber),
                apiClient.getSalesStats(articleNumber)
            ]);
            
            // Обновляем UI
            uiManager.showProductSection();
            uiManager.updateProductInfo(productData);
            uiManager.updateProductStats({
                currentPrice: productData.price,
                discount: productData.discount,
                totalSales: salesData.totalSales,
                currentStock: 0 // У нас нет доступа к API остатков
            });
            
            // Обновляем графики
            chartManager.createPriceChart({
                dates: priceHistory.history.map(item => formatters.date.format(new Date(item.dt * 1000))),
                prices: priceHistory.history.map(item => item.price / 100),
                discounts: priceHistory.history.map(item => item.discount || 0)
            });
            
            chartManager.createSalesChart({
                dates: salesData.history.map(item => formatters.date.format(new Date(item.date))),
                sales: salesData.history.map(item => item.sales)
            });
            
            // Обновляем таблицы
            uiManager.updatePriceHistory(priceHistory.history);
            uiManager.updateSalesHistory(salesData.history);
            
        } catch (error) {
            uiManager.showError(error.message);
            console.error('Error:', error);
        } finally {
            uiManager.hideLoader();
        }
    });
}

// Запуск приложения
init();
