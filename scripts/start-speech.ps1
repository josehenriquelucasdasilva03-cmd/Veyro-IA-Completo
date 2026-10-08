$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $project
$envFile = Join-Path $project '.env'
if (-not (Test-Path $envFile)) { throw 'Arquivo .env ausente. Execute npm run setup primeiro.' }
foreach ($key in @('SPEECH_TOKEN', 'WHISPER_MODEL', 'SPEECH_PORT')) {
  $line = Get-Content $envFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if ($line) { [Environment]::SetEnvironmentVariable($key, $line.Substring($key.Length + 1), 'Process') }
}
$python = Join-Path $project '.venv-speech\Scripts\python.exe'
if (-not (Test-Path $python)) { throw 'Ambiente Python ausente. Crie .venv-speech e instale services/speech/requirements.txt conforme o README.' }
& $python (Join-Path $project 'services\speech\server.py')
