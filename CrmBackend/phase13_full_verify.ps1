param(
    [string]$BaseUrl = "http://localhost:8083",
    [string]$AdminEmail = "dev.admin@gynecrm.com",
    [string]$DoctorEmail = "dev.doctor@gynecrm.com",
    [string]$Password = "Dev@12345"
)

$ErrorActionPreference = "Stop"

function Write-Section($title) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host $title -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Fail($message) {
    throw $message
}

function Assert-True($condition, $message) {
    if (-not $condition) {
        Fail $message
    }
}

function Assert-FileExists($path) {
    Assert-True (Test-Path $path) "Required file not found: $path"
}

function Assert-Contains($content, $needle, $label) {
    Assert-True ($content -match [regex]::Escape($needle)) "$label missing expected text: $needle"
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET","POST","PUT","PATCH","DELETE")] [string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [string]$Token = "",
        $Body = $null
    )

    $headers = @{
        "Accept" = "application/json"
    }

    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 20
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType "application/json" -Body $json
    } else {
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
    }
}

function Login-User {
    param(
        [string]$Email,
        [string]$Password
    )

    $resp = Invoke-Api -Method POST -Url "$BaseUrl/api/v1/auth/login" -Body @{
        email = $Email
        password = $Password
    }

    $token = $resp.data.access_token
    Assert-True ($token) "Login failed for $Email. No access_token returned."

    return @{
        token = $token
        raw   = $resp
    }
}

function Expect-RouteNotFound($path, $token) {
    $failedAsExpected = $false
    try {
        $null = Invoke-Api -Method GET -Url "$BaseUrl$path" -Token $token
    } catch {
        $failedAsExpected = $true
    }
    Assert-True $failedAsExpected "Expected route to remain unavailable: $path"
}

Write-Section "Phase 13 prerequisites"
Write-Host "Run these first in CrmBackend if not already done:" -ForegroundColor Yellow
Write-Host "1) npm run seed:reference-data"
Write-Host "2) npm run seed:auth-users"
Write-Host "3) npm run start:new"
Write-Host ""

Write-Section "Phase 13 file existence"
Assert-FileExists ".\src\models\JourneyPlan.js"
Assert-FileExists ".\src\models\IvfCycle.js"
Write-Host "PASS: JourneyPlan.js and IvfCycle.js exist"

Write-Section "Phase 13 syntax check"
node --check .\src\models\JourneyPlan.js
if ($LASTEXITCODE -ne 0) { Fail "Syntax check failed for src\models\JourneyPlan.js" }

node --check .\src\models\IvfCycle.js
if ($LASTEXITCODE -ne 0) { Fail "Syntax check failed for src\models\IvfCycle.js" }

Write-Host "PASS: model syntax checks"

Write-Section "JourneyPlan model placeholder structure"
$journeyContent = Get-Content ".\src\models\JourneyPlan.js" -Raw

Assert-Contains $journeyContent "SrcJourneyPlan" "JourneyPlan model"
Assert-Contains $journeyContent "journey_plans" "JourneyPlan collection"
Assert-Contains $journeyContent "hospital_id" "JourneyPlan schema"
Assert-Contains $journeyContent "patient_id" "JourneyPlan schema"
Assert-Contains $journeyContent "owner_doctor_id" "JourneyPlan schema"
Assert-Contains $journeyContent "plan_type" "JourneyPlan schema"
Assert-Contains $journeyContent "status" "JourneyPlan schema"
Assert-Contains $journeyContent "priority" "JourneyPlan schema"
Assert-Contains $journeyContent "milestones" "JourneyPlan schema"
Assert-Contains $journeyContent "linked_entities" "JourneyPlan schema"
Assert-Contains $journeyContent "care_plan" "JourneyPlan plan_type enum"
Assert-Contains $journeyContent "follow_up_plan" "JourneyPlan plan_type enum"
Assert-Contains $journeyContent "treatment_plan" "JourneyPlan plan_type enum"
Assert-Contains $journeyContent "communication_plan" "JourneyPlan plan_type enum"
Assert-Contains $journeyContent "custom" "JourneyPlan plan_type enum"

Write-Host "PASS: JourneyPlan placeholder structure"

Write-Section "IvfCycle model placeholder structure"
$ivfContent = Get-Content ".\src\models\IvfCycle.js" -Raw

