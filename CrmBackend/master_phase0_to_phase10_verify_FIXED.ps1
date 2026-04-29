param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$BaseUrl = "http://localhost:8083",
  [string]$AdminEmail = "dev.admin@gynecrm.com",
  [string]$ReceptionEmail = "dev.reception@gynecrm.com",
  [string]$DoctorEmail = "dev.doctor@gynecrm.com",
  [string]$Password = "Dev@12345",
  [switch]$StartRuntime
)

$ErrorActionPreference = "Stop"

function Write-Section($title) {
  Write-Host ""
  Write-Host "===================================================="
  Write-Host $title
  Write-Host "===================================================="
}

function Show-Json($value) {
  $value | ConvertTo-Json -Depth 20
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
  Start-Sleep -Seconds 6
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
    [int[]]$ExpectedStatusCodes = @(400, 403, 404, 405, 409, 422)
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

function New-IsoUtcString {
  param(
    [int]$HoursOffset = 0,
    [int]$DaysOffset = 0
  )

  return (Get-Date).ToUniversalTime().AddHours($HoursOffset).AddDays($DaysOffset).ToString("o")
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

function Get-Headers {
  param([string]$Token)

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($Token)) "Bearer token is missing."

  return @{
    Authorization = "Bearer $Token"
  }
}

function Login-Session {
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

  Assert-Condition ($null -ne $response.data) "Login response missing data for $Email"
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($response.data.access_token)) "Login response missing access_token for $Email"

  $user = $null
  if ($response.data.user) {
    $user = $response.data.user
  }
  elseif ($response.data.profile) {
    $user = $response.data.profile
  }

  return @{
    Email = $Email
    Token = $response.data.access_token
    User = $user
    Raw = $response
  }
}

function Normalize-Collection {
  param($Response)

  $items = @()

  if ($null -eq $Response) {
    return ,$items
  }

  if ($null -ne $Response.data) {
    if ($Response.data -is [System.Array]) {
      $items = @($Response.data)
      return ,$items
    }

    if ($null -ne $Response.data.items) {
      if ($Response.data.items -is [System.Array]) {
        $items = @($Response.data.items)
        return ,$items
      }

      $items = @($Response.data.items)
      return ,$items
    }

    $items = @($Response.data)
    return ,$items
  }

  if ($null -ne $Response.items) {
    if ($Response.items -is [System.Array]) {
      $items = @($Response.items)
      return ,$items
    }

    $items = @($Response.items)
    return ,$items
  }

  return ,$items
}

function Invoke-FirstRestMethod {
  param(
    [string[]]$Urls,
    [string]$Method,
    [hashtable]$Headers = $null,
    [string]$ContentType = $null,
    [string]$Body = $null
  )

  $errors = @()

  foreach ($url in $Urls) {
    try {
      if ($null -ne $Body -and $null -ne $ContentType) {
        return Invoke-RestMethod -Uri $url -Method $Method -Headers $Headers -ContentType $ContentType -Body $Body
      }
      elseif ($null -ne $ContentType) {
        return Invoke-RestMethod -Uri $url -Method $Method -Headers $Headers -ContentType $ContentType
      }
      else {
        return Invoke-RestMethod -Uri $url -Method $Method -Headers $Headers
      }
    }
    catch {
      $statusCode = $null
      $responseBody = $null

      try {
        if ($_.Exception.Response) {
          $statusCode = [int]$_.Exception.Response.StatusCode
          $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
          $responseBody = $reader.ReadToEnd()
        }
      }
      catch {
      }

      $errors += "$url => status=$statusCode body=$responseBody"
    }
  }

  throw "No candidate endpoint worked. Tried: $($errors -join ' | ')"
}

function Invoke-FirstWebRequest {
  param(
    [string[]]$Urls,
    [string]$Method,
    [hashtable]$Headers = $null,
    [string]$ContentType = $null,
    [string]$Body = $null
  )

  $errors = @()

  foreach ($url in $Urls) {
    try {
      if ($null -ne $Body -and $null -ne $ContentType) {
        return Invoke-WebRequest -Uri $url -Method $Method -Headers $Headers -ContentType $ContentType -Body $Body
      }
      elseif ($null -ne $ContentType) {
        return Invoke-WebRequest -Uri $url -Method $Method -Headers $Headers -ContentType $ContentType
      }
      else {
        return Invoke-WebRequest -Uri $url -Method $Method -Headers $Headers
      }
    }
    catch {
      $code = Get-StatusCodeFromError $_
      $errors += "$url => $code"
    }
  }

  throw "No candidate web endpoint worked. Tried: $($errors -join ' | ')"
}

