<#
Ejecuta el preprocesamiento: carga los CSV de notebooks/ y genera data/transactions.csv.

Uso: desde cualquier lugar -> .\tools\preprocess.ps1
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Entorno virtual no encontrado. Ejecuta primero: .\tools\setup.ps1"
    exit 1
}

Write-Host "Preprocesando datos..."
& $python (Join-Path $repoRoot "src\preprocess.py")
