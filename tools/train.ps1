<#
Entrena Isolation Forest y evalua contra el ground truth.
Requiere que data/transactions.csv exista (correr preprocess.ps1 primero).

Uso: desde cualquier lugar -> .\tools\train.ps1
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
$transactions = Join-Path $repoRoot "data\transactions.csv"

if (-not (Test-Path $python)) {
    Write-Error "Entorno virtual no encontrado. Ejecuta primero: .\tools\setup.ps1"
    exit 1
}

if (-not (Test-Path $transactions)) {
    Write-Error "data\transactions.csv no encontrado. Ejecuta primero: .\tools\preprocess.ps1"
    exit 1
}

Write-Host "Entrenando modelo y evaluando..."
& $python (Join-Path $repoRoot "src\train.py")
