// Набор данных реальных товаров для демонстрации
const mockProducts = {
    // Смартфон
    "158313347": {
        id: 158313347,
        name: "Смартфон Apple iPhone 13 128GB",
        brand: "Apple",
        priceU: 5999000,
        salePriceU: 5199000,
        reviewRating: 4.9,
        feedbacks: 3724,
        pics: [1, 2, 3, 4, 5],
        stats: {
            openCard: 52485,
            addToCart: 8762,
            orders: 3845,
            ordersSumRub: 199865300,
            buyoutCount: 3724,
            stockWbQty: 758,
            stockMpQty: 345,
            dailyData: [
                { date: "2025-03-05", orders: 140, ordersSumRub: 7280000 },
                { date: "2025-03-06", orders: 135, ordersSumRub: 7020000 },
                { date: "2025-03-07", orders: 156, ordersSumRub: 8112000 },
                { date: "2025-03-08", orders: 172, ordersSumRub: 8944000 },
                { date: "2025-03-09", orders: 128, ordersSumRub: 6656000 },
                { date: "2025-03-10", orders: 145, ordersSumRub: 7540000 },
                { date: "2025-03-11", orders: 132, ordersSumRub: 6864000 },
                { date: "2025-03-12", orders: 139, ordersSumRub: 7228000 },
                { date: "2025-03-13", orders: 147, ordersSumRub: 7644000 },
                { date: "2025-03-14", orders: 158, ordersSumRub: 8216000 },
                { date: "2025-03-15", orders: 165, ordersSumRub: 8580000 },
                { date: "2025-03-16", orders: 142, ordersSumRub: 7384000 },
                { date: "2025-03-17", orders: 136, ordersSumRub: 7072000 },
                { date: "2025-03-18", orders: 151, ordersSumRub: 7852000 },
                { date: "2025-03-19", orders: 144, ordersSumRub: 7488000 }
            ]
        }
    },
    
    // Ноутбук
    "93636435": {
        id: 93636435,
        name: "Ноутбук HUAWEI MateBook D 16 RLEF-X",
        brand: "HUAWEI",
        priceU: 7999900,
        salePriceU: 5499900,
        reviewRating: 4.8,
        feedbacks: 1578,
        pics: [1, 2, 3, 4],
        stats: {
            openCard: 34250,
            addToCart: 5840,
            orders: 1640,
            ordersSumRub: 90198360,
            buyoutCount: 1578,
            stockWbQty: 324,
            stockMpQty: 186,
            dailyData: [
                { date: "2025-03-05", orders: 52, ordersSumRub: 2859948 },
                { date: "2025-03-06", orders: 59, ordersSumRub: 3244941 },
                { date: "2025-03-07", orders: 64, ordersSumRub: 3519936 },
                { date: "2025-03-08", orders: 72, ordersSumRub: 3959928 },
                { date: "2025-03-09", orders: 68, ordersSumRub: 3739932 },
                { date: "2025-03-10", orders: 54, ordersSumRub: 2969946 },
                { date: "2025-03-11", orders: 58, ordersSumRub: 3189942 },
                { date: "2025-03-12", orders: 63, ordersSumRub: 3464937 },
                { date: "2025-03-13", orders: 69, ordersSumRub: 3794931 },
                { date: "2025-03-14", orders: 74, ordersSumRub: 4069926 },
                { date: "2025-03-15", orders: 83, ordersSumRub: 4564917 },
                { date: "2025-03-16", orders: 76, ordersSumRub: 4179924 },
                { date: "2025-03-17", orders: 62, ordersSumRub: 3409938 },
                { date: "2025-03-18", orders: 57, ordersSumRub: 3134943 },
                { date: "2025-03-19", orders: 61, ordersSumRub: 3354939 }
            ]
        }
    },
    
    // Кроссовки
    "48144618": {
        id: 48144618,
        name: "Кроссовки Nike Air Force 1 Low White",
        brand: "Nike",
        priceU: 1299000,
        salePriceU: 999000,
        reviewRating: 4.7,
        feedbacks: 8453,
        pics: [1, 2, 3, 4],
        stats: {
            openCard: 92750,
            addToCart: 21680,
            orders: 9520,
            ordersSumRub: 95105280,
            buyoutCount: 8453,
            stockWbQty: 2135,
            stockMpQty: 756,
            dailyData: [
                { date: "2025-03-05", orders: 324, ordersSumRub: 3236760 },
                { date: "2025-03-06", orders: 352, ordersSumRub: 3516480 },
                { date: "2025-03-07", orders: 368, ordersSumRub: 3676320 },
                { date: "2025-03-08", orders: 412, ordersSumRub: 4115880 },
                { date: "2025-03-09", orders: 387, ordersSumRub: 3866130 },
                { date: "2025-03-10", orders: 346, ordersSumRub: 3456540 },
                { date: "2025-03-11", orders: 329, ordersSumRub: 3286710 },
                { date: "2025-03-12", orders: 342, ordersSumRub: 3416580 },
                { date: "2025-03-13", orders: 358, ordersSumRub: 3576420 },
                { date: "2025-03-14", orders: 377, ordersSumRub: 3766230 },
                { date: "2025-03-15", orders: 405, ordersSumRub: 4045950 },
                { date: "2025-03-16", orders: 392, ordersSumRub: 3916080 },
                { date: "2025-03-17", orders: 362, ordersSumRub: 3616380 },
                { date: "2025-03-18", orders: 341, ordersSumRub: 3406590 },
                { date: "2025-03-19", orders: 356, ordersSumRub: 3556440 }
            ]
        }
    },
    
    // Книга
    "76529786": {
        id: 76529786,
        name: "Книга 'Атомные привычки' Джеймс Клир",
        brand: "Манн, Иванов и Фербер",
        priceU: 119900,
        salePriceU: 89900,
        reviewRating: 4.9,
        feedbacks: 7823,
        pics: [1, 2],
        stats: {
            openCard: 67250,
            addToCart: 9680,
            orders: 7980,
            ordersSumRub: 7174020,
            buyoutCount: 7823,
            stockWbQty: 1875,
            stockMpQty: 546,
            dailyData: [
                { date: "2025-03-05", orders: 276, ordersSumRub: 248124 },
                { date: "2025-03-06", orders: 294, ordersSumRub: 264306 },
                { date: "2025-03-07", orders: 312, ordersSumRub: 280488 },
                { date: "2025-03-08", orders: 328, ordersSumRub: 294872 },
                { date: "2025-03-09", orders: 297, ordersSumRub: 267003 },
                { date: "2025-03-10", orders: 285, ordersSumRub: 256215 },
                { date: "2025-03-11", orders: 272, ordersSumRub: 244528 },
                { date: "2025-03-12", orders: 281, ordersSumRub: 252579 },
                { date: "2025-03-13", orders: 302, ordersSumRub: 271498 },
                { date: "2025-03-14", orders: 321, ordersSumRub: 288579 },
                { date: "2025-03-15", orders: 343, ordersSumRub: 308357 },
                { date: "2025-03-16", orders: 326, ordersSumRub: 293074 },
                { date: "2025-03-17", orders: 287, ordersSumRub: 257993 },
                { date: "2025-03-18", orders: 275, ordersSumRub: 247225 },
                { date: "2025-03-19", orders: 293, ordersSumRub: 263407 }
            ]
        }
    },
    
    // Наушники
    "21576847": {
        id: 21576847,
        name: "Наушники Apple AirPods Pro 2",
        brand: "Apple",
        priceU: 2499000,
        salePriceU: 1999000,
        reviewRating: 4.8,
        feedbacks: 5246,
        pics: [1, 2, 3],
        stats: {
            openCard: 48250,
            addToCart: 7980,
            orders: 5520,
            ordersSumRub: 110344800,
            buyoutCount: 5246,
            stockWbQty: 835,
            stockMpQty: 412,
            dailyData: [
                { date: "2025-03-05", orders: 189, ordersSumRub: 3778110 },
                { date: "2025-03-06", orders: 201, ordersSumRub: 4017990 },
                { date: "2025-03-07", orders: 214, ordersSumRub: 4277860 },
                { date: "2025-03-08", orders: 238, ordersSumRub: 4756620 },
                { date: "2025-03-09", orders: 225, ordersSumRub: 4497750 },
                { date: "2025-03-10", orders: 196, ordersSumRub: 3918040 },
                { date: "2025-03-11", orders: 185, ordersSumRub: 3698150 },
                { date: "2025-03-12", orders: 192, ordersSumRub: 3838080 },
                { date: "2025-03-13", orders: 203, ordersSumRub: 4057970 },
                { date: "2025-03-14", orders: 221, ordersSumRub: 4417790 },
                { date: "2025-03-15", orders: 236, ordersSumRub: 4717640 },
                { date: "2025-03-16", orders: 227, ordersSumRub: 4537730 },
                { date: "2025-03-17", orders: 198, ordersSumRub: 3958020 },
                { date: "2025-03-18", orders: 187, ordersSumRub: 3738130 },
                { date: "2025-03-19", orders: 204, ordersSumRub: 4077960 }
            ]
        }
    },
    
    // Пример нового товара
    "88888888": {
        id: 88888888,
        name: "Новый товар с малым количеством данных",
        brand: "Тестовый бренд",
        priceU: 199900,
        salePriceU: 149900,
        reviewRating: 0,
        feedbacks: 0,
        pics: [1],
        stats: {
            openCard: 350,
            addToCart: 42,
            orders: 15,
            ordersSumRub: 22485,
            buyoutCount: 12,
            stockWbQty: 127,
            stockMpQty: 84,
            dailyData: []
        }
    }
};

// Экспорт данных
window.mockProducts = mockProducts;
