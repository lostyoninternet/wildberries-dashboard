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
        // Получаем информацию о товаре через карточки
        const response = await fetch(`${PROXY_URL}?path=content/v1/cards/filter&token=${TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sort: {
                    cursor: {
                        limit: 1
                    }
                },
                filter: {
                    nmID: articleNumber
                },
                params: {
                    supplierID: "",
                    withError: false
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data || !data.data || !data.data.cards || data.data.cards.length === 0) {
            throw new Error('Товар не найден');
        }

        return data.data.cards[0];
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
    productInfo.innerHTML = `
        <h2>Информация о товаре</h2>
        <div class="product-details">
            <p><strong>Артикул:</strong> ${data.nmID}</p>
            <p><strong>Название:</strong> ${data.title || data.subjectName || 'Нет данных'}</p>
            <p><strong>Бренд:</strong> ${data.brand || 'Нет данных'}</p>
            <p><strong>Цена:</strong> ${data.price || 0} ₽</p>
            <p><strong>Скидка:</strong> ${data.discount || 0}%</p>
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
