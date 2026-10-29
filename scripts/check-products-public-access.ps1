$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $repositoryRoot '.env.local'
if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  throw 'No se encontró .env.local en la raíz del proyecto.'
}

$url = $null
$key = $null
foreach ($line in Get-Content -LiteralPath $environmentFile) {
  if ($line -match '^\s*(?:export\s+)?(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)\s*=\s*(.*?)\s*$') {
    $name = $Matches[1]
    $value = $Matches[2]
    if ($value.Length -ge 2) {
      $firstCharacter = $value[0]
      $lastCharacter = $value[$value.Length - 1]
      if (($firstCharacter -eq '"' -and $lastCharacter -eq '"') -or
          ($firstCharacter -eq "'" -and $lastCharacter -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    if ($name -eq 'NEXT_PUBLIC_SUPABASE_URL') {
      $url = $value
    } else {
      $key = $value
    }
  }
}

if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($key)) {
  throw 'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.'
}

$client = [System.Net.Http.HttpClient]::new()
$request = [System.Net.Http.HttpRequestMessage]::new(
  [System.Net.Http.HttpMethod]::Get,
  "$($url.TrimEnd('/'))/rest/v1/products?select=id&limit=1"
)
$request.Headers.Add('apikey', $key)
$request.Headers.Authorization =
  [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $key)
$response = $null

try {
  try {
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
  } catch {
    throw 'No se pudo completar la solicitud de prueba a Supabase.'
  }

  $status = [int]$response.StatusCode
  if ($status -in 401, 403, 404) {
    Write-Output "OK: la clave pública no puede leer products (HTTP $status)."
  } else {
    throw "FALLO: se esperaba HTTP 401, 403 o 404; se recibió HTTP $status."
  }
} finally {
  if ($null -ne $response) { $response.Dispose() }
  $request.Dispose()
  $client.Dispose()
}
