# 🚀 免费部署指南

## 方法1：GitHub Pages（推荐）

### 步骤1：创建GitHub仓库
1. 访问 [GitHub.com](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 仓库名称：`drinkWater`
4. 设置为 Public
5. 点击 "Create repository"

### 步骤2：上传代码
```bash
# 在drinkWater文件夹中执行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/drinkWater.git
git push -u origin main
```

### 步骤3：启用GitHub Pages
1. 进入仓库设置页面
2. 滚动到 "Pages" 部分
3. Source 选择 "Deploy from a branch"
4. Branch 选择 "main"
5. 点击 "Save"

### 步骤4：访问应用
- 等待几分钟部署完成
- 访问：`https://你的用户名.github.io/drinkWater`

---

## 方法2：Vercel（最快）

### 步骤1：准备
1. 访问 [Vercel.com](https://vercel.com)
2. 用GitHub账号登录

### 步骤2：部署
1. 点击 "New Project"
2. 导入GitHub仓库
3. 项目名称：`aquaflow`
4. 点击 "Deploy"

### 步骤3：访问
- 自动获得域名：`aquaflow.vercel.app`

---

## 方法3：Netlify

### 步骤1：拖拽部署
1. 访问 [Netlify.com](https://netlify.com)
2. 将整个 `drinkWater` 文件夹拖拽到页面
3. 自动部署完成

### 步骤2：自定义域名（可选）
1. 在Netlify控制台设置自定义域名
2. 或使用免费的 `.netlify.app` 域名

---

## 🔧 部署后配置

### PWA安装测试
1. 在手机浏览器中打开应用
2. 查看是否出现"添加到主屏幕"提示
3. 安装后测试离线功能

### 推送通知测试
1. 访问 `/test-push.html`
2. 授权通知权限
3. 测试后台推送功能

### 性能优化
- 所有资源已优化
- 支持离线缓存
- 自动压缩传输

---

## 📱 分享给媳妇儿

部署完成后，将链接分享给媳妇儿：
- 发送应用链接
- 指导安装为PWA应用
- 设置提醒时间
- 开始健康饮水之旅！

💝 **用爱守护健康每一天**
