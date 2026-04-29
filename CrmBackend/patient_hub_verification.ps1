param(
  [string]$BaseUrl = "http://localhost:8082",
  [string]$AdminEmail = "dev.admin@gynecrm.com",
  [string]$ReceptionEmail = "dev.reception@gynecrm.com",
  [string]$DoctorEmail = "dev.doctor@gynecrm.com",
  [string]$Password = "Dev@12345"
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

function Login-And-GetToken {
  param(
    [string]$Email,
    [string]$UserPassword
  )

  $body = @{
    email = $Email
    password = $UserPassword
  } | ConvertTo-Json

  $response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

  Assert-Condition ($null -ne $response) "Login response is null for $Email"
  Assert-Condition ($null -ne $response.data) "Login response missing data for $Email"
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($response.data.access_token)) "Login response missing access_token for $Email"

  return $response.data.access_token
}

function Get-Headers {
  param([string]$Token)

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($Token)) "Bearer token is missing."

  return @{
    Authorization = "Bearer $Token"
  }
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
    [int[]]$ExpectedStatusCodes = @(400, 403, 404, 409)
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

Write-Section "Health checks"
$health1 = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
$health2 = Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -Method GET
$health1 | ConvertTo-Json -Depth 10
$health2 | ConvertTo-Json -Depth 10

Write-Section "Login and capture tokens"
$adminToken = Login-And-GetToken -Email $AdminEmail -UserPassword $Password
$doctorToken = Login-And-GetToken -Email $DoctorEmail -UserPassword $Password
$receptionToken = Login-And-GetToken -Email $ReceptionEmail -UserPassword $Password

Write-Host "Admin login success."
Write-Host "Doctor login success."
Write-Host "Receptionist login success."

$adminHeaders = Get-Headers -Token $adminToken
$doctorHeaders = Get-Headers -Token $doctorToken
$receptionHeaders = Get-Headers -Token $receptionToken

Write-Section "Patient registration"
$phones = New-PatientPhoneSet
$patientName = "Phase43 Patient $(Get-Date -Format 'yyyyMMddHHmmss')"

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
    existing_conditions = @("None")
    allergies = @("None")
    current_medications = @("None")
    surgical_history = "None"
    notes = "Phase 4.3 verification"
  }
} | ConvertTo-Json -Depth 10

