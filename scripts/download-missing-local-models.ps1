$ErrorActionPreference = "Stop"

$downloads = @(
  @{
    Id = "qwen3-14b-q4-k-m"
    Url = "https://huggingface.co/Qwen/Qwen3-14B-GGUF/resolve/main/Qwen3-14B-Q4_K_M.gguf?download=true"
    Dest = "D:\models\Qwen\Qwen3-14B-GGUF\Qwen3-14B-Q4_K_M.gguf"
    MinBytes = 8500000000
  },
  @{
    Id = "sdxl-base-1.0"
    Url = "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors?download=true"
    Dest = "D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\checkpoints\sd_xl_base_1.0.safetensors"
    MinBytes = 6800000000
  },
  @{
    Id = "flux1-schnell-fp8"
    Url = "https://huggingface.co/Comfy-Org/flux1-schnell/resolve/main/flux1-schnell-fp8.safetensors?download=true"
    Dest = "D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\checkpoints\flux1-schnell-fp8.safetensors"
    MinBytes = 16500000000
  }
)

foreach ($download in $downloads) {
  $dest = $download.Dest
  $dir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $dir | Out-Null

  if (Test-Path -LiteralPath $dest) {
    $existing = Get-Item -LiteralPath $dest
    if ($existing.Length -ge $download.MinBytes) {
      Write-Host ("SKIP {0} already exists: {1:n2} GB {2}" -f $download.Id, ($existing.Length / 1GB), $dest)
      continue
    }
    Write-Host ("REMOVE incomplete existing target for {0}: {1:n2} GB {2}" -f $download.Id, ($existing.Length / 1GB), $dest)
    Remove-Item -LiteralPath $dest -Force
  }

  $part = "$dest.part"
  Write-Host ("DOWNLOAD {0} -> {1}" -f $download.Id, $dest)
  & curl.exe `
    -L `
    --fail `
    --retry 8 `
    --retry-delay 10 `
    --connect-timeout 60 `
    --continue-at - `
    --output $part `
    $download.Url

  if ($LASTEXITCODE -ne 0) {
    throw ("curl failed for {0} with exit code {1}" -f $download.Id, $LASTEXITCODE)
  }

  $partial = Get-Item -LiteralPath $part
  if ($partial.Length -lt $download.MinBytes) {
    throw ("download for {0} is too small: {1:n2} GB at {2}" -f $download.Id, ($partial.Length / 1GB), $part)
  }

  Move-Item -LiteralPath $part -Destination $dest -Force
  $complete = Get-Item -LiteralPath $dest
  Write-Host ("DONE {0}: {1:n2} GB {2}" -f $download.Id, ($complete.Length / 1GB), $dest)
}
