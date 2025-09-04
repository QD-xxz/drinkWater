// Hydrate - 现代化喝水提醒应用
class HydrateApp {
    constructor() {
        this.reminderInterval = null;
        this.countdownInterval = null; // 倒计时定时器
        this.selectedMinutes = 60; // 默认1小时
        this.isActive = false;
        this.nextReminderTime = null;
        this.dailyWater = 0; // 今日喝水量(ml)
        this.dailyGoal = 2000; // 每日目标(ml)
        this.waterCount = 0; // 喝水次数
        this.notificationSound = 'water'; // 通知音效
        this.theme = 'cyber'; // 主题

        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadSettings();
        this.updateProgressRing();
        this.updateWaterDisplay();
        this.registerServiceWorker();
        this.requestNotificationPermission();
    }
    
    bindEvents() {
        // 时间按钮事件
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTimeInterval(e.target);
            });
        });
        
        // 开始/停止按钮事件
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startReminder();
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopReminder();
        });
        
        // 页面可见性变化事件
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isActive) {
                this.updateNextReminderDisplay();
            }
        });
    }
    
    selectTimeInterval(button) {
        // 移除其他按钮的active类
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
            btn.classList.add('border-gray-200', 'bg-white');
        });

        // 添加active类到当前按钮
        button.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
        button.classList.remove('border-gray-200', 'bg-white');

        // 保存选择的时间间隔
        this.selectedMinutes = parseInt(button.dataset.minutes);
        this.saveSettings();

        // 如果正在运行，重新启动以应用新的间隔
        if (this.isActive) {
            this.stopReminder();
            setTimeout(() => this.startReminder(), 100);
        }
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert('请允许通知权限，以便接收喝水提醒！');
                }
            }
        } else {
            console.warn('此浏览器不支持通知功能');
        }
    }
    
    async startReminder() {
        if (Notification.permission !== 'granted') {
            alert('请先允许通知权限！');
            await this.requestNotificationPermission();
            if (Notification.permission !== 'granted') {
                return;
            }
        }

        this.isActive = true;
        this.setNextReminderTime();

        // 前台定时器（当页面活跃时）
        this.reminderInterval = setInterval(() => {
            this.showNotification();
            this.setNextReminderTime();
        }, this.selectedMinutes * 60 * 1000);

        // 通知Service Worker启动后台提醒
        await this.updateServiceWorkerSettings();

        // 更新UI
        this.updateUI();
        this.saveSettings();

        console.log('提醒已启动，间隔:', this.selectedMinutes, '分钟');
    }
    
    async stopReminder() {
        this.isActive = false;

        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // 通知Service Worker停止后台提醒
        await this.updateServiceWorkerSettings();

        this.nextReminderTime = null;
        this.updateUI();
        this.saveSettings();

        console.log('提醒已停止');
    }
    
    setNextReminderTime() {
        this.nextReminderTime = new Date(Date.now() + this.selectedMinutes * 60 * 1000);
        this.updateNextReminderDisplay();
        this.startCountdown();
    }
    
    updateNextReminderDisplay() {
        const nextTimeElement = document.getElementById('nextTime');
        const nextReminderElement = document.getElementById('nextReminder');
        
        if (this.isActive && this.nextReminderTime) {
            const timeString = this.nextReminderTime.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            nextTimeElement.textContent = timeString;
            nextReminderElement.classList.remove('hidden');
        } else {
            nextReminderElement.classList.add('hidden');
        }
    }
    
    showNotification() {
        const messages = [
            '💕 亲爱的，该喝水啦！',
            '💧 记得补充水分哦～',
            '🥰 喝口水，保持美丽！',
            '💖 爱你，所以提醒你喝水',
            '🌸 水润肌肤从现在开始',
            '💝 健康的你最美丽'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('喝水提醒', {
                body: randomMessage,
                icon: 'icons/icon-192x192.png',
                badge: 'icons/icon-72x72.png',
                tag: 'drink-water-reminder',
                requireInteraction: true,
                actions: [
                    {
                        action: 'drink',
                        title: '已喝水 💧'
                    },
                    {
                        action: 'snooze',
                        title: '稍后提醒 ⏰'
                    }
                ]
            });
            
            // 自动关闭通知
            setTimeout(() => {
                notification.close();
            }, 10000);
            
            // 点击通知时的处理
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
        
        // 如果支持振动，添加振动提醒
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }
    
    updateUI() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const reminderStatus = document.getElementById('reminderStatus');

        if (this.isActive) {
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            reminderStatus.className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700';
            reminderStatus.textContent = '在线';
        } else {
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            reminderStatus.className = 'px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600';
            reminderStatus.textContent = '离线';
        }
    }

    // 新增：更新进度环
    updateProgressRing() {
        const circle = document.getElementById('progressCircle');
        const liquidProgress = document.getElementById('liquidProgress');

        if (circle) {
            const radius = 45; // 更新为modern.html中的半径
            const circumference = 2 * Math.PI * radius;
            const progress = Math.min(this.dailyWater / this.dailyGoal, 1);
            const offset = circumference - (progress * circumference);

            circle.style.strokeDashoffset = offset;
        }

        if (liquidProgress) {
            const progress = Math.min((this.dailyWater / this.dailyGoal) * 100, 100);
            liquidProgress.style.width = progress + '%';
        }
    }

    // 新增：更新水量显示
    updateWaterDisplay() {
        document.getElementById('waterCount').textContent = this.waterCount;
        document.getElementById('todayWater').textContent = this.dailyWater;
        this.updateProgressRing();
    }

    // 新增：添加水量记录
    addWater(amount) {
        this.dailyWater += amount;
        this.waterCount++;
        this.updateWaterDisplay();
        this.saveSettings();

        // 添加成功反馈
        this.showSuccessToast(`已记录 ${amount}ml 💧`);
    }

    // 新增：显示成功提示
    showSuccessToast(message) {
        // 创建临时提示元素
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-50 transition-all duration-300';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 动画显示
        setTimeout(() => toast.classList.add('opacity-100'), 100);

        // 3秒后移除
        setTimeout(() => {
            toast.classList.add('opacity-0', 'transform', 'scale-95');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    
    saveSettings() {
        const settings = {
            selectedMinutes: this.selectedMinutes,
            isActive: this.isActive,
            nextReminderTime: this.nextReminderTime,
            dailyWater: this.dailyWater,
            waterCount: this.waterCount,
            dailyGoal: this.dailyGoal,
            notificationSound: this.notificationSound,
            theme: this.theme,
            lastSaveDate: new Date().toDateString()
        };
        localStorage.setItem('hydrateSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('hydrateSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            const today = new Date().toDateString();

            // 如果是新的一天，重置水量记录
            if (settings.lastSaveDate !== today) {
                this.dailyWater = 0;
                this.waterCount = 0;
            } else {
                this.dailyWater = settings.dailyWater || 0;
                this.waterCount = settings.waterCount || 0;
            }

            this.selectedMinutes = settings.selectedMinutes || 60;
            this.dailyGoal = settings.dailyGoal || 2000;
            this.notificationSound = settings.notificationSound || 'water';
            this.theme = settings.theme || 'cyber';

            // 恢复时间按钮选择
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
                btn.classList.add('border-gray-200', 'bg-white');
                if (parseInt(btn.dataset.minutes) === this.selectedMinutes) {
                    btn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
                    btn.classList.remove('border-gray-200', 'bg-white');
                }
            });

            // 如果之前是激活状态，恢复提醒
            if (settings.isActive) {
                this.startReminder();
            }
        }

        this.updateUI();
        this.updateWaterDisplay();
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker 注册成功:', registration);

                // 等待Service Worker激活
                if (registration.installing) {
                    await new Promise(resolve => {
                        registration.installing.addEventListener('statechange', () => {
                            if (registration.installing.state === 'activated') {
                                resolve();
                            }
                        });
                    });
                }

                // 监听Service Worker消息
                navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

                // 同步当前设置到Service Worker
                await this.updateServiceWorkerSettings();

            } catch (error) {
                console.log('Service Worker 注册失败:', error);
            }
        }
    }

    // 新增：处理Service Worker消息
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        console.log('收到Service Worker消息:', type, data);

        switch (type) {
            case 'REMINDER_TRIGGERED':
                // 可以在这里添加额外的UI反馈
                break;
        }
    }

    // 新增：更新Service Worker设置
    async updateServiceWorkerSettings() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const settings = {
                isActive: this.isActive,
                interval: this.selectedMinutes,
                lastReminder: Date.now()
            };

            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_REMINDER_SETTINGS',
                data: settings
            });

            console.log('已同步设置到Service Worker:', settings);
        }
    }

    // 倒计时功能
    startCountdown() {
        // 清除之前的倒计时
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        const totalSeconds = this.selectedMinutes * 60;

        this.countdownInterval = setInterval(() => {
            if (!this.isActive || !this.nextReminderTime) {
                this.stopCountdown();
                return;
            }

            const now = new Date().getTime();
            const targetTime = this.nextReminderTime.getTime();
            const remainingTime = targetTime - now;

            if (remainingTime <= 0) {
                this.stopCountdown();
                return;
            }

            const remainingSeconds = Math.floor(remainingTime / 1000);
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;

            // 更新倒计时显示
            this.updateCountdownDisplay(minutes, seconds);

            // 更新进度条
            const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
            this.updateCountdownProgress(progress);

        }, 1000);
    }

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // 隐藏倒计时显示
        const countdownDisplay = document.getElementById('countdownDisplay');
        if (countdownDisplay) {
            countdownDisplay.style.display = 'none';
        }
    }

    updateCountdownDisplay(minutes, seconds) {
        const minutesElement = document.getElementById('countdownMinutes');
        const secondsElement = document.getElementById('countdownSeconds');
        const countdownDisplay = document.getElementById('countdownDisplay');

        if (minutesElement && secondsElement && countdownDisplay) {
            // 显示倒计时
            countdownDisplay.style.display = 'block';

            // 格式化数字显示
            const formattedMinutes = minutes.toString().padStart(2, '0');
            const formattedSeconds = seconds.toString().padStart(2, '0');

            // 添加数字翻转动画
            if (minutesElement.textContent !== formattedMinutes) {
                minutesElement.style.animation = 'digit-flip 0.3s ease-in-out';
                setTimeout(() => {
                    minutesElement.textContent = formattedMinutes;
                    minutesElement.style.animation = '';
                }, 150);
            }

            if (secondsElement.textContent !== formattedSeconds) {
                secondsElement.style.animation = 'digit-flip 0.3s ease-in-out';
                setTimeout(() => {
                    secondsElement.textContent = formattedSeconds;
                    secondsElement.style.animation = '';
                }, 150);
            }

            // 最后10秒时添加紧急效果
            if (minutes === 0 && seconds <= 10) {
                countdownDisplay.style.animation = 'countdown-pulse 0.5s ease-in-out infinite';
                minutesElement.style.color = '#ef4444';
                secondsElement.style.color = '#ef4444';
            } else {
                countdownDisplay.style.animation = '';
                minutesElement.style.color = '#06b6d4';
                secondsElement.style.color = '#06b6d4';
            }
        }
    }

    updateCountdownProgress(progress) {
        const progressElement = document.getElementById('countdownProgress');
        if (progressElement) {
            progressElement.style.width = `${Math.max(0, 100 - progress)}%`;

            // 根据剩余时间改变颜色
            if (progress > 90) {
                progressElement.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
            } else if (progress > 75) {
                progressElement.style.background = 'linear-gradient(to right, #f59e0b, #d97706)';
            } else {
                progressElement.style.background = 'linear-gradient(to right, #06b6d4, #6366f1)';
            }
        }
    }
}

// 全局函数：添加水量记录
function addWater(amount) {
    if (window.hydrateApp) {
        window.hydrateApp.addWater(amount);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.hydrateApp = new HydrateApp();
});

// PWA安装提示
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // 可以在这里显示自定义的安装提示
    console.log('PWA可以安装');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA已安装');
    deferredPrompt = null;
});
