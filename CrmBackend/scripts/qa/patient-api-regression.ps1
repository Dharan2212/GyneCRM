param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$BaseUrl = "http://localhost:8082",
  [string]$AdminEmail = "dev.admin@gynecrm.com",
  [string]$ReceptionEmail = "dev.reception@gynecrm.com",
  [string]$DoctorEmail = "dev.doctor@gynecrm.com",
  [string]$Password = "Dev@12345",
  [switch]$StartRuntime
)

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
  Write-Host ""
  Write-Host "===================================================="
  Write-Host $title
  Write-Host "===================================================="
}

function Assert-Condition($condition, $message) {
  if (-not $condition) {
    throw $message
  }
}

function Run-NpmScript($scriptName) {
  Write-Host "Running: npm run $scriptName"
  Push-Location $ProjectRoot
  try {
    npm run $scriptName
    if ($LASTEXITCODE -ne 0) {
      throw "npm run $scriptName failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Start-RuntimeIfNeeded {
  if (-not $StartRuntime) {
    Write-Host "Runtime auto-start skipped. Make sure 'npm run start:new' is already running."
    return
  }

  Write-Host "Starting runtime in a separate PowerShell window..."
  $command = "Set-Location -LiteralPath '$ProjectRoot'; npm run start:new"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $command | Out-Null
  Start-Sleep -Seconds 5
}

function Wait-ForHealth {
  param(
    [string]$Url,
    [int]$MaxAttempts = 30
  )

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 5
      if ($response) {
        Write-Host "Runtime is healthy at $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Runtime did not become healthy at $Url"
}

function Login-And-GetToken {
  param(
    [string]$Email,
    [string]$UserPassword
  )

  $body = @{ email = $Email; password = $UserPassword } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body

  Assert-Condition ($null -ne $response) "Login response was null for $Email"
  Assert-Condition ($null -ne $response.data) "Login response missing data for $Email"
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($response.data.access_token)) "Login response missing access_token for $Email"

  return $response.data.access_token
}

function Get-Headers {
  param([string]$Token)

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($Token)) "Bearer token is missing."
  return @{ Authorization = "Bearer $Token" }
}

function Get-StatusCodeFromError($ErrorRecord) {
  try {
    if ($ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.StatusCode) {
      return [int]$ErrorRecord.Exception.Response.StatusCode
    }
  } catch {
  }

  return $null
}

function Assert-BlockedRequest {
  param(
    [scriptblock]$ScriptBlock,
    [string]$Label,
    [int[]]$ExpectedStatusCodes = @(403, 404, 409)
  )

  try {
    & $ScriptBlock | Out-Null
    throw "$Label unexpectedly succeeded."
  } catch {
    if ($_.Exception.Message -like '*unexpectedly succeeded*') {
      throw
    }

    $statusCode = Get-StatusCodeFromError $_

    if ($null -ne $statusCode -and $ExpectedStatusCodes -contains $statusCode) {
      Write-Host "$Label blocked as expected (HTTP $statusCode)."
      return
    }

    throw "$Label failed, but not with an expected status code. Got: $statusCode"
  }
}

function New-UniqueDigits {
  param([int]$Length = 10)

  $seed = [string]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
  if ($seed.Length -ge $Length) {
    return $seed.Substring($seed.Length - $Length, $Length)
  }

  return $seed.PadLeft($Length, '0')
}

function New-PatientPhoneSet {
  $base = [long](New-UniqueDigits -Length 10)

  return @{
    phone = [string]$base
    alternate_phone = [string]($base + 1)
    family_whatsapp = [string]($base + 2)
    emergency_phone = [string]($base + 3)
  }
}

Write-Section "Seed and runtime"
Run-NpmScript -scriptName "seed:reference-data"
Run-NpmScript -scriptName "seed:auth-users"
Start-RuntimeIfNeeded
Write-Host "If you see EADDRINUSE on port 8082, another local process is already using that port."
Write-Host "Do not start the runtime twice."
Wait-ForHealth -Url "$BaseUrl/health"

Write-Section "Login and capture tokens"
$adminToken = Login-And-GetToken -Email $AdminEmail -UserPassword $Password
$doctorToken = Login-And-GetToken -Email $DoctorEmail -UserPassword $Password
$receptionToken = Login-And-GetToken -Email $ReceptionEmail -UserPassword $Password

$adminHeaders = Get-Headers -Token $adminToken
$doctorHeaders = Get-Headers -Token $doctorToken
$receptionHeaders = Get-Headers -Token $receptionToken

Write-Section "Health checks"
Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -Method GET | ConvertTo-Json -Depth 10

Write-Section "Patient registration"
$phones = New-PatientPhoneSet
$patientName = "Patient Regression $(Get-Date -Format 'yyyyMMddHHmmss')"

$registerBody = @{
  full_name = $patientName
  date_of_birth = "1995-05-21"
  phone = $phones.phone
  alternate_phone = $phones.alternate_phone
  blood_group = "O+"
  family_whatsapp = $phones.family_whatsapp
  address = @{
    line_1 = "Verify Street"
    city = "Chennai"
    state = "Tamil Nadu"
    postal_code = "600001"
  }
  emergency_contact = @{
    name = "Verify Contact"
    relation = "Spouse"
    phone = $phones.emergency_phone
  }
  medical_history = @{
    existing_conditions = @()
    surgical_history = "None"
    allergies = @()
    current_medications = @()
    family_history = $null
    notes = "Patient regression verification"
  }
} | ConvertTo-Json -Depth 10

$createdPatient = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method POST -Headers $adminHeaders -ContentType "application/json" -Body $registerBody
Assert-Condition ($null -ne $createdPatient.data._id) "Patient create did not return data._id"
$patientId = $createdPatient.data._id
Write-Host "Patient created successfully: $patientId"

Write-Section "Patient list and detail"
$listResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method GET -Headers $adminHeaders
$listResponse | ConvertTo-Json -Depth 10

$searchResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients?search=Regression&page=1&limit=10" -Method GET -Headers $adminHeaders
$searchResponse | ConvertTo-Json -Depth 10

$detailResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId" -Method GET -Headers $adminHeaders
$detailResponse | ConvertTo-Json -Depth 10

Assert-Condition ($null -ne $detailResponse.data) "Patient detail response missing data."
Assert-Condition ($detailResponse.data._id -eq $patientId) "Patient detail returned wrong patient."

Write-Section "Patient updates"
$updateAdminBody = @{
  full_name = "$patientName Updated By Admin"
  alternate_phone = [string]([long]$phones.alternate_phone + 10)
} | ConvertTo-Json

$updatedByAdmin = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId" -Method PUT -Headers $adminHeaders -ContentType "application/json" -Body $updateAdminBody
$updatedByAdmin | ConvertTo-Json -Depth 10

$updateReceptionBody = @{
  full_name = "$patientName Updated By Reception"
} | ConvertTo-Json

$updatedByReception = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId" -Method PUT -Headers $receptionHeaders -ContentType "application/json" -Body $updateReceptionBody
$updatedByReception | ConvertTo-Json -Depth 10

Write-Section "Duplicate registration check"
$duplicateBody = @{
  full_name = "Patient Regression Duplicate"
  date_of_birth = "1994-04-01"
  phone = $phones.phone
} | ConvertTo-Json

Assert-BlockedRequest -Label "Duplicate patient registration" -ExpectedStatusCodes @(409) -ScriptBlock {
  Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method POST -Headers $adminHeaders -ContentType "application/json" -Body $duplicateBody
}

Write-Section "Category flow"
$categoryBody = @{
  category = "pregnancy"
  reason = "Regression verification"
} | ConvertTo-Json

$categoryUpdate = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId/category" -Method PATCH -Headers $doctorHeaders -ContentType "application/json" -Body $categoryBody
$categoryUpdate | ConvertTo-Json -Depth 10

$categoryHistory = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId/category-history" -Method GET -Headers $doctorHeaders
$categoryHistory | ConvertTo-Json -Depth 10

$categoryCounts = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/category-counts" -Method GET -Headers $doctorHeaders
$categoryCounts | ConvertTo-Json -Depth 10

Assert-Condition ($null -ne $categoryCounts.data) "Category counts response missing data."
Assert-Condition ($categoryCounts.data.total -ge 1) "Category counts total should be at least 1."

Write-Section "RBAC checks"
$doctorUpdateBody = @{
  full_name = "Doctor Should Not Update"
} | ConvertTo-Json

Assert-BlockedRequest -Label "Doctor normal patient update" -ExpectedStatusCodes @(403) -ScriptBlock {
  Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId" -Method PUT -Headers $doctorHeaders -ContentType "application/json" -Body $doctorUpdateBody
}

Assert-BlockedRequest -Label "Receptionist category update" -ExpectedStatusCodes @(403) -ScriptBlock {
  Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId/category" -Method PATCH -Headers $receptionHeaders -ContentType "application/json" -Body $categoryBody
}

Write-Section "Patient hub"
$patientHub = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId/hub" -Method GET -Headers $adminHeaders
$patientHub | ConvertTo-Json -Depth 10

Assert-Condition ($null -ne $patientHub.data) "Patient hub response missing data."

Write-Section "Verification complete"
Write-Host "Patient API regression verification completed successfully."