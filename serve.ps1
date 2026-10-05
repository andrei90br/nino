# Mini server statico per l'anteprima locale della cartella site/  (uso: serve.ps1 -Port 5173)
param([int]$Port = 5173)
$root = Join-Path $PSScriptRoot "site"
$types = @{ ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".webp"="image/webp"; ".ico"="image/x-icon" }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $root on http://localhost:$Port/"
while ($l.IsListening) {
  $c = $l.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart("/")
    $p = Join-Path $root $rel
    if (Test-Path $p -PathType Container) { $p = Join-Path $p "index.html" }
    $full = [IO.Path]::GetFullPath($p)
    if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $c.Response.ContentType = if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" }
      $c.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
