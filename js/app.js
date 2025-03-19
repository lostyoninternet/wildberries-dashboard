// Constants
const API_URL = 'https://suppliers-stats.wildberries.ru';
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
        // Получаем информацию о товаре
        const response = await fetch(`${PROXY_URL}?path=api/v1/supplier/stocks&token=${TOKEN}&nmID=${articleNumber}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data || !data.stocks || data.stocks.length === 0) {
            throw new Error('Товар не найден');
        }

        return data;
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
    const stock = data.stocks[0];
    
    productInfo.innerHTML = `
        <h2>Информация о товаре</h2>
        <div class="product-details">
            <p><strong>Артикул:</strong> ${stock.nmId}</p>
            <p><strong>Название:</strong> ${stock.subject || 'Нет данных'}</p>
            <p><strong>Бренд:</strong> ${stock.brand || 'Нет данных'}</p>
            <p><strong>Остаток:</strong> ${stock.quantity || 0} шт.</p>
            <p><strong>Доступно для продажи:</strong> ${stock.quantityFull || 0} шт.</p>
        </div>
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
