# PowerShell script to test the API endpoints

$baseUrl = "http://localhost:3001"

Write-Host "=== Testing AI Flow Runner Backend ===" -ForegroundColor Cyan
Write-Host ""

# Health Check
Write-Host "1. Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Simple Chat
Write-Host "2. Simple Chat" -ForegroundColor Yellow
$chatBody = @{
    text = "Hello, how are you?"
    language = "en"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/chat" -Method POST -Body $chatBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "Response: $($jsonResponse.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Detect Emotion
Write-Host "3. Detect Emotion" -ForegroundColor Yellow
$emotionBody = @{
    text = "I'm so excited about this new project!"
    language = "en"
    stepType = "detect_emotion"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/chat" -Method POST -Body $emotionBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "Detected Emotion: $($jsonResponse.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Clean Text
Write-Host "4. Clean Text" -ForegroundColor Yellow
$cleanBody = @{
    text = "This   text    has    too    many    spaces   and   line`n`nbreaks"
    language = "en"
    stepType = "clean_text"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/chat" -Method POST -Body $cleanBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "Cleaned Text: $($jsonResponse.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Translate to Tamil
Write-Host "5. Translate to Tamil" -ForegroundColor Yellow
$translateBody = @{
    text = "Hello, how are you today?"
    language = "ta"
    stepType = "translate"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/chat" -Method POST -Body $translateBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "Translation: $($jsonResponse.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Testing Complete ===" -ForegroundColor Cyan

