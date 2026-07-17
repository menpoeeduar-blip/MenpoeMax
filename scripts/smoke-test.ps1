$ErrorActionPreference = "Stop"

$BaseUrl = "https://menpoesocial.web.app"
$Routes = @(
  @{ Path = "/"; Contains = @("id=`"root`"") },
  @{ Path = "/explore"; Contains = @("id=`"root`"") },
  @{ Path = "/reels"; Contains = @("id=`"root`"") },
  @{ Path = "/messages"; Contains = @("id=`"root`"") },
  @{ Path = "/notifications"; Contains = @("id=`"root`"") },
  @{ Path = "/jobs"; Contains = @("id=`"root`"") },
  @{ Path = "/marketplace"; Contains = @("id=`"root`"") },
  @{ Path = "/communities"; Contains = @("id=`"root`"") },
  @{ Path = "/events"; Contains = @("id=`"root`"") },
  @{ Path = "/streams"; Contains = @("id=`"root`"") },
  @{ Path = "/profile"; Contains = @("id=`"root`"") },
  @{ Path = "/profile/undefined"; Contains = @("id=`"root`"") }
)

$Results = @()

foreach ($route in $Routes) {
  $url = "$BaseUrl$($route.Path)"
  try {
    $res = Invoke-WebRequest -Uri $url -Method GET -MaximumRedirection 10 -UseBasicParsing
    $okStatus = ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400)
    $content = [string]$res.Content
    $missing = @()
    foreach ($token in $route.Contains) {
      if (-not $content.Contains($token)) {
        $missing += $token
      }
    }
    $okContent = ($missing.Count -eq 0)
    $Results += [pscustomobject]@{
      Route = $route.Path
      StatusCode = $res.StatusCode
      HttpOk = $okStatus
      ContentOk = $okContent
      MissingTokens = if ($missing.Count -eq 0) { "" } else { ($missing -join ", ") }
    }
  } catch {
    $Results += [pscustomobject]@{
      Route = $route.Path
      StatusCode = 0
      HttpOk = $false
      ContentOk = $false
      MissingTokens = "RequestError: $($_.Exception.Message)"
    }
  }
}

$passed = ($Results | Where-Object { $_.HttpOk -and $_.ContentOk }).Count
$total = $Results.Count

Write-Output "Smoke test result: $passed/$total routes passed"
$Results | Format-Table -AutoSize

if ($passed -ne $total) {
  exit 1
}
