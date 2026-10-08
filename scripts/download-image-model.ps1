param(
  [Parameter(Mandatory = $true)]
  [string]$ComfyPath
)

$ErrorActionPreference = 'Stop'
$comfyRoot = (Resolve-Path -LiteralPath $ComfyPath).Path
$checkpointDirectory = Join-Path $comfyRoot 'ComfyUI\models\checkpoints'
$checkpointPath = Join-Path $checkpointDirectory 'sdxl_lightning_4step.safetensors'
$modelUrl = 'https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step.safetensors'

New-Item -ItemType Directory -Force -Path $checkpointDirectory | Out-Null
& curl.exe --fail --location --retry 5 --retry-delay 2 --continue-at - $modelUrl --output $checkpointPath
if ($LASTEXITCODE -ne 0) {
  throw "O download do checkpoint falhou (código $LASTEXITCODE). Execute o script novamente para retomar."
}

Write-Host "Checkpoint instalado em: $checkpointPath"
