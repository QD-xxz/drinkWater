// Enhanced Service Worker for PWA with Background Push
const CACHE_NAME = 'drink-water-helper-v2';
const urlsToCache = [
    './',
    './index.html',
    './hydrate.html',
    './modern.html',
    './app.js',
    './manifest.json'
];

// 存储提醒设置
let reminderSettings = {
    isActive: false,
    interval: 60, // 分钟
    lastReminder: null
};

// 安装事件
self.addEventListener('install', (event) => {
    console.log('Service Worker 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('缓存已打开');
                // 只缓存本地文件，避免外部资源缓存问题
                return cache.addAll(urlsToCache.filter(url => !url.startsWith('http')));
            })
            .then(() => {
                console.log('Service Worker 安装完成');
                self.skipWaiting(); // 立即激活新的 Service Worker
            })
            .catch(error => {
                console.log('缓存失败:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', (event) => {
    console.log('Service Worker 激活中...');
    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 立即控制所有客户端
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker 激活完成');
            // 启动后台提醒检查
            startBackgroundReminder();
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
    // 只处理同源请求，避免chrome-extension等协议的问题
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // 如果缓存中有，直接返回
                    if (response) {
                        return response;
                    }

                    // 否则从网络获取
                    return fetch(event.request).then((response) => {
                        // 检查是否是有效响应
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(error => {
                                console.log('缓存失败:', error);
                            });

                        return response;
                    });
                })
                .catch(error => {
                    console.log('请求失败:', error);
                    return new Response('离线模式', { status: 503 });
                })
        );
    }
});

// 处理推送通知
self.addEventListener('push', (event) => {
    const options = {
        body: '💕 亲爱的，该喝水啦！',
        icon: 'icons/icon-192x192.png',
        badge: 'icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'drink',
                title: '已喝水 💧',
                icon: 'icons/icon-72x72.png'
            },
            {
                action: 'snooze',
                title: '稍后提醒 ⏰',
                icon: 'icons/icon-72x72.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('喝水提醒', options)
    );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'drink') {
        // 用户已喝水，可以记录或发送反馈
        console.log('用户已喝水');
    } else if (event.action === 'snooze') {
        // 稍后提醒，可以设置延迟
        console.log('用户选择稍后提醒');
    } else {
        // 点击通知本身，打开应用
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 后台同步和提醒功能
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    } else if (event.tag === 'reminder-sync') {
        event.waitUntil(checkAndSendReminder());
    }
});

// 消息监听 - 接收来自主线程的设置更新
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'UPDATE_REMINDER_SETTINGS':
            reminderSettings = { ...reminderSettings, ...data };
            console.log('提醒设置已更新:', reminderSettings);
            if (reminderSettings.isActive) {
                startBackgroundReminder();
            } else {
                stopBackgroundReminder();
            }
            break;

        case 'GET_REMINDER_SETTINGS':
            event.ports[0].postMessage(reminderSettings);
            break;
    }
});

// 后台提醒管理
let reminderTimer = null;

function startBackgroundReminder() {
    if (!reminderSettings.isActive) return;

    console.log('启动后台提醒，间隔:', reminderSettings.interval, '分钟');

    // 清除现有定时器
    if (reminderTimer) {
        clearInterval(reminderTimer);
    }

    // 设置新的定时器
    reminderTimer = setInterval(() => {
        checkAndSendReminder();
    }, reminderSettings.interval * 60 * 1000);

    // 立即检查一次
    checkAndSendReminder();
}

function stopBackgroundReminder() {
    console.log('停止后台提醒');
    if (reminderTimer) {
        clearInterval(reminderTimer);
        reminderTimer = null;
    }
}

function checkAndSendReminder() {
    if (!reminderSettings.isActive) return Promise.resolve();

    const now = Date.now();
    const lastReminder = reminderSettings.lastReminder || 0;
    const intervalMs = reminderSettings.interval * 60 * 1000;

    // 检查是否到了提醒时间
    if (now - lastReminder >= intervalMs) {
        reminderSettings.lastReminder = now;
        return sendReminderNotification();
    }

    return Promise.resolve();
}

function sendReminderNotification() {
    const messages = [
        '💕 亲爱的，该喝水啦！',
        '💧 记得补充水分哦～',
        '🥰 喝口水，保持美丽！',
        '💖 爱你，所以提醒你喝水',
        '🌸 水润肌肤从现在开始',
        '💝 健康的你最美丽',
        '⚡ AquaFlow 提醒：补充能量！',
        '🚀 保持水分，保持活力！'
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const options = {
        body: randomMessage,
        icon: './icons/icon-192x192.svg',
        badge: './favicon.svg',
        tag: 'water-reminder',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: {
            timestamp: Date.now(),
            url: './'
        },
        actions: [
            {
                action: 'drink',
                title: '已喝水 💧',
                icon: './favicon.svg'
            },
            {
                action: 'snooze',
                title: '稍后提醒 ⏰',
                icon: './favicon.svg'
            }
        ]
    };

    return self.registration.showNotification('AquaFlow 喝水提醒', options);
}

function doBackgroundSync() {
    // 在这里可以执行后台同步任务
    // 比如同步用户的喝水记录到服务器
    console.log('执行后台同步');
    return Promise.resolve();
}
