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

function Show-Json($value) {
  $value | ConvertTo-Json -Depth 10
}

function Run-NpmScript($scriptName) {
  Write-Host "Running: npm run $scriptName"
  Push-Location $ProjectRoot
  try {
    npm run $scriptName
    if ($LASTEXITCODE -ne 0) {
      throw "npm run $scriptName failed with exit code $LASTEXITCODE"
    }
  }
  finally {
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
    }
    catch {
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

  $body = @{
    email = $Email
    password = $UserPassword
  } | ConvertTo-Json

  $response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

  Assert-Condition ($null -ne $response) "Login response was null for $Email"
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
  }
  catch {
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
  }
  catch {
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

function New-IsoUtcString {
  param(
    [int]$HoursOffset = 0,
    [int]$DaysOffset = 0
  )

  return (Get-Date).ToUniversalTime().AddHours($HoursOffset).AddDays($DaysOffset).ToString("o")
}

function Escape-QueryValue {
  param([string]$Value)

  return [Uri]::EscapeDataString($Value)
}

Write-Section "Preparation"
Run-NpmScript -scriptName "seed:reference-data"
Run-NpmScript -scriptName "seed:auth-users"

Write-Section "Runtime start"
Start-RuntimeIfNeeded
Write-Host "If you see EADDRINUSE on port 8082, another local process is already using that port."
Write-Host "Do not start the runtime twice."
Wait-ForHealth -Url "$BaseUrl/health"

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

Write-Section "Health routes"
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -Method GET)

Write-Section "Doctors and masters smoke checks"
$doctorList = Invoke-RestMethod -Uri "$BaseUrl/api/v1/doctors" -Method GET -Headers $adminHeaders
Show-Json $doctorList

$doctorItems = @($doctorList.data)
Assert-Condition ($doctorItems.Count -gt 0) "Doctor list returned no usable doctors."

$doctorId = $doctorItems[0]._id
Write-Host "Using doctor_id: $doctorId"

$appointmentTypeList = Invoke-RestMethod -Uri "$BaseUrl/api/v1/masters/appointment-types" -Method GET -Headers $adminHeaders
Show-Json $appointmentTypeList

$appointmentTypeItems = @($appointmentTypeList.data)
Assert-Condition ($appointmentTypeItems.Count -gt 0) "Appointment type list returned no usable records."

$appointmentTypeId = $appointmentTypeItems[0]._id
Write-Host "Using appointment_type_id: $appointmentTypeId"

Write-Section "Patient registration for workflow tests"
$phones = New-PatientPhoneSet
$patientName = "GyneCRM Verify Patient $(Get-Date -Format 'yyyyMMddHHmmss')"

$registerBody = @{
  full_name = $patientName
  date_of_birth = "1995-05-21"
  phone = $phones.phone
  alternate_phone = $phones.alternate_phone
  blood_group = "O+"
  family_whatsapp = $phones.family_whatsapp
  address = @{
    line_1 = "Verification Street"
    city = "Chennai"
    state = "Tamil Nadu"
    postal_code = "600001"
  }
  emergency_contact = @{
    name = "Verification Contact"
    relation = "Spouse"
    phone = $phones.emergency_phone
  }
  medical_history = @{
    allergies = "None"
    current_medications = "None"
    surgical_history = "None"
    notes = "Verification run"
  }
} | ConvertTo-Json -Depth 10

$createdPatient = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients" `
  -Method POST `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $registerBody

Assert-Condition ($null -ne $createdPatient.data) "Patient create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($createdPatient.data._id)) "Patient create response missing patient _id."

$patientId = $createdPatient.data._id
Write-Host "Using patient_id: $patientId"

Write-Section "Patient regression smoke checks"
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/patients/$patientId" -Method GET -Headers $adminHeaders)

$patientUpdateBody = @{
  full_name = "$patientName Updated"
} | ConvertTo-Json

Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/patients/$patientId" `
    -Method PUT `
    -Headers $receptionHeaders `
    -ContentType "application/json" `
    -Body $patientUpdateBody
)

$categoryBody = @{
  category = "pregnancy"
  reason = "Workflow regression check"
} | ConvertTo-Json

Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/patients/$patientId/category" `
    -Method PATCH `
    -Headers $doctorHeaders `
    -ContentType "application/json" `
    -Body $categoryBody
)

$categoryHistory = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/category-history" `
  -Method GET `
  -Headers $doctorHeaders
Show-Json $categoryHistory

$categoryCounts = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/category-counts" `
  -Method GET `
  -Headers $doctorHeaders
Show-Json $categoryCounts

if ($categoryCounts.data -and $categoryCounts.data.counts) {
  Assert-Condition ([int]$categoryCounts.data.counts.pregnancy -ge 1) "Patient category counts did not reflect the pregnancy update."
}

Write-Section "Appointment create"
$appointmentScheduled1 = New-IsoUtcString -HoursOffset 4

$createAppointmentBody1 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentScheduled1
  duration_minutes = 20
  visit_type = "new"
  reason_for_visit = "Appointment create test"
  notes = "Appointment 1"
} | ConvertTo-Json -Depth 10

$appointment1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $createAppointmentBody1

Assert-Condition ($null -ne $appointment1.data) "Appointment create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($appointment1.data._id)) "Appointment create response missing _id."

$appointmentId1 = $appointment1.data._id
Write-Host "Created appointmentId1: $appointmentId1"
Show-Json $appointment1

Write-Section "Appointment duplicate conflict check"
Assert-BlockedRequest `
  -Label "Duplicate doctor same-time appointment" `
  -ExpectedStatusCodes @(409) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments" `
      -Method POST `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $createAppointmentBody1
  }

Write-Section "Appointment list and filter checks"
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments?doctor_id=$doctorId" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments?patient_id=$patientId" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments?appointment_type_id=$appointmentTypeId" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments?status=scheduled" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments?page=1&limit=10" -Method GET -Headers $adminHeaders)

$rangeFrom = Escape-QueryValue (New-IsoUtcString -HoursOffset 2)
$rangeTo = Escape-QueryValue (New-IsoUtcString -DaysOffset 1)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments?scheduled_from=$rangeFrom&scheduled_to=$rangeTo" -Method GET -Headers $adminHeaders)

Write-Section "Appointment detail"
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments/$appointmentId1" -Method GET -Headers $adminHeaders)

Write-Section "Appointment check-in"
$checkInResponse = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/$appointmentId1/check-in" `
  -Method PATCH `
  -Headers $receptionHeaders
Show-Json $checkInResponse

Assert-BlockedRequest `
  -Label "Repeat check-in blocked" `
  -ExpectedStatusCodes @(409) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/$appointmentId1/check-in" `
      -Method PATCH `
      -Headers $receptionHeaders
  }

Write-Section "Appointment cancel path"
$appointmentScheduled2 = New-IsoUtcString -HoursOffset 6
$createAppointmentBody2 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentScheduled2
  duration_minutes = 15
  visit_type = "follow_up"
  reason_for_visit = "Cancel test"
  notes = "Appointment 2"
} | ConvertTo-Json -Depth 10

$appointment2 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $createAppointmentBody2

Assert-Condition ($null -ne $appointment2.data) "Appointment 2 create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($appointment2.data._id)) "Appointment 2 create response missing _id."

$appointmentId2 = $appointment2.data._id
Write-Host "Created appointmentId2: $appointmentId2"

$cancelBody = @{
  status = "cancelled"
  cancellation_reason = "Verification cancellation"
} | ConvertTo-Json

Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/appointments/$appointmentId2/status" `
    -Method PATCH `
    -Headers $adminHeaders `
    -ContentType "application/json" `
    -Body $cancelBody
)

Write-Section "Appointment no_show path"
$appointmentScheduled3 = New-IsoUtcString -HoursOffset 8
$createAppointmentBody3 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentScheduled3
  duration_minutes = 25
  visit_type = "review"
  reason_for_visit = "No-show test"
  notes = "Appointment 3"
} | ConvertTo-Json -Depth 10

$appointment3 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $createAppointmentBody3

Assert-Condition ($null -ne $appointment3.data) "Appointment 3 create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($appointment3.data._id)) "Appointment 3 create response missing _id."

$appointmentId3 = $appointment3.data._id
Write-Host "Created appointmentId3: $appointmentId3"

$noShowBody = @{
  status = "no_show"
} | ConvertTo-Json

Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/appointments/$appointmentId3/status" `
    -Method PATCH `
    -Headers $receptionHeaders `
    -ContentType "application/json" `
    -Body $noShowBody
)

Write-Section "Appointment reschedule path"
$appointmentScheduled4 = New-IsoUtcString -HoursOffset 10
$createAppointmentBody4 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentScheduled4
  duration_minutes = 30
  visit_type = "procedure"
  reason_for_visit = "Reschedule test"
  notes = "Appointment 4"
} | ConvertTo-Json -Depth 10

$appointment4 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $createAppointmentBody4

Assert-Condition ($null -ne $appointment4.data) "Appointment 4 create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($appointment4.data._id)) "Appointment 4 create response missing _id."

$appointmentId4 = $appointment4.data._id
Write-Host "Created appointmentId4: $appointmentId4"

$newRescheduleTime = New-IsoUtcString -HoursOffset 12
$rescheduleBody = @{
  scheduled_at = $newRescheduleTime
  duration_minutes = 35
  reschedule_reason = "Patient requested later slot"
  notes = "Rescheduled by verification script"
} | ConvertTo-Json -Depth 10

Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/appointments/$appointmentId4/reschedule" `
    -Method PATCH `
    -Headers $receptionHeaders `
    -ContentType "application/json" `
    -Body $rescheduleBody
)

Write-Section "Waitlist create"
$desiredDateRaw = New-IsoUtcString -DaysOffset 1
$waitlistBody1 = @{
  patient_id = $patientId
  preferred_doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  desired_date = $desiredDateRaw
  preferred_time_range = @{
    start_time = "10:00"
    end_time = "12:00"
    label = "Morning"
  }
  reason_for_visit = "Waitlist creation test"
  notes = "Waitlist 1"
  priority = "normal"
} | ConvertTo-Json -Depth 10

$waitlist1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/waitlist" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $waitlistBody1

Assert-Condition ($null -ne $waitlist1.data) "Waitlist create response missing data."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($waitlist1.data._id)) "Waitlist create response missing _id."

$waitlistId1 = $waitlist1.data._id
Write-Host "Created waitlistId1: $waitlistId1"
Show-Json $waitlist1

Write-Section "Waitlist list and filters"
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments/waitlist" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments/waitlist?status=waiting" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments/waitlist?preferred_doctor_id=$doctorId" -Method GET -Headers $adminHeaders)
$desiredDateEscaped = Escape-QueryValue $desiredDateRaw
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments/waitlist?desired_date=$desiredDateEscaped" -Method GET -Headers $adminHeaders)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/appointments/waitlist?priority=normal" -Method GET -Headers $adminHeaders)

Write-Section "Waitlist status update"
$waitlistStatusBody = @{
  status = "contacted"
  notes = "Patient contacted by reception"
} | ConvertTo-Json

Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/appointments/waitlist/$waitlistId1/status" `
    -Method PATCH `
    -Headers $receptionHeaders `
    -ContentType "application/json" `
    -Body $waitlistStatusBody
)

Write-Section "Receptionist dashboard"
Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/dashboard/receptionist" `
    -Method GET `
    -Headers $receptionHeaders
)

$dashboardDate = Escape-QueryValue (New-IsoUtcString)
Show-Json (
  Invoke-RestMethod `
    -Uri "$BaseUrl/api/v1/dashboard/receptionist?date=$dashboardDate" `
    -Method GET `
    -Headers $adminHeaders
)

