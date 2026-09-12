<#
Instala lo necesario para correr este proyecto (TFG - deteccion de anomalias
financieras personales) en una maquina Windows nueva:
  - Python (via winget) si no hay una instalacion real (evita el stub de
    Microsoft Store que abre la tienda en vez de ejecutar Python)
  - un entorno virtual .venv en la raiz del repo
  - los paquetes listados en requirements.txt

Uso: desde la raiz del repo -> .\tools\setup.ps1
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

function Test-RealPython {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $cmd) { return $false }
    if ($cmd.Source -like "*WindowsApps*") { return $false }
    return $true
}

if (-not (Test-RealPython)) {
    Write-Host "Python no encontrado (o es el stub de Microsoft Store). Instalando Python 3.12 via winget..."
    winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements
    Write-Host "Python instalado. Si el siguiente paso falla, cerra y reabri la terminal para actualizar el PATH y volve a correr este script."
} else {
    Write-Host "Python ya esta instalado: $(python --version)"
}

Set-Location $repoRoot

if (-not (Test-Path ".venv")) {
    Write-Host "Creando entorno virtual .venv..."
    python -m venv .venv
}

Write-Host "Instalando dependencias de requirements.txt..."
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host ""
Write-Host "Listo."
Write-Host "Activar el entorno:      .\.venv\Scripts\Activate.ps1"
Write-Host "Generar el mock de datos: .\.venv\Scripts\python.exe src\generate_mock_data.py"