Assert-Contains $ivfContent "SrcIvfCycle" "IvfCycle model"
Assert-Contains $ivfContent "ivf_cycles" "IvfCycle collection"
Assert-Contains $ivfContent "hospital_id" "IvfCycle schema"
Assert-Contains $ivfContent "patient_id" "IvfCycle schema"
Assert-Contains $ivfContent "owner_doctor_id" "IvfCycle schema"
Assert-Contains $ivfContent "cycle_type" "IvfCycle schema"
Assert-Contains $ivfContent "status" "IvfCycle schema"
Assert-Contains $ivfContent "priority" "IvfCycle schema"
Assert-Contains $ivfContent "milestones" "IvfCycle schema"
Assert-Contains $ivfContent "linked_entities" "IvfCycle schema"
Assert-Contains $ivfContent "diagnostic" "IvfCycle cycle_type enum"
Assert-Contains $ivfContent "stimulation" "IvfCycle cycle_type enum"
Assert-Contains $ivfContent "retrieval" "IvfCycle cycle_type enum"
Assert-Contains $ivfContent "transfer" "IvfCycle cycle_type enum"
Assert-Contains $ivfContent "fertility_plan" "IvfCycle cycle_type enum"
Assert-Contains $ivfContent "preservation" "IvfCycle cycle_type enum"
Assert-Contains $ivfContent "custom" "IvfCycle cycle_type enum"

Write-Host "PASS: IvfCycle placeholder structure"

Write-Section "Phase 13 route-mount protection"
$routeIndexContent = Get-Content ".\src\routes\index.js" -Raw

Assert-True (-not ($routeIndexContent -match "journey-plans")) "journey-plans route should not be mounted."
Assert-True (-not ($routeIndexContent -match "journey_plan")) "journey_plan route should not be mounted."
Assert-True (-not ($routeIndexContent -match "ivf-cycles")) "ivf-cycles route should not be mounted."
Assert-True (-not ($routeIndexContent -match "ivf_cycle")) "ivf_cycle route should not be mounted."

Write-Host "PASS: no Phase 13 routes mounted"

Write-Section "Health checks"
$health1 = Invoke-Api -Method GET -Url "$BaseUrl/health"
$health2 = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/health"

Assert-True ($health1.success -eq $true) "/health failed."
Assert-True ($health2.success -eq $true) "/api/v1/health failed."
Write-Host "PASS: health endpoints"

Write-Section "Login"
$adminLogin = Login-User -Email $AdminEmail -Password $Password
$adminToken = $adminLogin.token

$doctorLogin = Login-User -Email $DoctorEmail -Password $Password
$doctorToken = $doctorLogin.token

Write-Host "PASS: admin and doctor login succeeded"

Write-Section "Regression spot checks after Phase 13 model-only work"

$doctorDashboardResp = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/dashboard/doctor" -Token $adminToken
Assert-True ($doctorDashboardResp.success -eq $true) "Doctor dashboard regression check failed."

$eventsTypesResp = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/events/types" -Token $adminToken
Assert-True ($eventsTypesResp.success -eq $true) "Events types regression check failed."

$jobsTypesResp = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/jobs/types" -Token $adminToken
Assert-True ($jobsTypesResp.success -eq $true) "Jobs types regression check failed."

Write-Host "PASS: core regression routes still work"

Write-Section "Phase 13 placeholder routes must stay unmounted"
Expect-RouteNotFound -path "/api/v1/journey-plans" -token $adminToken
Expect-RouteNotFound -path "/api/v1/ivf-cycles" -token $adminToken
Write-Host "PASS: JourneyPlan and IvfCycle routes remain unmounted"

Write-Section "RBAC regression spot checks"

$doctorDeniedReception = $false
try {
    $null = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/dashboard/receptionist" -Token $doctorToken
} catch {
    $doctorDeniedReception = $true
}
Assert-True $doctorDeniedReception "Doctor should still be denied from receptionist dashboard."

$doctorDeniedEvents = $false
try {
    $null = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/events" -Token $doctorToken
} catch {
    $doctorDeniedEvents = $true
}
Assert-True $doctorDeniedEvents "Doctor should still be denied from /events."

$doctorDeniedJobs = $false
try {
    $null = Invoke-Api -Method GET -Url "$BaseUrl/api/v1/jobs" -Token $doctorToken
} catch {
    $doctorDeniedJobs = $true
}
Assert-True $doctorDeniedJobs "Doctor should still be denied from /jobs."

Write-Host "PASS: RBAC regression checks"

Write-Section "Out of scope route checks"
Expect-RouteNotFound -path "/api/v1/deliveries" -token $adminToken
Write-Host "PASS: deliveries still unmounted"

Write-Section "Phase 13 verification summary"
Write-Host "PASS: JourneyPlan placeholder model file exists"
Write-Host "PASS: IvfCycle placeholder model file exists"
Write-Host "PASS: model syntax checks"
Write-Host "PASS: JourneyPlan schema placeholder structure"
Write-Host "PASS: IvfCycle schema placeholder structure"
Write-Host "PASS: no Phase 13 routes mounted"
Write-Host "PASS: runtime health/auth regression"
Write-Host "PASS: Phase 12 routes still work"
Write-Host "PASS: JourneyPlan/IvfCycle routes remain unmounted"
Write-Host "PASS: RBAC regression checks"
Write-Host "PASS: deliveries still unmounted"

Write-Host ""
Write-Host "PHASE 13 TESTING PASSED" -ForegroundColor Green