Write-Section "RBAC checks for write routes"
Assert-BlockedRequest `
  -Label "Doctor appointment create" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments" `
      -Method POST `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $createAppointmentBody1
  }

Assert-BlockedRequest `
  -Label "Doctor appointment status update" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/$appointmentId2/status" `
      -Method PATCH `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $cancelBody
  }

Assert-BlockedRequest `
  -Label "Doctor appointment check-in" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/$appointmentId2/check-in" `
      -Method PATCH `
      -Headers $doctorHeaders
  }

Assert-BlockedRequest `
  -Label "Doctor appointment reschedule" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/$appointmentId2/reschedule" `
      -Method PATCH `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $rescheduleBody
  }

Assert-BlockedRequest `
  -Label "Doctor waitlist list" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/waitlist" `
      -Method GET `
      -Headers $doctorHeaders
  }

Assert-BlockedRequest `
  -Label "Doctor waitlist create" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/waitlist" `
      -Method POST `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $waitlistBody1
  }

Assert-BlockedRequest `
  -Label "Doctor waitlist status update" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/waitlist/$waitlistId1/status" `
      -Method PATCH `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $waitlistStatusBody
  }

Assert-BlockedRequest `
  -Label "Doctor receptionist dashboard" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/dashboard/receptionist" `
      -Method GET `
      -Headers $doctorHeaders
  }

Write-Section "Future route lock checks"
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

Assert-BlockedRequest `
  -Label "Analytics route" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/analytics" `
      -Method GET `
      -Headers $adminHeaders
  }

Assert-BlockedRequest `
  -Label "Waitlist convert route not exposed" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/appointments/waitlist/$waitlistId1/convert" `
      -Method PATCH `
      -Headers $adminHeaders `
      -ContentType "application/json" `
      -Body "{}"
  }

Write-Section "Verification complete"
Write-Host "All verification sections completed."
Write-Host "Move to next phase only after every section above passes cleanly."