function Extract-HospitalId {
  param(
    $AdminSession,
    $DoctorListResponse
  )

  if ($AdminSession.User -and $AdminSession.User.hospital_id) {
    return [string]$AdminSession.User.hospital_id
  }

$doctorItems = @(Normalize-Collection $DoctorListResponse)
if ($doctorItems.Length -gt 0 -and $doctorItems[0].hospital_id) {
    return [string]$doctorItems[0].hospital_id
  }

  return $null
}

Write-Section "Preparation"
Run-NpmScript -scriptName "seed:reference-data"
Run-NpmScript -scriptName "seed:auth-users"

Write-Section "Runtime start"
Start-RuntimeIfNeeded
Write-Host "If the runtime is already running, keep that window open."
Wait-ForHealth -Url "$BaseUrl/health"

Write-Section "Phase 0 / Phase 1 - Auth foundation"
$adminSession = Login-Session -Email $AdminEmail -UserPassword $Password
$doctorSession = Login-Session -Email $DoctorEmail -UserPassword $Password
$receptionSession = Login-Session -Email $ReceptionEmail -UserPassword $Password

$adminHeaders = Get-Headers -Token $adminSession.Token
$doctorHeaders = Get-Headers -Token $doctorSession.Token
$receptionHeaders = Get-Headers -Token $receptionSession.Token

Write-Host "Admin login success."
Write-Host "Doctor login success."
Write-Host "Receptionist login success."

Show-Json (Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET)
Show-Json (Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -Method GET)

Assert-BlockedRequest `
  -Label "Protected doctors route without token" `
  -ExpectedStatusCodes @(401, 403) `
  -ScriptBlock {
    Invoke-RestMethod -Uri "$BaseUrl/api/v1/doctors" -Method GET
  }

Assert-BlockedRequest `
  -Label "Invalid login blocked" `
  -ExpectedStatusCodes @(400, 401, 422) `
  -ScriptBlock {
    $badBody = @{
      email = $AdminEmail
      password = "WrongPassword123"
    } | ConvertTo-Json

    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/auth/login" `
      -Method POST `
      -ContentType "application/json" `
      -Body $badBody
  }

Write-Section "Phase 2 - Doctors and masters foundation"
$doctorList = Invoke-RestMethod -Uri "$BaseUrl/api/v1/doctors" -Method GET -Headers $adminHeaders
Show-Json $doctorList

$doctorItems = @(Normalize-Collection $doctorList)
Assert-Condition ($doctorItems.Length -gt 0) "Doctor list returned no usable doctors."

$doctorId = [string]$doctorItems[0]._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($doctorId)) "Doctor _id missing."

$doctorDetail = Invoke-RestMethod -Uri "$BaseUrl/api/v1/doctors/$doctorId" -Method GET -Headers $adminHeaders
Show-Json $doctorDetail

$hospitalId = Extract-HospitalId -AdminSession $adminSession -DoctorListResponse $doctorList
Assert-Condition (-not [string]::IsNullOrWhiteSpace($hospitalId)) "Could not determine hospital_id."

$appointmentTypes = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/masters/appointment-types?hospital_id=$hospitalId" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $appointmentTypes

$appointmentTypeItems = @(Normalize-Collection $appointmentTypes)
Assert-Condition ($appointmentTypeItems.Length -gt 0) "Appointment type master list is empty."

$appointmentTypeId = [string]$appointmentTypeItems[0]._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($appointmentTypeId)) "Appointment type _id missing."
Write-Host "Using appointment_type_id: $appointmentTypeId"

$testCatalogList = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/masters/test-catalog?hospital_id=$hospitalId" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $testCatalogList

$testCatalogItems = @(Normalize-Collection $testCatalogList)
Assert-Condition ($testCatalogItems.Length -gt 0) "Test catalog master list is empty."

$testCatalogId = [string]$testCatalogItems[0]._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($testCatalogId)) "Test catalog _id missing."
Write-Host "Using test_catalog_id: $testCatalogId"

Write-Section "Phase 3 - Patient workflow"
$phones = New-PatientPhoneSet
$patientName = "Master Verify Patient $(Get-Date -Format 'yyyyMMddHHmmss')"

