#!/usr/bin/env pwsh
# DineSpot — Local Development Startup Script
# Run this from the project root: .\dev-start.ps1

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host ""
Write-Host "🍽️  DineSpot — Starting local dev environment" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# ─── Step 1: Docker ───────────────────────────────────────────────
Write-Host "⚙️  Step 1/4 — Starting Docker services (PostgreSQL + Redis)..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "docker not found" }
    Write-Host "   ✅ Docker found: $dockerVersion" -ForegroundColor Green

    docker compose -f "$ROOT\infra\docker\docker-compose.yml" up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose failed" }
    Write-Host "   ✅ PostgreSQL + Redis started" -ForegroundColor Green
    Write-Host "   ℹ️  Waiting 5s for DB to be ready..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 5
} catch {
    Write-Host ""
    Write-Host "   ⚠️  Docker is not running or not installed." -ForegroundColor Red
    Write-Host "   Please:" -ForegroundColor Red
    Write-Host "     1. Open Docker Desktop (search in Start menu)" -ForegroundColor Yellow
    Write-Host "     2. Wait for it to fully start (whale icon in taskbar)" -ForegroundColor Yellow
    Write-Host "     3. Re-run this script" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   If not installed, run as Administrator:" -ForegroundColor Yellow
    Write-Host "   winget install Docker.DockerDesktop" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "   Skip Docker and continue anyway? (y/N)"
    if ($continue -ne "y") { exit 1 }
}

# ─── Step 2: Prisma Migrate ───────────────────────────────────────
Write-Host ""
Write-Host "⚙️  Step 2/4 — Running database migrations..." -ForegroundColor Yellow
try {
    Set-Location "$ROOT"
    pnpm --filter=@dinespot/api db:migrate 2>&1 | Tee-Object -Variable migrateOut
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  Migration failed (DB might not be ready). Skipping..." -ForegroundColor DarkYellow
    } else {
        Write-Host "   ✅ Migrations applied" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Migration skipped: $_" -ForegroundColor DarkYellow
}

# ─── Step 3: Seed (optional) ──────────────────────────────────────
Write-Host ""
Write-Host "⚙️  Step 3/4 — Checking seed data..." -ForegroundColor Yellow
$seed = Read-Host "   Run database seed? (y/N)"
if ($seed -eq "y") {
    pnpm --filter=@dinespot/api db:seed
    Write-Host "   ✅ Database seeded" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Seed skipped" -ForegroundColor DarkGray
}

# ─── Step 4: Start Dev Servers ────────────────────────────────────
Write-Host ""
Write-Host "⚙️  Step 4/4 — Starting dev servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   🚀 API  →  http://localhost:4000" -ForegroundColor Cyan
Write-Host "   🚀 Web  →  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   📖 Docs →  http://localhost:4000/docs" -ForegroundColor DarkGray
Write-Host "   💚 Health → http://localhost:4000/health" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   Press Ctrl+C to stop all servers" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Set-Location "$ROOT"
pnpm dev