$createdPatient = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients" `
  -Method POST `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $registerBody

Assert-Condition ($null -ne $createdPatient) "Patient create response is null."
Assert-Condition ($null -ne $createdPatient.data) "Patient create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($createdPatient.data._id)) "Patient create response missing data._id."

$patientId = $createdPatient.data._id
Write-Host "Patient created successfully: $patientId"

Write-Section "Patient regression checks"
$listNoQuery = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method GET -Headers $adminHeaders
$listSearch = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients?search=Phase43" -Method GET -Headers $adminHeaders
$listCategory = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients?category=uncategorized" -Method GET -Headers $adminHeaders
$listPagination = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients?page=1&limit=10" -Method GET -Headers $adminHeaders

$listNoQuery | ConvertTo-Json -Depth 10
$listSearch | ConvertTo-Json -Depth 10
$listCategory | ConvertTo-Json -Depth 10
$listPagination | ConvertTo-Json -Depth 10

$patientDetail = Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId" -Method GET -Headers $adminHeaders
$patientDetail | ConvertTo-Json -Depth 10

$updateBodyAdmin = @{
  full_name = "$patientName Updated By Admin"
  alternate_phone = [string]([long]$phones.alternate_phone + 10)
} | ConvertTo-Json

$updatedByAdmin = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId" `
  -Method PUT `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $updateBodyAdmin

$updatedByAdmin | ConvertTo-Json -Depth 10

Write-Section "Duplicate registration regression"
$duplicateBody = @{
  full_name = "Phase43 Duplicate Patient"
  date_of_birth = "1994-04-01"
  phone = $phones.phone
} | ConvertTo-Json

Assert-BlockedRequest `
  -Label "Duplicate patient registration" `
  -ExpectedStatusCodes @(409) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/patients" `
      -Method POST `
      -Headers $adminHeaders `
      -ContentType "application/json" `
      -Body $duplicateBody
  }

Write-Section "Category update / history / counts"
$categoryBody = @{
  category = "pregnancy"
  reason = "Phase 4.3 verification"
} | ConvertTo-Json

$categoryUpdate = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/category" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $categoryBody

$categoryUpdate | ConvertTo-Json -Depth 10

$categoryHistory = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/category-history" `
  -Method GET `
  -Headers $doctorHeaders

$categoryHistory | ConvertTo-Json -Depth 10

$categoryCounts = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/category-counts" `
  -Method GET `
  -Headers $doctorHeaders

$categoryCounts | ConvertTo-Json -Depth 10

Assert-Condition ($null -ne $categoryCounts.data) "Category counts response missing data."
Assert-Condition ($null -ne $categoryCounts.data.counts) "Category counts response missing counts block."
Assert-Condition ([int]$categoryCounts.data.counts.pregnancy -ge 1) "Category counts did not reflect the pregnancy update."

Write-Section "Patient hub - admin"
$hubAdmin = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/hub" `
  -Method GET `
  -Headers $adminHeaders

$hubAdmin | ConvertTo-Json -Depth 10

Assert-Condition ($null -ne $hubAdmin.data) "Hub response missing data for admin."
Assert-Condition ($null -ne $hubAdmin.data.patient) "Hub response missing patient block."
Assert-Condition ($null -ne $hubAdmin.data.category) "Hub response missing category block."
Assert-Condition ($null -ne $hubAdmin.data.summary) "Hub response missing summary block."
Assert-Condition ($null -ne $hubAdmin.data.recent_appointments) "Hub response missing recent_appointments block."

Write-Section "Patient hub - doctor"
$hubDoctor = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/hub" `
  -Method GET `
  -Headers $doctorHeaders

$hubDoctor | ConvertTo-Json -Depth 10
Assert-Condition ($null -ne $hubDoctor.data) "Hub response missing data for doctor."

Write-Section "Patient hub - receptionist"
$hubReception = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/hub" `
  -Method GET `
  -Headers $receptionHeaders

$hubReception | ConvertTo-Json -Depth 10
Assert-Condition ($null -ne $hubReception.data) "Hub response missing data for receptionist."

Write-Section "Patient hub invalid-id / not-found checks"
Assert-BlockedRequest `
  -Label "Patient hub invalid ObjectId" `
  -ExpectedStatusCodes @(400) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/patients/invalid-id/hub" `
      -Method GET `
      -Headers $adminHeaders
  }

$missingPatientId = "000000000000000000000000"

Assert-BlockedRequest `
  -Label "Patient hub not found" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/patients/$missingPatientId/hub" `
      -Method GET `
      -Headers $adminHeaders
  }

Write-Section "RBAC regression checks"
$doctorNormalUpdateBody = @{
  full_name = "Doctor Should Not Update"
} | ConvertTo-Json

Assert-BlockedRequest `
  -Label "Doctor normal patient update" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/patients/$patientId" `
      -Method PUT `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $doctorNormalUpdateBody
  }

Assert-BlockedRequest `
  -Label "Receptionist category update" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/patients/$patientId/category" `
      -Method PATCH `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $categoryBody
  }

Write-Section "Out-of-scope route lock checks"
Assert-BlockedRequest `
  -Label "Consultations route" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/consultations" `
      -Method GET `
      -Headers $adminHeaders
  }

Assert-BlockedRequest `
  -Label "Billing route" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing" `
      -Method GET `
      -Headers $adminHeaders
  }

Write-Section "Batch 4.3 close confirmation"
Write-Host "All Batch 4.3 verification sections completed."
Write-Host "Move ahead only after all expected checks above pass cleanly."