$registerPatientBody = @{
  full_name = $patientName
  date_of_birth = "1994-08-12"
  phone = $phones.phone
  alternate_phone = $phones.alternate_phone
  family_whatsapp = $phones.family_whatsapp
  blood_group = "O+"
  address = @{
    line_1 = "Master Verification Street"
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
    notes = "Master regression verification"
  }
} | ConvertTo-Json -Depth 12

$createdPatient = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients" `
  -Method POST `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $registerPatientBody

Show-Json $createdPatient

$patientId = [string]$createdPatient.data._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($patientId)) "Patient create response missing _id."

$patientList = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients?page=1&limit=20" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $patientList

$patientDetail = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $patientDetail

$patientUpdateBody = @{
  alternate_phone = [string]([long]$phones.alternate_phone + 10)
  family_whatsapp = [string]([long]$phones.family_whatsapp + 10)
  address = @{
    line_1 = "Master Verification Street Updated"
    city = "Chennai"
    state = "Tamil Nadu"
    postal_code = "600002"
  }
  emergency_contact = @{
    name = "Verification Contact Updated"
    relation = "Spouse"
    phone = [string]([long]$phones.emergency_phone + 10)
  }
} | ConvertTo-Json -Depth 12

$patientUpdated = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId" `
  -Method PUT `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $patientUpdateBody

Show-Json $patientUpdated

$categoryUpdateBody = @{
  category = "pregnancy"
  reason = "Testing category workflow"
} | ConvertTo-Json -Depth 12

$categoryUpdate = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/category" `
  -Method PATCH `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $categoryUpdateBody

Show-Json $categoryUpdate

$categoryHistory = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/$patientId/category-history" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $categoryHistory

$categoryCounts = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/patients/category-counts" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $categoryCounts

Write-Section "Phase 5 - Appointment workflow"
$appointmentTime1 = New-IsoUtcString -HoursOffset 4
$appointmentTime2 = New-IsoUtcString -HoursOffset 6
$appointmentTime3 = New-IsoUtcString -HoursOffset 8

$appointmentBody1 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentTime1
  duration_minutes = 30
  visit_type = "new"
  reason_for_visit = "Master appointment check-in"
} | ConvertTo-Json -Depth 12

$appointment1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $appointmentBody1

Show-Json $appointment1
$appointmentId1 = [string]$appointment1.data._id

$appointmentBody2 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentTime2
  duration_minutes = 30
  visit_type = "follow_up"
  reason_for_visit = "Master appointment reschedule"
} | ConvertTo-Json -Depth 12

$appointment2 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $appointmentBody2

Show-Json $appointment2
$appointmentId2 = [string]$appointment2.data._id

$appointmentBody3 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  scheduled_at = $appointmentTime3
  duration_minutes = 30
  visit_type = "follow_up"
  reason_for_visit = "Master appointment cancel"
} | ConvertTo-Json -Depth 12

$appointment3 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $appointmentBody3

Show-Json $appointment3
$appointmentId3 = [string]$appointment3.data._id

$appointmentList = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments?patient_id=$patientId&doctor_id=$doctorId&page=1&limit=20" `
  -Method GET `
  -Headers $receptionHeaders

Show-Json $appointmentList

$appointmentDetail1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/$appointmentId1" `
  -Method GET `
  -Headers $receptionHeaders

Show-Json $appointmentDetail1

$checkInResponse = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/$appointmentId1/check-in" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body "{}"

Show-Json $checkInResponse

$rescheduleBody = @{
  scheduled_at = New-IsoUtcString -HoursOffset 12
} | ConvertTo-Json -Depth 12

$rescheduleResponse = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/$appointmentId2/reschedule" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $rescheduleBody

Show-Json $rescheduleResponse

$cancelBody = @{
  status = "cancelled"
  cancellation_reason = "Master regression cancellation"
} | ConvertTo-Json -Depth 12

$cancelResponse = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/$appointmentId3/status" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $cancelBody

Show-Json $cancelResponse

$waitlistBody = @{
  patient_id = $patientId
  preferred_doctor_id = $doctorId
  appointment_type_id = $appointmentTypeId
  desired_date = New-IsoUtcString -DaysOffset 1
  preferred_time_range = @{
    start_time = "10:00"
    end_time = "12:00"
    label = "Morning"
  }
  reason_for_visit = "Master waitlist check"
  priority = "normal"
  notes = "Master regression waitlist"
} | ConvertTo-Json -Depth 12

$waitlistCreate = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/waitlist" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $waitlistBody

Show-Json $waitlistCreate
$waitlistId = [string]$waitlistCreate.data._id

$waitlistList = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/waitlist?preferred_doctor_id=$doctorId&page=1&limit=20" `
  -Method GET `
  -Headers $receptionHeaders

Show-Json $waitlistList

$waitlistStatusBody = @{
  status = "contacted"
} | ConvertTo-Json -Depth 12

$waitlistStatus = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/appointments/waitlist/$waitlistId/status" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $waitlistStatusBody

Show-Json $waitlistStatus

$dashboardReception = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/dashboard/receptionist" `
  -Method GET `
  -Headers $receptionHeaders

Show-Json $dashboardReception

Write-Section "Phase 6 - Consultation workflow"
$consultationBody = @{
  patient_id = $patientId
  doctor_id = $doctorId
  chief_complaint = "Acidity and nausea"
  history_of_present_illness = "Burning sensation for two days"
  diagnosis = @{
    primary = "Acute gastritis"
    secondary = @("Acidity")
  }
  advice = "Hydration and dietary care"
  notes = "Master consultation setup"
  follow_up_required = $false
} | ConvertTo-Json -Depth 12

$consultation = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/consultations" `
  -Method POST `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $consultationBody

Show-Json $consultation
$consultationId = [string]$consultation.data._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($consultationId)) "Consultation create response missing _id."

$consultationDetail = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/consultations/$consultationId" `
  -Method GET `
  -Headers $doctorHeaders

Show-Json $consultationDetail

$consultationUpdateBody = @{
  advice = "Updated consultation advice"
  notes = "Updated consultation notes"
} | ConvertTo-Json -Depth 12

$consultationUpdated = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/consultations/$consultationId" `
  -Method PUT `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $consultationUpdateBody

Show-Json $consultationUpdated

$consultationWorkspace = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/consultations/$consultationId/workspace" `
  -Method GET `
  -Headers $doctorHeaders

Show-Json $consultationWorkspace

Assert-BlockedRequest `
  -Label "Receptionist consultation create blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/consultations" `
      -Method POST `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $consultationBody
  }

