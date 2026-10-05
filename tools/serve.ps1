<#
Levanta un servidor HTTP local en el repo para servir el dashboard.
El dashboard usa fetch('/data/scores.csv'), que requiere HTTP (no file://).

Uso: desde cualquier lugar -> .\tools\serve.ps1
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
$scores = Join-Path $repoRoot "data\scores.csv"

if (-not (Test-Path $python)) {
    Write-Error "Entorno virtual no encontrado. Ejecuta primero: .\tools\setup.ps1"
    exit 1
}

if (-not (Test-Path $scores)) {
    Write-Error "data\scores.csv no encontrado. Ejecuta primero: .\tools\train.ps1"
    exit 1
}

Write-Host ""
Write-Host "  Dashboard listo en -> http://localhost:8000/dashboard/"
Write-Host "  Ctrl+C para detener."
Write-Host ""

# Abrir el browser primero, antes de bloquear con el servidor
Start-Process "http://localhost:8000/dashboard/"

# Servir desde la raiz del repo para que /data/scores.csv resuelva bien
Push-Location $repoRoot
try {
    & $python -m http.server 8000
} finally {
    Pop-Location
}
