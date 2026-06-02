Add-Type -AssemblyName System.Drawing
$imagePath = "C:\Users\Tagm3tek\.gemini\antigravity\brain\2907d5cc-41ee-4f9c-894a-6f81134148d6\media__1780405308267.png"
if (Test-Path $imagePath) {
    $img = [System.Drawing.Image]::FromFile($imagePath)
    Write-Output "Width: $($img.Width)"
    Write-Output "Height: $($img.Height)"
    $img.Dispose()
} else {
    Write-Output "File not found: $imagePath"
}