Write-Section "Phase 7 - Pregnancy workflow"
$pregnancyCreateBody = @{
  patient_id = $patientId
  doctor_id = $doctorId
  source_consultation_id = $consultationId
  pregnancy_number = 1
  conception_type = "spontaneous"
  lmp_date = "2026-01-01T00:00:00.000Z"
  gravida = 2
  para = 1
  abortions = 0
  living_children = 1
  blood_group = "O+"
  rh_factor = "positive"
  pregnancy_notes = "Master pregnancy workflow"
  high_risk = $false
  milestones = @(
    @{
      code = "ANC_BOOKING"
      title = "ANC Booking"
      target_week = 8
      status = "pending"
    }
  )
} | ConvertTo-Json -Depth 12

$pregnancyCreate = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/pregnancies" `
  -Method POST `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $pregnancyCreateBody

Show-Json $pregnancyCreate
$pregnancyId = [string]$pregnancyCreate.data.pregnancy._id
if ([string]::IsNullOrWhiteSpace($pregnancyId)) {
  $pregnancyId = [string]$pregnancyCreate.data._id
}
Assert-Condition (-not [string]::IsNullOrWhiteSpace($pregnancyId)) "Pregnancy create response missing _id."

$pregnancyDetail = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/pregnancies/$pregnancyId" `
  -Method GET `
  -Headers $doctorHeaders

Show-Json $pregnancyDetail

$pregnancyUpdateBody = @{
  pregnancy_notes = "Pregnancy updated in master regression"
  gravida = 3
} | ConvertTo-Json -Depth 12

$pregnancyUpdated = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/pregnancies/$pregnancyId" `
  -Method PUT `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $pregnancyUpdateBody

Show-Json $pregnancyUpdated

$pregnancyHighRiskBody = @{
  high_risk = $true
  high_risk_flags = @(
    @{
      code = "HTN"
      label = "Hypertension"
      notes = "Monitor BP"
    }
  )
  high_risk_notes = "High-risk testing update"
} | ConvertTo-Json -Depth 12

$pregnancyHighRisk = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/pregnancies/$pregnancyId/high-risk" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $pregnancyHighRiskBody

Show-Json $pregnancyHighRisk

$pregnancyMilestonesBody = @{
  milestones = @(
    @{
      code = "USG_FIRST"
      title = "First Ultrasound"
      target_week = 12
      status = "pending"
      notes = "Schedule ultrasound"
    }
  )
} | ConvertTo-Json -Depth 12

$pregnancyMilestones = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/pregnancies/$pregnancyId/milestones" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $pregnancyMilestonesBody

Show-Json $pregnancyMilestones

$pregnancyMilestoneStatusBody = @{
  status = "completed"
  notes = "Completed in master regression"
} | ConvertTo-Json -Depth 12

$pregnancyMilestoneStatus = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/pregnancies/$pregnancyId/milestones/USG_FIRST/status" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $pregnancyMilestoneStatusBody

Show-Json $pregnancyMilestoneStatus

Assert-BlockedRequest `
  -Label "Receptionist pregnancy create blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/pregnancies" `
      -Method POST `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $pregnancyCreateBody
  }

