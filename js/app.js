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

searchButton.addEventListener('click', function() {
    searchProduct();
});

// Функция поиска товара
async function searchProduct() {
    const articleNumber = articleInput.value.trim();
    
    if (!articleNumber) {
        showError('Введите артикул товара');
        return;
    }
    
    showLoader(true);
    welcomeScreen.style.display = 'none';
    errorMessage.style.display = 'none';
    productInfo.style.display = 'none';
    
    try {
        // Получаем данные о товаре через Cloudflare Worker
        const product = await getProductInfo(articleNumber);
        
        if (product) {
            displayBasicProductInfo(product);
            productInfo.style.display = 'block';
        } else {
            showError('Товар не найден');
        }
    } catch (error) {
        console.error('Error fetching product data:', error);
        showError(error.message || 'Не удалось загрузить данные о товаре');
    } finally {
        showLoader(false);
    }
}

// Получение информации о товаре через Cloudflare Worker
async function getProductInfo(articleNumber) {
    try {
        console.log(`Получение данных о товаре по артикулу: ${articleNumber}`);
        
        const response = await fetch(`${PROXY_URL}?path=content/v1/cards/filter&token=${TOKEN}&nmID=${articleNumber}`);
        
        if (!response.ok) {
            throw new Error(`API вернул статус ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Полученные данные:', data);
        
        if (!data || !data.data || !data.data.cards || data.data.cards.length === 0) {
            return null;
        }
        
        const product = data.data.cards[0];
        
        return {
            name: product.title || product.subjectName || 'Нет данных',
            brand: product.brand || 'Нет данных',
            price: product.price || 0,
            salePrice: product.salePrice || product.price || 0,
            pic: `https://images.wbstatic.net/c516x688/new/${Math.floor(articleNumber / 10000)}0000/${articleNumber}-1.jpg`,
            id: articleNumber
        };
    } catch (error) {
        console.error('Error fetching product info:', error);
        throw error;
    }
}

// Отображение информации о товаре
function displayBasicProductInfo(product) {
    productInfo.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'basic-product-container';
    
    if (product.pic) {
        const img = document.createElement('img');
        img.src = product.pic;
        img.alt = product.name;
        img.className = 'product-image';
        container.appendChild(img);
    }
    
    const infoContainer = document.createElement('div');
    infoContainer.className = 'product-info-container';
    
    const nameElement = document.createElement('h2');
    nameElement.textContent = product.name;
    infoContainer.appendChild(nameElement);
    
    const brandElement = document.createElement('p');
    brandElement.textContent = `Бренд: ${product.brand}`;
    brandElement.className = 'product-brand';
    infoContainer.appendChild(brandElement);
    
    const priceContainer = document.createElement('div');
    priceContainer.className = 'price-container';
    
    if (product.salePrice < product.price) {
        const oldPrice = document.createElement('span');
        oldPrice.textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
        oldPrice.className = 'old-price';
        priceContainer.appendChild(oldPrice);
        
        const newPrice = document.createElement('span');
        newPrice.textContent = `${product.salePrice.toLocaleString('ru-RU')} ₽`;
        newPrice.className = 'sale-price';
        priceContainer.appendChild(newPrice);
        
        const discount = Math.round(((product.price - product.salePrice) / product.price) * 100);
        const discountBadge = document.createElement('span');
        discountBadge.textContent = `-${discount}%`;
        discountBadge.className = 'discount-badge';
        priceContainer.appendChild(discountBadge);
    } else {
        const price = document.createElement('span');
        price.textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
        price.className = 'regular-price';
        priceContainer.appendChild(price);
    }
    
    infoContainer.appendChild(priceContainer);
    
    const articleElement = document.createElement('p');
    articleElement.textContent = `Артикул: ${product.id}`;
    articleElement.className = 'product-article';
    infoContainer.appendChild(articleElement);
    
    container.appendChild(infoContainer);
    productInfo.appendChild(container);
}

// Helper Functions
function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}

function showError(message) {
    welcomeScreen.style.display = 'none';
    productInfo.style.display = 'none';
    errorMessage.style.display = 'block';
    errorText.textContent = message;
}
