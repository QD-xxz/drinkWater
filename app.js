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
        this.checkNotificationPermission();
        this.bindNotificationEvents();
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
        
        // 自定义时间输入事件
        const customInput = document.getElementById('customMinutesInput');
        const setCustomBtn = document.getElementById('setCustomTimeBtn');

        if (customInput && setCustomBtn) {
            // 输入框回车事件
            customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.setCustomTime();
                }
            });

            // 设置按钮点击事件
            setCustomBtn.addEventListener('click', () => {
                this.setCustomTime();
            });

            // 输入验证
            customInput.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (value < 1) e.target.value = 1;
                if (value > 1440) e.target.value = 1440;
            });
        }

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
            btn.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
            btn.classList.add('border-gray-700', 'bg-gray-800/50', 'text-gray-300');
        });

        // 添加active类到当前按钮
        button.classList.add('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
        button.classList.remove('border-gray-700', 'bg-gray-800/50', 'text-gray-300');

        // 清空自定义输入框
        this.clearCustomInput();

        // 保存选择的时间间隔
        this.selectedMinutes = parseInt(button.dataset.minutes);
        this.saveSettings();

        // 如果正在运行，重新启动以应用新的间隔
        if (this.isActive) {
            this.restartReminder();
        }
    }

    clearCustomInput() {
        const customInput = document.getElementById('customMinutesInput');
        if (customInput) {
            customInput.value = '';
        }
    }

    setCustomTime() {
        const customInput = document.getElementById('customMinutesInput');
        if (!customInput) return;

        const minutes = parseInt(customInput.value);

        if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
            alert('请输入有效的分钟数（1-1440分钟）');
            return;
        }

        // 清除所有预设按钮的激活状态
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
            btn.classList.add('border-gray-700', 'bg-gray-800/50', 'text-gray-300');
        });

        this.selectedMinutes = minutes;
        this.saveSettings();

        // 显示成功提示
        this.showCustomTimeSuccess(minutes);

        // 如果提醒正在运行，重新启动以应用新的间隔
        if (this.isActive) {
            this.restartReminder();
        }
    }

    showCustomTimeSuccess(minutes) {
        const setBtn = document.getElementById('setCustomTimeBtn');
        if (setBtn) {
            const originalText = setBtn.innerHTML;
            setBtn.innerHTML = '<i class="fas fa-check mr-1"></i>已设置';
            setBtn.classList.add('bg-green-600');
            setBtn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-cyan-600');

            setTimeout(() => {
                setBtn.innerHTML = originalText;
                setBtn.classList.remove('bg-green-600');
                setBtn.classList.add('bg-gradient-to-r', 'from-indigo-600', 'to-cyan-600');
            }, 2000);
        }

        // 显示当前设置的时间
        console.log(`自定义提醒间隔已设置为 ${minutes} 分钟`);
    }

    restartReminder() {
        this.stopReminder();
        setTimeout(() => this.startReminder(), 100);
    }

    restoreTimeSelection() {
        // 先清除所有按钮的激活状态
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
            btn.classList.add('border-gray-700', 'bg-gray-800/50', 'text-gray-300');
        });

        // 检查是否有预设按钮匹配当前时间
        let foundPresetButton = false;
        document.querySelectorAll('.time-btn').forEach(btn => {
            if (parseInt(btn.dataset.minutes) === this.selectedMinutes) {
                btn.classList.add('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
                btn.classList.remove('border-gray-700', 'bg-gray-800/50', 'text-gray-300');
                foundPresetButton = true;
            }
        });

        // 如果没有找到预设按钮，说明是自定义时间，显示在输入框中
        if (!foundPresetButton) {
            const customInput = document.getElementById('customMinutesInput');
            if (customInput) {
                customInput.value = this.selectedMinutes;
            }
        }
    }
    
    checkNotificationPermission() {
        if ('Notification' in window) {
            this.updateNotificationStatus();

            // 如果是第一次访问且权限为default，显示权限请求弹窗
            const hasShownModal = localStorage.getItem('notificationModalShown');
            if (Notification.permission === 'default' && !hasShownModal) {
                setTimeout(() => {
                    this.showNotificationModal();
                }, 2000); // 延迟2秒显示，让用户先熟悉界面
            }
        } else {
            console.warn('此浏览器不支持通知功能');
        }
    }

    showNotificationModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideNotificationModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        localStorage.setItem('notificationModalShown', 'true');
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            try {
                // 检测iOS设备
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

                if (isIOS) {
                    // iOS设备特殊处理
                    console.log('检测到iOS设备，使用iOS兼容的权限请求');
                }

                const permission = await Notification.requestPermission();
                this.updateNotificationStatus();

                if (permission === 'granted') {
                    // 延迟一下再显示测试通知，确保权限已生效
                    setTimeout(() => {
                        this.showTestNotification();
                    }, 500);
                    return true;
                } else if (permission === 'denied') {
                    const message = isIOS
                        ? '通知权限被拒绝。请在iPhone设置 > Safari > 网站设置中开启通知权限。'
                        : '通知权限被拒绝，您将无法收到喝水提醒。\n您可以在浏览器设置中手动开启通知权限。';
                    alert(message);
                    return false;
                } else {
                    // permission === 'default'
                    console.log('用户未做选择，权限状态为default');
                    return false;
                }
            } catch (error) {
                console.error('请求通知权限失败:', error);
                // iOS Safari可能不支持Promise形式，尝试回调形式
                if (typeof Notification.requestPermission === 'function') {
                    try {
                        Notification.requestPermission((permission) => {
                            this.updateNotificationStatus();
                            if (permission === 'granted') {
                                setTimeout(() => {
                                    this.showTestNotification();
                                }, 500);
                            }
                        });
                    } catch (callbackError) {
                        console.error('回调形式权限请求也失败:', callbackError);
                    }
                }
                return false;
            }
        } else {
            alert('您的浏览器不支持通知功能。建议使用Chrome、Firefox或Safari浏览器。');
            return false;
        }
    }

    updateNotificationStatus() {
        const statusElement = document.getElementById('notificationStatus');
        if (statusElement && 'Notification' in window) {
            const permission = Notification.permission;
            let statusText = '';
            let statusClass = '';

            switch (permission) {
                case 'granted':
                    statusText = '✅ 通知权限已开启';
                    statusClass = 'text-green-400';
                    break;
                case 'denied':
                    statusText = '❌ 通知权限被拒绝';
                    statusClass = 'text-red-400';
                    break;
                case 'default':
                    statusText = '⚠️ 尚未设置通知权限';
                    statusClass = 'text-yellow-400';
                    break;
            }

            statusElement.textContent = statusText;
            statusElement.className = `text-xs text-center font-mono ${statusClass}`;
        }
    }

    showTestNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

                const testNotification = new Notification('🧪 测试通知', {
                    body: '🎉 太棒了！通知功能正常工作，您将收到及时的喝水提醒！',
                    icon: './icons/icon-192x192.png',
                    tag: 'test-notification',
                    requireInteraction: !isIOS, // iOS不支持requireInteraction
                    timestamp: Date.now()
                });

                testNotification.onclick = () => {
                    window.focus();
                    testNotification.close();
                };

                // 自动关闭测试通知
                setTimeout(() => {
                    testNotification.close();
                }, 5000);

            } catch (error) {
                console.error('测试通知失败:', error);
                alert('测试通知失败，但这不影响正常的提醒功能。');
            }
        } else {
            alert('请先开启通知权限！');
        }
    }
    
    async startReminder() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            this.showNotificationModal();
            return;
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

        // 检查是否支持通知
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                // 创建通知配置
                const notificationOptions = {
                    body: randomMessage,
                    icon: './icons/icon-192x192.png',
                    badge: './icons/icon-72x72.png',
                    tag: 'drink-water-reminder',
                    renotify: true,
                    requireInteraction: true,
                    silent: false,
                    timestamp: Date.now(),
                    data: {
                        url: window.location.href,
                        timestamp: Date.now()
                    }
                };

                // iOS Safari 特殊处理
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOS) {
                    // iOS 不支持 actions，移除它们
                    delete notificationOptions.actions;
                    delete notificationOptions.badge;
                    // iOS 需要更简单的配置
                    notificationOptions.requireInteraction = false;
                } else {
                    // 非iOS设备添加操作按钮
                    notificationOptions.actions = [
                        {
                            action: 'drink',
                            title: '已喝水 💧'
                        },
                        {
                            action: 'snooze',
                            title: '稍后提醒 ⏰'
                        }
                    ];
                }

                const notification = new Notification('💧 喝水提醒', notificationOptions);

                // 通知事件处理
                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();
                    notification.close();
                    // 记录用户点击
                    console.log('用户点击了通知');
                };

                notification.onshow = () => {
                    console.log('通知已显示');
                };

                notification.onerror = (error) => {
                    console.error('通知显示错误:', error);
                };

                // iOS设备自动关闭时间更短
                const autoCloseTime = isIOS ? 5000 : 10000;
                setTimeout(() => {
                    if (notification) {
                        notification.close();
                    }
                }, autoCloseTime);

            } catch (error) {
                console.error('创建通知失败:', error);
                // 降级处理：使用浏览器alert
                this.showFallbackAlert(randomMessage);
            }
        } else {
            // 降级处理：使用浏览器alert
            this.showFallbackAlert(randomMessage);
        }

        // 添加振动提醒（移动设备）
        this.addVibration();
    }

    showFallbackAlert(message) {
        // 降级处理：使用浏览器原生alert
        if (confirm(`💧 ${message}\n\n点击"确定"记录已喝水，点击"取消"稍后提醒`)) {
            // 用户点击确定，记录喝水
            this.addWater(250);
        }
        // 用户点击取消或关闭，不做任何操作，等待下次提醒
    }

    addVibration() {
        // 检查是否支持振动API
        if ('vibrate' in navigator) {
            try {
                // 振动模式：短-停-短-停-长
                navigator.vibrate([200, 100, 200, 100, 500]);
            } catch (error) {
                console.log('振动功能不可用:', error);
            }
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
            this.restoreTimeSelection();

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
            case 'WATER_CONSUMED':
                // 用户通过通知记录了喝水
                this.addWater(data.amount || 250);
                console.log('通过通知记录喝水:', data.amount || 250, 'ml');
                break;
            case 'SNOOZE_REMINDER':
                // 用户选择稍后提醒
                this.snoozeReminder(data.delay || 10);
                console.log('用户选择稍后提醒:', data.delay || 10, '分钟');
                break;
        }
    }

    snoozeReminder(delayMinutes) {
        if (this.isActive) {
            // 停止当前提醒
            this.stopReminder();

            // 延迟指定时间后重新启动
            setTimeout(() => {
                this.startReminder();
                console.log(`延迟 ${delayMinutes} 分钟后重新启动提醒`);
            }, delayMinutes * 60 * 1000);

            // 显示延迟提示
            console.log(`提醒已延迟 ${delayMinutes} 分钟`);
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

    bindNotificationEvents() {
        // 通知权限弹窗事件
        const enableBtn = document.getElementById('enableNotificationBtn');
        const skipBtn = document.getElementById('skipNotificationBtn');
        const testBtn = document.getElementById('testNotificationBtn');
        const requestBtn = document.getElementById('requestPermissionBtn');

        if (enableBtn) {
            enableBtn.addEventListener('click', async () => {
                const granted = await this.requestNotificationPermission();
                if (granted) {
                    this.hideNotificationModal();
                }
            });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.hideNotificationModal();
            });
        }

        if (testBtn) {
            testBtn.addEventListener('click', () => {
                if (Notification.permission === 'granted') {
                    this.showTestNotification();
                } else {
                    alert('请先开启通知权限！');
                }
            });
        }

        if (requestBtn) {
            requestBtn.addEventListener('click', async () => {
                await this.requestNotificationPermission();
            });
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
