@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Multi-payment provider SaaS app setup script (Windows version)
REM Supports Stripe and PayPal quick configuration

echo ========================================
echo Multi-Payment Provider Setup Script
echo ========================================
echo.

REM Check required tools
echo [1/7] Checking system requirements...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: pnpm is not installed. Please install pnpm first
    echo Install command: npm install -g pnpm
    pause
    exit /b 1
)

echo System requirements check passed
echo.

REM Install dependencies
echo [2/7] Installing project dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo ERROR: Dependency installation failed
    pause
    exit /b 1
)
echo Dependencies installed successfully
echo.

REM Setup environment
echo [3/7] Setting up environment configuration...

REM Run original database setup
pnpm db:setup
if %errorlevel% neq 0 (
    echo ERROR: Database setup failed
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file creation failed
    pause
    exit /b 1
)

echo Please manually edit .env file and add payment configuration:
echo.
echo # Payment provider configuration
echo DEFAULT_PAYMENT_PROVIDER=stripe
echo # Options: stripe, paypal
echo.
echo # Stripe configuration
echo STRIPE_SECRET_KEY=sk_test_***
echo STRIPE_WEBHOOK_SECRET=whsec_***
echo.
echo # PayPal configuration
echo PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
echo PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
echo PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
echo PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret
echo.

set /p edit_env="Edit .env file now? (y/n): "
if /i "!edit_env!"=="y" (
    notepad .env
)

echo Environment configuration completed
echo.

REM Database migration
echo [4/7] Setting up database...

REM Run database migration
pnpm db:migrate
if %errorlevel% neq 0 (
    echo ERROR: Database migration failed
    pause
    exit /b 1
)

REM Run payment data migration
echo [5/7] Migrating payment data to new architecture...
npx tsx lib/db/migrate-payment-data.ts migrate
if %errorlevel% neq 0 (
    echo ERROR: Payment data migration failed
    pause
    exit /b 1
)

REM Validate data integrity
echo [6/7] Validating data integrity...
npx tsx lib/db/migrate-payment-data.ts validate
if %errorlevel% neq 0 (
    echo WARNING: Data validation failed, please check data integrity
)

REM Seed data
echo Seeding database...
pnpm db:seed
if %errorlevel% neq 0 (
    echo ERROR: Database seeding failed
    pause
    exit /b 1
)

echo Database setup completed
echo.

REM Stripe setup
echo [7/7] Payment provider setup information...

where stripe >nul 2>nul
if %errorlevel% equ 0 (
    echo Stripe CLI is installed. Please run these commands:
    echo   stripe login
    echo   stripe listen --forward-to localhost:3000/api/stripe/webhook
    echo.
) else (
    echo WARNING: Stripe CLI is not installed. Install to enable local webhook testing
    echo Install command: npm install -g stripe-cli
    echo.
)

echo PayPal setup instructions:
echo 1. Visit https://developer.paypal.com/
echo 2. Create developer account or login
echo 3. Create new application (Sandbox mode)
echo 4. Get client ID and client secret
echo 5. Add these to your .env file
echo.
echo PayPal Developer Console: https://developer.paypal.com/developer/applications/
echo.

REM Start development server
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Default account information:
echo Email: test@test.com
echo Password: admin123
echo.
echo Access URL: http://localhost:3000
echo.
echo Payment testing:
echo - Stripe test card: 4242 4242 4242 4242
echo - PayPal: Use sandbox test account
echo.

set /p start_dev="Start development server now? (y/n): "
if /i "!start_dev!"=="y" (
    echo Starting development server...
    pnpm dev
) else (
    echo Setup completed! Enjoy your multi-payment provider SaaS application!
    pause
)
