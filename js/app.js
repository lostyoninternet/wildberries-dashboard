// Constants
const API_URL = 'https://suppliers-api.wildberries.ru';
const PROXY_URL = 'https://cloudflare-workerjs.jaba-valerievna.workers.dev';

// Загрузка токена
let TOKEN = localStorage.getItem('wb_api_token');

// DOM Elements
const searchForm = document.getElementById('search-form');
const articleInput = document.getElementById('article-input');
const searchButton = document.getElementById('search-button');
const loader = document.getElementById('loader');
const welcomeScreen = document.getElementById('welcome-screen');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const productInfo = document.getElementById('product-info');

// Проверяем наличие токена
if (!TOKEN) {
    TOKEN = prompt('Пожалуйста, введите ваш API токен Wildberries:');
    if (TOKEN) {
        localStorage.setItem('wb_api_token', TOKEN);
    }
}

// Event Listeners
searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    searchProduct();
});

searchButton.addEventListener('click', function(e) {
    e.preventDefault();
    searchProduct();
});

// Functions
async function searchProduct() {
    const article = articleInput.value.trim();
    if (!article) {
        showError('Введите артикул товара');
        return;
    }

    showLoader();
    try {
        const productData = await getProductInfo(article);
        showProductInfo(productData);
    } catch (error) {
        showError('Ошибка получения данных о товаре: ' + error.message);
    }
    hideLoader();
}

async function getProductInfo(articleNumber) {
    try {
        // Получаем основную информацию о товаре
        const cardResponse = await fetch(`${PROXY_URL}?path=wb/card&nm=${articleNumber}`);
        if (!cardResponse.ok) {
            throw new Error(`HTTP error! status: ${cardResponse.status}`);
        }
        const cardData = await cardResponse.json();
        console.log('Card API Response:', cardData);
        
        if (!cardData || !cardData.data || !cardData.data.products || cardData.data.products.length === 0) {
            throw new Error('Товар не найден');
        }

        // Получаем историю цен
        const historyResponse = await fetch(`${PROXY_URL}?path=wb/price-history&nm=${articleNumber}`);
        let priceHistory = [];
        if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log('History API Response:', historyData);
            if (Array.isArray(historyData)) {
                priceHistory = historyData;
            }
        }

        const product = cardData.data.products[0];
        return {
            nmID: product.id,
            title: product.name || 'Нет данных',
            brand: product.brand || 'Нет данных',
            price: product.salePriceU ? (product.salePriceU / 100) : 0,
            discount: product.sale || 0,
            priceHistory: priceHistory
        };
    } catch (error) {
        console.error('Error fetching product info:', error);
        throw error;
    }
}

function showProductInfo(data) {
    welcomeScreen.style.display = 'none';
    errorMessage.style.display = 'none';
    productInfo.style.display = 'block';

    // Форматируем данные для отображения
    let historyHtml = '';
    if (data.priceHistory && data.priceHistory.length > 0) {
        // Сортируем историю цен по дате (от новых к старым)
        const sortedHistory = [...data.priceHistory].sort((a, b) => b.dt - a.dt);
        
        historyHtml = `
            <div class="price-history">
                <h3>История цен</h3>
                <table class="price-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Цена</th>
                            <th>Скидка</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedHistory.map(item => `
                            <tr>
                                <td>${new Date(item.dt * 1000).toLocaleDateString()}</td>
                                <td>${(item.price / 100).toFixed(2)} ₽</td>
                                <td>${item.discount || 0}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        historyHtml = '<p>История цен недоступна</p>';
    }

    productInfo.innerHTML = `
        <h2>Информация о товаре</h2>
        <div class="product-details">
            <p><strong>Артикул:</strong> ${data.nmID}</p>
            <p><strong>Название:</strong> ${data.title}</p>
            <p><strong>Бренд:</strong> ${data.brand}</p>
            <p><strong>Текущая цена:</strong> ${data.price} ₽</p>
            <p><strong>Скидка:</strong> ${data.discount}%</p>
        </div>
        ${historyHtml}
    `;
}

function showError(message) {
    welcomeScreen.style.display = 'none';
    productInfo.style.display = 'none';
    errorMessage.style.display = 'block';
    errorText.textContent = message;
}

function showLoader() {
    loader.style.display = 'block';
    searchButton.disabled = true;
}

function hideLoader() {
    loader.style.display = 'none';
    searchButton.disabled = false;
}
