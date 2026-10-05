# Genera il sito statico (IT in radice, EN in /en, DE in /de) da src/template.html + src/lang/*.json
# Uso:  powershell -ExecutionPolicy Bypass -File build.ps1
#
# Immagini: nel template ogni foto e' un segnaposto  [[IMG nome|chiave_alt|classi|variante]].
# Se esiste src/assets/img/<nome>.(jpg|jpeg|webp|avif|png) viene usata la foto, altrimenti compare un placeholder illustrato
# (variante = dusk | night | forest | wood | table | snow). Per sostituire un placeholder basta salvare la foto con quel nome e rilanciare la build.
param(
  # Dominio finale (serve per canonical, hreflang e Open Graph). Da cambiare al go-live.
  [string]$Site = "https://www.nivishotel.it",
  # Motore di prenotazione ufficiale (SimpleBooking). La lingua viene aggiunta in automatico.
  [string]$Booking = "https://www.simplebooking.it/ibe2/hotel/10212",
  # Aggiunge <meta name="robots" content="noindex">: da usare per le anteprime, non per il go-live.
  [switch]$NoIndex
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$out  = Join-Path $root "site"
$imgSrc = Join-Path $root "src\assets\img"
$utf8 = New-Object System.Text.UTF8Encoding($false)

$tpl = [IO.File]::ReadAllText((Join-Path $root "src\template.html"), $utf8)

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $out "assets") | Out-Null

# CSS: i file di src/assets/css vengono uniti in ordine alfabetico in un unico style.css
$css = (Get-ChildItem (Join-Path $root "src\assets\css") -Filter *.css | Sort-Object Name | ForEach-Object { [IO.File]::ReadAllText($_.FullName, $utf8) }) -join "`n"
[IO.File]::WriteAllText((Join-Path $out "assets\style.css"), $css, $utf8)
Copy-Item (Join-Path $root "src\assets\main.js") (Join-Path $out "assets\main.js")
if (Test-Path $imgSrc) { Copy-Item $imgSrc (Join-Path $out "assets\img") -Recurse }

function Find-Img([string]$name) {
  foreach ($ext in "jpg","jpeg","webp","avif","png") {
    $f = Join-Path $imgSrc "$name.$ext"
    if (Test-Path $f) { return "$name.$ext" }
  }
  return $null
}

$ph = @'
<svg class="ph__s" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><path class="r1" d="M0 600V330l110-70 90 50 140-120 120 110 100-60 150 150 110-90 140 80 90-50 150 120V600z"/><path class="r2" d="M0 600V430l140-80 110 60 160-110 130 100 110-70 170 130 120-90 120 60 140-100V600z"/><path class="r3" d="M0 600V500l120-50 130 40 150-70 140 60 120-40 160 70 110-50 170 50V600z"/></svg>
'@.Trim()

$langs = @(
  @{ code = "it"; dir = "";    path = "/";    rootRel = "" },
  @{ code = "en"; dir = "en";  path = "/en/"; rootRel = "../" },
  @{ code = "de"; dir = "de";  path = "/de/"; rootRel = "../" }
)

$missing = @{}
$found = @{}