Write-Section "Phase 8 - Prescription workflow"
$prescriptionBody1 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  consultation_id = $consultationId
  prescription_date = New-IsoUtcString
  diagnosis_summary = "Acute gastritis"
  advice_notes = "Hydration and rest"
  general_instructions = "Avoid spicy food"
  items = @(
    @{
      medicine_name = "Pantoprazole"
      generic_name = "Pantoprazole"
      formulation = "Tablet"
      strength = "40 mg"
      dose = "1 tablet"
      route = "oral"
      frequency = "OD"
      duration_value = 5
      duration_unit = "days"
      quantity = 5
      instructions = "Take before breakfast"
      before_food = $true
      morning = $true
      status = "active"
    }
  )
} | ConvertTo-Json -Depth 12

$prescription1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/prescriptions" `
  -Method POST `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $prescriptionBody1

Show-Json $prescription1
$prescriptionId1 = [string]$prescription1.data._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($prescriptionId1)) "Prescription 1 create response missing _id."

$prescriptionDetail1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/prescriptions/$prescriptionId1" `
  -Method GET `
  -Headers $doctorHeaders

Show-Json $prescriptionDetail1

$issuePrescription1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/prescriptions/$prescriptionId1/issue" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body "{}"

Show-Json $issuePrescription1

$prescriptionPdf1 = Invoke-WebRequest `
  -Uri "$BaseUrl/api/v1/prescriptions/$prescriptionId1/pdf" `
  -Method GET `
  -Headers $doctorHeaders

Write-Host "Prescription PDF endpoint content type: $($prescriptionPdf1.ContentType)"

$sendPrescriptionBody = @{
  send_channels = @("print", "whatsapp")
  send_notes = "Master prescription send"
} | ConvertTo-Json -Depth 12

$sendPrescription1 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/prescriptions/$prescriptionId1/send" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $sendPrescriptionBody

Show-Json $sendPrescription1

$prescriptionBody2 = @{
  patient_id = $patientId
  doctor_id = $doctorId
  consultation_id = $consultationId
  prescription_date = New-IsoUtcString
  diagnosis_summary = "Clinical correction case"
  advice_notes = "Second draft for void test"
  general_instructions = "Temporary"
  items = @(
    @{
      medicine_name = "Antacid Syrup"
      dose = "10 ml"
      route = "oral"
      frequency = "BD"
      duration_value = 3
      duration_unit = "days"
      quantity = 1
      instructions = "After food"
      after_food = $true
      morning = $true
      evening = $true
      status = "active"
    }
  )
} | ConvertTo-Json -Depth 12

$prescription2 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/prescriptions" `
  -Method POST `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $prescriptionBody2

Show-Json $prescription2
$prescriptionId2 = [string]$prescription2.data._id

$voidPrescriptionBody = @{
  void_reason = "Clinical correction"
} | ConvertTo-Json -Depth 12

$voidPrescription2 = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/prescriptions/$prescriptionId2/void" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $voidPrescriptionBody

Show-Json $voidPrescription2

Assert-BlockedRequest `
  -Label "Receptionist prescription create blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/prescriptions" `
      -Method POST `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $prescriptionBody1
  }

