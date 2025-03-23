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

        // API ключ нужен для всех запросов
        queryParams.set('key', apiKeyManager.check());
        
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
        const response = await this.request('content/cards', {
            nm: articleNumber
        });
        
        if (!response.data || !response.data.cards || response.data.cards.length === 0) {
            throw new Error('Товар не найден');
        }
        
        const card = response.data.cards[0];
        return {
            nmId: card.nmId,
            name: card.title || card.name,
            brand: card.brand,
            category: card.subject,
            price: card.price,
            discount: card.discount || 0
        };
    },
    
    // Получение статистики продаж
    async getSalesStats(articleNumber) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - API_CONFIG.defaultDateRange);
        
        const [salesResponse, detailResponse, stocksResponse] = await Promise.all([
            // Общая статистика продаж
            this.request('statistics/sales', {
                nm: articleNumber,
                dateFrom: startDate.toISOString().split('T')[0],
                dateTo: endDate.toISOString().split('T')[0]
            }),
            // Детальная статистика
            this.request('statistics/sales/detail', {
                nm: articleNumber,
                dateFrom: startDate.toISOString().split('T')[0],
                dateTo: endDate.toISOString().split('T')[0]
            }),
            // Информация об остатках
            this.request('statistics/stocks', {
                dateFrom: startDate.toISOString().split('T')[0]
            })
        ]);

        // Обработка статистики продаж
        const sales = salesResponse.data || [];
        const details = detailResponse.data || [];
        const stocks = stocksResponse.data || [];

        // Фильтруем остатки по артикулу
        const productStocks = stocks.filter(item => item.nmId === articleNumber);
        
        return {
            totalSales: sales.reduce((sum, item) => sum + (item.quantity || 0), 0),
            currentStock: productStocks.length > 0 ? productStocks[0].quantity : 0,
            history: details.map(item => ({
                date: item.date,
                sales: item.quantity || 0,
                revenue: item.priceWithDisc || 0,
                stock: item.quantity || 0
            }))
        };
    }
};

// Управление графиками
const chartManager = {
    salesChart: null,
    
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
            <p><strong>Цена:</strong> ${formatters.currency.format(data.price)}</p>
            <p><strong>Скидка:</strong> ${data.discount}%</p>
        `;
    },
    
    updateProductStats(data) {
        this.elements.productStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${formatters.number.format(data.totalSales)}</div>
                <div>Всего продаж</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatters.number.format(data.currentStock)}</div>
                <div>Остаток</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatters.currency.format(data.totalRevenue)}</div>
                <div>Общая выручка</div>
            </div>
        `;
    },
    
    updateSalesHistory(data) {
        this.elements.salesHistoryTable.innerHTML = data.map(item => `
            <tr>
                <td>${formatters.date.format(new Date(item.date))}</td>
                <td>${formatters.number.format(item.sales)}</td>
                <td>${formatters.currency.format(item.revenue)}</td>
                <td>${formatters.number.format(item.stock)}</td>
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
            
            // Получаем данные о товаре и статистику
            const [productData, salesData] = await Promise.all([
                apiClient.getProduct(articleNumber),
                apiClient.getSalesStats(articleNumber)
            ]);
            
            // Обновляем UI
            uiManager.showProductSection();
            uiManager.updateProductInfo(productData);
            uiManager.updateProductStats({
                totalSales: salesData.totalSales,
                currentStock: salesData.currentStock,
                totalRevenue: salesData.history.reduce((sum, item) => sum + item.revenue, 0)
            });
            
            // Обновляем график продаж
            chartManager.createSalesChart({
                dates: salesData.history.map(item => formatters.date.format(new Date(item.date))),
                sales: salesData.history.map(item => item.sales)
            });
            
            // Обновляем таблицу истории
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