foreach ($l in $langs) {
  $json = [IO.File]::ReadAllText((Join-Path $root "src\lang\$($l.code).json"), $utf8) | ConvertFrom-Json
  $map = @{}
  $json.PSObject.Properties | ForEach-Object { $map[$_.Name] = [string]$_.Value }

  $labels = [ordered]@{
    name = $map.lbl_name; email = $map.lbl_email; phone = $map.lbl_phone; checkin = $map.lbl_checkin;
    checkout = $map.lbl_checkout; adults = $map.lbl_adults; room = $map.lbl_room
  }
  $map["mail_labels"] = ($labels | ConvertTo-Json -Compress)
  $map["SITE"] = $Site.TrimEnd("/")
  $map["SB"] = "$($Booking.TrimEnd('/'))?lang=$($l.code.ToUpper())&amp;cur=EUR"
  $map["ROBOTS"] = if ($NoIndex) { '<meta name="robots" content="noindex, nofollow">' } else { "" }
  $map["ROOT"] = $l.rootRel
  $map["path"] = $l.path
  $map["ROOT_IT"] = if ($l.code -eq "it") { "./" } else { "../" }
  $map["ROOT_EN"] = if ($l.code -eq "en") { "./" } elseif ($l.code -eq "it") { "en/" } else { "../en/" }
  $map["ROOT_DE"] = if ($l.code -eq "de") { "./" } elseif ($l.code -eq "it") { "de/" } else { "../de/" }
  foreach ($c in "it","en","de") { $map["cur_$c"] = if ($c -eq $l.code) { 'aria-current="true"' } else { "" } }
  $hero = Find-Img "hero"
  $map["OG"] = if ($hero) { "<meta property=`"og:image`" content=`"$($map.SITE)/assets/img/$hero`">" } else { "" }

  $html = $tpl
  foreach ($k in $map.Keys) { $html = $html.Replace("{{$k}}", $map[$k]) }

  # segnaposto immagine -> foto reale oppure placeholder
  $m = $map
  $evaluator = [System.Text.RegularExpressions.MatchEvaluator]{
    param($mt)
    $name = $mt.Groups[1].Value; $altKey = $mt.Groups[2].Value; $cls = $mt.Groups[3].Value.Trim(); $variant = $mt.Groups[4].Value
    $decor = ($altKey -eq "-")
    $alt = if ($decor) { "" } else { [string]$m[$altKey] }
    if (-not $decor -and -not $m.ContainsKey($altKey)) { throw "[$($l.code)] chiave alt mancante: $altKey" }
    $file = Find-Img $name
    if ($file) {
      $found[$name] = $true
      $attr = if ($cls -match "hero__bg") { 'fetchpriority="high" decoding="async"' } else { 'loading="lazy" decoding="async"' }
      return "<img class=`"m $cls`" src=`"$($m.ROOT)assets/img/$file`" alt=`"$alt`" $attr>"
    }
    $missing[$name] = $true
    $a11y = if ($decor) { 'aria-hidden="true"' } else { "role=`"img`" aria-label=`"$alt`"" }
    return "<div class=`"m ph ph--$variant $cls`" $a11y data-ph=`"$name`">$ph<span class=`"ph__t`" aria-hidden=`"true`">FOTO &middot; $name</span></div>"
  }
  $html = [regex]::Replace($html, "\[\[IMG ([a-z0-9_-]+)\|([A-Za-z0-9_-]+)\|([^|\]]*)\|([a-z]+)\]\]", $evaluator)

  $left = [regex]::Matches($html, "\{\{[A-Za-z0-9_]+\}\}|\[\[IMG[^\]]*\]\]") | ForEach-Object { $_.Value } | Select-Object -Unique
  if ($left) { throw "[$($l.code)] segnaposto non risolti: $($left -join ', ')" }

  $target = if ($l.dir) { Join-Path $out $l.dir } else { $out }
  if (-not (Test-Path $target)) { New-Item -ItemType Directory -Path $target | Out-Null }
  [IO.File]::WriteAllText((Join-Path $target "index.html"), $html, $utf8)
  Write-Host "OK  $($l.code) -> $target\index.html"
}

# robots.txt e sitemap.xml (con alternate hreflang): l'anteprima -NoIndex blocca tutto
$base = $Site.TrimEnd("/")
$robots = if ($NoIndex) { "User-agent: *`nDisallow: /`n" } else { "User-agent: *`nAllow: /`n`nSitemap: $base/sitemap.xml`n" }
[IO.File]::WriteAllText((Join-Path $out "robots.txt"), $robots, $utf8)
$alts = @(@("it", "/"), @("en", "/en/"), @("de", "/de/"))
$xml = New-Object System.Collections.Generic.List[string]
$xml.Add('<?xml version="1.0" encoding="UTF-8"?>')
$xml.Add('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
foreach ($a in $alts) {
  $xml.Add("  <url>")
  $xml.Add("    <loc>$base$($a[1])</loc>")
  foreach ($b in $alts) { $xml.Add("    <xhtml:link rel=`"alternate`" hreflang=`"$($b[0])`" href=`"$base$($b[1])`"/>") }
  $xml.Add("  </url>")
}
$xml.Add("</urlset>")
[IO.File]::WriteAllText((Join-Path $out "sitemap.xml"), ($xml -join "`n") + "`n", $utf8)

if ($found.Count)   { Write-Host ("Foto reali usate ({0}): {1}" -f $found.Count, (($found.Keys | Sort-Object) -join ", ")) }
if ($missing.Count) { Write-Host ("Placeholder ({0}): {1}" -f $missing.Count, (($missing.Keys | Sort-Object) -join ", ")) }
