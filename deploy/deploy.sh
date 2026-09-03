#!/bin/bash
# ============================================
# 情书生成器 - Ubuntu 一键部署脚本
# 使用方法: bash deploy.sh
# ============================================
set -e

echo "============================================"
echo "  情书生成器 - Ubuntu 一键部署"
echo "============================================"

# 项目目录
APP_DIR="/var/www/love-letter"
APP_PORT=3000

# ---------- 1. 安装 Node.js 20 ----------
echo ""
echo "[1/7] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js 已安装: $(node -v)"
fi

# ---------- 2. 安装 pnpm ----------
echo ""
echo "[2/7] 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "安装 pnpm..."
    sudo npm install -g pnpm
else
    echo "pnpm 已安装: $(pnpm -v)"
fi

# ---------- 3. 安装 PM2 ----------
echo ""
echo "[3/7] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
else
    echo "PM2 已安装: $(pm2 -v)"
fi

# ---------- 4. 安装 Nginx ----------
echo ""
echo "[4/7] 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo "Nginx 已安装: $(nginx -v 2>&1)"
fi

# ---------- 5. 安装依赖并构建 ----------
echo ""
echo "[5/7] 安装依赖并构建项目..."
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo "项目目录: $PROJECT_ROOT"

# 复制到标准位置
sudo mkdir -p "$APP_DIR"
sudo cp -r . "$APP_DIR/"
cd "$APP_DIR"

# 安装依赖
pnpm install --no-frozen-lockfile

# 构建 Next.js
pnpm next build

# ---------- 6. 配置 PM2 ----------
echo ""
echo "[6/7] 配置 PM2..."
sudo mkdir -p /var/log/love-letter

# 停止旧进程
pm2 delete love-letter 2>/dev/null || true

# 使用 ecosystem 配置启动
# 修正 cwd 路径
sudo sed -i "s|/var/www/love-letter|$APP_DIR|g" deploy/ecosystem.config.js
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | sudo bash 2>/dev/null || true

# ---------- 7. 配置 Nginx ----------
echo ""
echo "[7/7] 配置 Nginx..."
sudo cp deploy/nginx-love-letter.conf /etc/nginx/sites-available/love-letter
sudo ln -sf /etc/nginx/sites-available/love-letter /etc/nginx/sites-enabled/love-letter
sudo rm -f /etc/nginx/sites-enabled/default

# 测试并重载
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# ---------- 防火墙 ----------
echo ""
echo "配置防火墙..."
sudo ufw allow 22/tcp 2>/dev/null || true
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

# ---------- 完成 ----------
echo ""
echo "============================================"
echo "  部署完成！"
echo "============================================"
echo ""
echo "本地访问: http://localhost:$APP_PORT"
echo "外部访问: http://$(curl -s ifconfig.me || echo '你的服务器IP')"
echo ""
echo "常用命令："
echo "  查看状态:   pm2 status"
echo "  查看日志:   pm2 logs love-letter"
echo "  重启服务:   pm2 restart love-letter"
echo "  停止服务:   pm2 stop love-letter"
echo ""
echo "配置 HTTPS (可选):"
echo "  sudo apt install certbot python3-certbot-nginx -y"
echo "  sudo certbot --nginx -d gwchen.cloud -d www.gwchen.cloud"
echo ""
echo "域名解析：在阿里云控制台添加 A 记录指向本服务器公网 IP"
echo "============================================"
