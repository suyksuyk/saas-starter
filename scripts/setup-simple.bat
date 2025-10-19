@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Simple setup script for multi-payment provider SaaS app
REM This script provides step-by-step guidance

echo ========================================
echo Multi-Payment Provider Setup Guide
echo ========================================
echo.

echo This script will guide you through the setup process.
echo Please follow each step carefully.
echo.

REM Check Node.js
echo [Step 1] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed.
echo.

REM Check pnpm
echo [Step 2] Checking pnpm...
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: pnpm is not installed. Installing pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install pnpm. Please install manually: npm install -g pnpm
        pause
        exit /b 1
    )
)
echo pnpm is installed.
echo.

REM Install dependencies
echo [Step 3] Installing project dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo ERROR: Dependency installation failed
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

REM Create .env file if it doesn't exist
echo [Step 4] Setting up environment configuration...
if not exist .env (
    echo Creating .env file with template...
    echo # Database Configuration > .env
    echo POSTGRES_URL=postgresql://postgres:postgres@localhost:54322/postgres >> .env
    echo. >> .env
    echo # Payment Provider Configuration >> .env
    echo DEFAULT_PAYMENT_PROVIDER=stripe >> .env
    echo. >> .env
    echo # Stripe Configuration >> .env
    echo STRIPE_SECRET_KEY=sk_test_*** >> .env
    echo STRIPE_WEBHOOK_SECRET=whsec_*** >> .env
    echo. >> .env
    echo # PayPal Configuration >> .env
    echo PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id >> .env
    echo PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret >> .env
    echo PAYPAL_WEBHOOK_ID=your_paypal_webhook_id >> .env
    echo PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret >> .env
    echo. >> .env
    echo # Application Configuration >> .env
    echo BASE_URL=http://localhost:3000 >> .env
    echo AUTH_SECRET=your_auth_secret_here >> .env
    echo .env file created.
) else (
    echo .env file already exists.
)
echo.

REM Database setup instructions
echo [Step 5] Database Setup Instructions:
echo.
echo OPTION A - Local PostgreSQL with Docker:
echo 1. Install Docker from https://www.docker.com/products/docker-desktop
echo 2. Run: docker compose up -d
echo 3. Use: postgresql://postgres:postgres@localhost:54322/postgres
echo.
echo OPTION B - Remote PostgreSQL:
echo 1. Get a free PostgreSQL database from https://vercel.com/marketplace?category=databases
echo 2. Copy the connection string
echo 3. Update POSTGRES_URL in your .env file
echo.

set /p db_ready="Have you set up your database? (y/n): "
if /i "!db_ready!" neq "y" (
    echo Please set up your database first, then run this script again.
    pause
    exit /b 1
)

REM Run database migrations
echo [Step 6] Running database migrations...
pnpm db:migrate
if %errorlevel% neq 0 (
    echo ERROR: Database migration failed. Please check your POSTGRES_URL.
    pause
    exit /b 1
)
echo Database migrations completed.
echo.

REM Run payment data migration
echo [Step 7] Migrating payment data...
npx tsx lib/db/migrate-payment-data.ts migrate
if %errorlevel% neq 0 (
    echo WARNING: Payment data migration had issues, but continuing...
)
echo Payment data migration completed.
echo.

REM Seed database
echo [Step 8] Seeding database with default data...
pnpm db:seed
if %errorlevel% neq 0 (
    echo ERROR: Database seeding failed
    pause
    exit /b 1
)
echo Database seeded successfully.
echo.

REM Payment provider setup
echo [Step 9] Payment Provider Setup:
echo.
echo STRIPE SETUP:
echo 1. Visit https://dashboard.stripe.com/test/apikeys
echo 2. Copy your test secret key (starts with sk_test_)
echo 3. Update STRIPE_SECRET_KEY in .env
echo 4. Install Stripe CLI: npm install -g stripe-cli
echo 5. Run: stripe login
echo 6. Run: stripe listen --forward-to localhost:3000/api/stripe/webhook
echo 7. Copy the webhook secret and update STRIPE_WEBHOOK_SECRET in .env
echo.
echo PAYPAL SETUP:
echo 1. Visit https://developer.paypal.com/
echo 2. Create a developer account
echo 3. Create new application (Sandbox mode)
echo 4. Copy client ID and secret
echo 5. Update PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env
echo.

set /p payment_ready="Have you configured your payment providers? (y/n): "
if /i "!payment_ready!" neq "y" (
    echo Please configure at least one payment provider, then run this script again.
    pause
    exit /b 1
)

REM Final instructions
echo ========================================
echo Setup Completed Successfully!
echo ========================================
echo.
echo Default login credentials:
echo Email: test@test.com
echo Password: admin123
echo.
echo You can now start the development server:
echo   pnpm dev
echo.
echo Then visit: http://localhost:3000
echo.
echo For webhook testing, run in separate terminal:
echo   stripe listen --forward-to localhost:3000/api/stripe/webhook
echo.

set /p start_dev="Start development server now? (y/n): "
if /i "!start_dev!"=="y" (
    echo Starting development server...
    pnpm dev
) else (
    echo Setup completed! Run 'pnpm dev' to start the development server.
    pause
)