Write-Section "Phase 9 - Test order and document workflow"
$testOrderBody = @{
  patient_id = $patientId
  doctor_id = $doctorId
  consultation_id = $consultationId
  prescription_id = $prescriptionId1
  test_catalog_id = $testCatalogId
  priority = "routine"
  clinical_notes = "Master regression test order"
  indication = "Lab verification"
  specimen_type = "blood"
  expected_upload_at = New-IsoUtcString -DaysOffset 1
} | ConvertTo-Json -Depth 12

$testOrder = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/test-orders" `
  -Method POST `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $testOrderBody

Show-Json $testOrder
$testOrderId = [string]$testOrder.data._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($testOrderId)) "Test order create response missing _id."

$pendingUpload = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/test-orders/$testOrderId/pending-upload" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body "{}"

Show-Json $pendingUpload

$uploadUrlBody = @{
  document_type = "test_result"
  original_file_name = "hb-result.pdf"
  mime_type = "application/pdf"
  file_size_bytes = 12345
  test_order_id = $testOrderId
  storage_provider = "local"
} | ConvertTo-Json -Depth 12

$uploadUrl = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/documents/upload-url" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $uploadUrlBody

Show-Json $uploadUrl

$storageKey = $uploadUrl.data.storage_key
Assert-Condition (-not [string]::IsNullOrWhiteSpace($storageKey)) "Upload foundation storage_key missing."

$documentCreateBody = @{
  patient_id = $patientId
  doctor_id = $doctorId
  consultation_id = $consultationId
  prescription_id = $prescriptionId1
  test_order_id = $testOrderId
  document_type = "test_result"
  category = "lab"
  title = "Hemoglobin Result"
  description = "Master regression uploaded result"
  upload_status = "uploaded"
  storage_provider = "local"
  storage_bucket = "local-bucket"
  storage_key = $storageKey
  original_file_name = "hb-result.pdf"
  stored_file_name = "hb-result.pdf"
  mime_type = "application/pdf"
  file_extension = "pdf"
  file_size_bytes = 12345
  uploaded_at = New-IsoUtcString
  clinical_summary = "Hb value review pending"
} | ConvertTo-Json -Depth 12

$documentCreate = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/documents" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $documentCreateBody

Show-Json $documentCreate
$documentId = [string]$documentCreate.data._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($documentId)) "Document create response missing _id."

$linkResultBody = @{
  document_id = $documentId
} | ConvertTo-Json -Depth 12

$linkResult = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/test-orders/$testOrderId/link-result" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $linkResultBody

Show-Json $linkResult

$reviewInbox = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/test-orders/review-inbox?doctor_id=$doctorId&page=1&limit=20" `
  -Method GET `
  -Headers $doctorHeaders

Show-Json $reviewInbox

$reviewResultBody = @{
  abnormal_flag = $false
  findings_summary = "Normal range"
  remarks = "No action needed"
  action_required = $false
  result_summary = "Reviewed as normal"
} | ConvertTo-Json -Depth 12

$reviewResult = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/test-orders/$testOrderId/review-result" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $reviewResultBody

Show-Json $reviewResult

$sendResultBody = @{
  send_channels = @("print", "whatsapp")
  send_notes = "Master result send"
} | ConvertTo-Json -Depth 12

$sendResult = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/test-orders/$testOrderId/send-result" `
  -Method PATCH `
  -Headers $doctorHeaders `
  -ContentType "application/json" `
  -Body $sendResultBody

Show-Json $sendResult

Assert-BlockedRequest `
  -Label "Receptionist review inbox blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/test-orders/review-inbox" `
      -Method GET `
      -Headers $receptionHeaders
  }

