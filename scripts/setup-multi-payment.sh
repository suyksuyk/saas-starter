#!/bin/bash

# 多支付提供商SaaS应用设置脚本
# 支持Stripe和PayPal的快速配置

set -e

echo "🚀 开始设置多支付提供商SaaS应用..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必需的工具
check_requirements() {
    echo -e "${BLUE}📋 检查系统要求...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装。请安装 Node.js 18+${NC}"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm 未安装。请先安装 pnpm${NC}"
        echo "npm install -g pnpm"
        exit 1
    fi
    
    if ! command -v stripe &> /dev/null; then
        echo -e "${YELLOW}⚠️  Stripe CLI 未安装。安装以启用本地webhook测试${NC}"
        echo "安装命令: npm install -g stripe-cli"
    fi
    
    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}📦 安装项目依赖...${NC}"
    pnpm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 设置环境变量
setup_environment() {
    echo -e "${BLUE}⚙️  设置环境配置...${NC}"
    
    # 运行原有的数据库设置
    pnpm db:setup
    
    # 检查.env文件是否存在
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env 文件创建失败${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}📝 请手动编辑 .env 文件，添加以下支付配置：${NC}"
    echo ""
    echo "# 支付提供商配置"
    echo "DEFAULT_PAYMENT_PROVIDER=stripe"
    echo "# 可选值: stripe, paypal"
    echo ""
    echo "# Stripe配置"
    echo "STRIPE_SECRET_KEY=sk_test_***"
    echo "STRIPE_WEBHOOK_SECRET=whsec_***"
    echo ""
    echo "# PayPal配置"
    echo "PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id"
    echo "PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret"
    echo "PAYPAL_WEBHOOK_ID=your_paypal_webhook_id"
    echo "PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret"
    echo ""
    
    read -p "是否现在编辑 .env 文件？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
    
    echo -e "${GREEN}✅ 环境配置完成${NC}"
}

# 数据库迁移
setup_database() {
    echo -e "${BLUE}🗄️  设置数据库...${NC}"
    
    # 运行数据库迁移
    pnpm db:migrate
    
    # 运行支付数据迁移
    echo -e "${BLUE}🔄 迁移支付数据到新架构...${NC}"
    npx tsx lib/db/migrate-payment-data.ts migrate
    
    # 验证数据完整性
    echo -e "${BLUE}✅ 验证数据完整性...${NC}"
    npx tsx lib/db/migrate-payment-data.ts validate
    
    # 种子数据
    echo -e "${BLUE}🌱 创建种子数据...${NC}"
    pnpm db:seed
    
    echo -e "${GREEN}✅ 数据库设置完成${NC}"
}

# Stripe设置
setup_stripe() {
    echo -e "${BLUE}💳 设置Stripe...${NC}"
    
    if command -v stripe &> /dev/null; then
        echo "请运行以下命令登录Stripe："
        echo "stripe login"
        echo ""
        echo "然后启动本地webhook监听："
        echo "stripe listen --forward-to localhost:3000/api/stripe/webhook"
        echo ""
        read -p "按Enter继续..."
    else
        echo -e "${YELLOW}⚠️  跳过Stripe CLI设置（未安装）${NC}"
    fi
}

# PayPal设置说明
setup_paypal_info() {
    echo -e "${BLUE}💰 PayPal设置说明：${NC}"
    echo ""
    echo "1. 访问 https://developer.paypal.com/"
    echo "2. 创建开发者账户或登录"
    echo "3. 创建新的应用程序（Sandbox模式）"
    echo "4. 获取客户端ID和客户端密钥"
    echo "5. 将这些信息添加到 .env 文件中"
    echo ""
    echo "PayPal开发者控制台: https://developer.paypal.com/developer/applications/"
    echo ""
}

# 启动开发服务器
start_dev_server() {
    echo -e "${BLUE}🚀 启动开发服务器...${NC}"
    echo ""
    echo -e "${GREEN}🎉 设置完成！${NC}"
    echo ""
    echo "默认账户信息："
    echo "邮箱: test@test.com"
    echo "密码: admin123"
    echo ""
    echo "访问地址: http://localhost:3000"
    echo ""
    echo "支付测试："
    echo "- Stripe测试卡: 4242 4242 4242 4242"
    echo "- PayPal: 使用沙箱测试账户"
    echo ""
    
    read -p "是否现在启动开发服务器？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pnpm dev
    fi
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          多支付提供商SaaS应用快速设置脚本                    ║"
    echo "║                   支持Stripe和PayPal                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    check_requirements
    install_dependencies
    setup_environment
    setup_database
    setup_stripe
    setup_paypal_info
    start_dev_server
    
    echo -e "${GREEN}🎯 设置完成！享受你的多支付提供商SaaS应用吧！${NC}"
}

# 运行主函数
main "$@"