Assert-BlockedRequest `
  -Label "Receptionist review result blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/test-orders/$testOrderId/review-result" `
      -Method PATCH `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $reviewResultBody
  }

Write-Section "Phase 10 - Billing workflow"
$invoiceCreateBody = @{
  patient_id = $patientId
  doctor_id = $doctorId
  consultation_id = $consultationId
  prescription_id = $prescriptionId1
  test_order_id = $testOrderId
  patient_document_id = $documentId
  invoice_date = New-IsoUtcString
  due_date = New-IsoUtcString -DaysOffset 7
  currency = "INR"
  notes = "Master billing create"
  internal_notes = "Master billing internal note"
  items = @(
    @{
      item_type = "consultation"
      source_type = "consultation"
      source_id = $consultationId
      label = "Consultation Fee"
      description = "Initial consultation"
      quantity = 1
      unit_price = 500
      discount_amount = 0
      tax_amount = 0
      status = "active"
    },
    @{
      item_type = "lab_test"
      source_type = "test_order"
      source_id = $testOrderId
      label = "Lab Test"
      description = "Hb Test"
      quantity = 1
      unit_price = 350
      discount_amount = 0
      tax_amount = 0
      status = "active"
    }
  )
} | ConvertTo-Json -Depth 12

$invoiceCreate = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices" `
  -Method POST `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $invoiceCreateBody

Show-Json $invoiceCreate
$invoiceId = [string]$invoiceCreate.data._id
Assert-Condition (-not [string]::IsNullOrWhiteSpace($invoiceId)) "Invoice create response missing _id."

$invoiceList = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices?patient_id=$patientId&page=1&limit=20" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $invoiceList

$invoiceDetailDraft = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId" `
  -Method GET `
  -Headers $adminHeaders

Show-Json $invoiceDetailDraft
Assert-Condition ($invoiceDetailDraft.data.status -eq "draft") "Invoice should start as draft."

$invoiceUpdateBody = @{
  invoice_date = New-IsoUtcString -DaysOffset 1
  due_date = New-IsoUtcString -DaysOffset 10
  currency = "INR"
  notes = "Updated invoice note"
  internal_notes = "Updated internal billing note"
} | ConvertTo-Json -Depth 12

$invoiceUpdated = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId" `
  -Method PUT `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $invoiceUpdateBody

Show-Json $invoiceUpdated

$invoiceAddItemsBody = @{
  items = @(
    @{
      item_type = "service"
      source_type = "service"
      label = "Nursing Charges"
      description = "Observation and assistance"
      quantity = 1
      unit_price = 200
      discount_amount = 0
      tax_amount = 0
      status = "active"
    }
  )
} | ConvertTo-Json -Depth 12

$invoiceAfterAddItem = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/items" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $invoiceAddItemsBody

Show-Json $invoiceAfterAddItem

$invoiceFinalize = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/finalize" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body "{}"

Show-Json $invoiceFinalize
Assert-Condition ($invoiceFinalize.data.status -eq "issued") "Invoice should be issued after finalize."
Assert-Condition (-not [string]::IsNullOrWhiteSpace($invoiceFinalize.data.invoice_number)) "Invoice number missing after finalize."

Assert-BlockedRequest `
  -Label "Update invoice after finalize blocked" `
  -ExpectedStatusCodes @(409) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId" `
      -Method PUT `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $invoiceUpdateBody
  }

Assert-BlockedRequest `
  -Label "Add item after finalize blocked" `
  -ExpectedStatusCodes @(409) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/items" `
      -Method PATCH `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $invoiceAddItemsBody
  }

$invoiceAfterFinalizeDetail = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId" `
  -Method GET `
  -Headers $adminHeaders

$totalAmount = [decimal]$invoiceAfterFinalizeDetail.data.total_amount
$partialAmount = [Math]::Round(($totalAmount / 2), 2)
if ($partialAmount -le 0) {
  $partialAmount = 1
}
if ($partialAmount -ge $totalAmount) {
  $partialAmount = [Math]::Round(($totalAmount - 1), 2)
}

$invoicePartialPaymentBody = @{
  payment_date = New-IsoUtcString
  amount = $partialAmount
  method = "cash"
  reference_number = "MASTER-PARTIAL-001"
  status = "recorded"
  notes = "Partial payment"
} | ConvertTo-Json -Depth 12

$invoicePartialPayment = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/payments" `
  -Method PATCH `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $invoicePartialPaymentBody

Show-Json $invoicePartialPayment
Assert-Condition ($invoicePartialPayment.data.status -eq "partially_paid") "Invoice should be partially_paid after first payment."

$currentDue = [decimal]$invoicePartialPayment.data.amount_due
$overPayAmount = [Math]::Round(($currentDue + 100), 2)

$overPayBody = @{
  payment_date = New-IsoUtcString
  amount = $overPayAmount
  method = "upi"
  reference_number = "MASTER-OVERPAY-001"
  status = "recorded"
  notes = "Should be blocked"
} | ConvertTo-Json -Depth 12

Assert-BlockedRequest `
  -Label "Invoice overpayment blocked" `
  -ExpectedStatusCodes @(409) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/payments" `
      -Method PATCH `
      -Headers $adminHeaders `
      -ContentType "application/json" `
      -Body $overPayBody
  }

$detailBeforeFinalPayment = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId" `
  -Method GET `
  -Headers $adminHeaders

$remainingDue = [decimal]$detailBeforeFinalPayment.data.amount_due

$invoiceFinalPaymentBody = @{
  payment_date = New-IsoUtcString
  amount = $remainingDue
  method = "upi"
  reference_number = "MASTER-FINAL-001"
  status = "confirmed"
  notes = "Final payment"
} | ConvertTo-Json -Depth 12

$invoiceFinalPayment = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/payments" `
  -Method PATCH `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $invoiceFinalPaymentBody

Show-Json $invoiceFinalPayment
Assert-Condition ($invoiceFinalPayment.data.status -eq "paid") "Invoice should be paid after final payment."
Assert-Condition ([decimal]$invoiceFinalPayment.data.amount_due -eq 0) "Invoice amount_due should be 0 after final payment."

$invoicePdf = Invoke-WebRequest `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/pdf" `
  -Method GET `
  -Headers $adminHeaders

Write-Host "Invoice PDF endpoint content type: $($invoicePdf.ContentType)"

$sendInvoiceBody = @{
  send_channels = @("print", "whatsapp")
  send_notes = "Master billing send"
} | ConvertTo-Json -Depth 12

$invoiceSend = Invoke-RestMethod `
  -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/send" `
  -Method PATCH `
  -Headers $receptionHeaders `
  -ContentType "application/json" `
  -Body $sendInvoiceBody

Show-Json $invoiceSend
Assert-Condition ($invoiceSend.data.send_status -eq "sent") "Invoice send_status should be sent."

Write-Section "Cross-role RBAC sweep"
Assert-BlockedRequest `
  -Label "Doctor billing list blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices" `
      -Method GET `
      -Headers $doctorHeaders
  }

Assert-BlockedRequest `
  -Label "Doctor billing detail blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId" `
      -Method GET `
      -Headers $doctorHeaders
  }

Assert-BlockedRequest `
  -Label "Doctor billing create blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices" `
      -Method POST `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $invoiceCreateBody
  }

Assert-BlockedRequest `
  -Label "Doctor billing payment blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/payments" `
      -Method PATCH `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $invoicePartialPaymentBody
  }

Assert-BlockedRequest `
  -Label "Doctor billing send blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/invoices/$invoiceId/send" `
      -Method PATCH `
      -Headers $doctorHeaders `
      -ContentType "application/json" `
      -Body $sendInvoiceBody
  }

Assert-BlockedRequest `
  -Label "Doctor receptionist dashboard blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/dashboard/receptionist" `
      -Method GET `
      -Headers $doctorHeaders
  }

Assert-BlockedRequest `
  -Label "Receptionist prescription create blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/prescriptions" `
      -Method POST `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $prescriptionBody1
  }

Assert-BlockedRequest `
  -Label "Receptionist pregnancy create blocked" `
  -ExpectedStatusCodes @(403) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/pregnancies" `
      -Method POST `
      -Headers $receptionHeaders `
      -ContentType "application/json" `
      -Body $pregnancyCreateBody
  }

Write-Section "Future route lock checks"
Assert-BlockedRequest `
  -Label "Deliveries route remains unmounted" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/deliveries" `
      -Method GET `
      -Headers $adminHeaders
  }


Assert-BlockedRequest `
  -Label "Refund route remains unmounted" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/refunds" `
      -Method GET `
      -Headers $adminHeaders
  }

Assert-BlockedRequest `
  -Label "Credit-note route remains unmounted" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/credit-notes" `
      -Method GET `
      -Headers $adminHeaders
  }

Assert-BlockedRequest `
  -Label "Payment gateway route remains unmounted" `
  -ExpectedStatusCodes @(404) `
  -ScriptBlock {
    Invoke-RestMethod `
      -Uri "$BaseUrl/api/v1/billing/gateway" `
      -Method GET `
      -Headers $adminHeaders
  }

Write-Section "Master confirmation"
Write-Host "Phase 0 to Phase 10 master regression flow completed."
Write-Host "If this full run passes, you can safely lock Phase 10 and move to Phase 11."