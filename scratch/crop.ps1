Add-Type -AssemblyName System.Drawing
$imagePath = "C:\Users\Tagm3tek\.gemini\antigravity\brain\2907d5cc-41ee-4f9c-894a-6f81134148d6\media__1780405308267.png"
$outputDir = "e:\Antigravity Projects\YoussefAutomates\public\avatars"

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir
}

$img = [System.Drawing.Image]::FromFile($imagePath)

$cols = 4
$rows = 2
$cellW = [int][math]::Floor($img.Width / $cols)
$cellH = [int][math]::Floor($img.Height / $rows)

Write-Output "Image size: $($img.Width)x$($img.Height). Cell size: $($cellW)x$($cellH)"

for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
        $index = ($r * $cols) + $c + 1
        $x = [int]($c * $cellW)
        $y = [int]($r * $cellH)
        
        $w = [int]$cellW
        $h = [int]$cellH
        
        $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
        $bmp = New-Object System.Drawing.Bitmap $w, $h
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        $g.Clear([System.Drawing.Color]::White)
        
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        
        $destRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
        $g.DrawImage($img, $destRect, $rect, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
        
        $outputPath = Join-Path $outputDir "avatar-$index.png"
        $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Output "Saved avatar-$index.png at $outputPath"
    }
}

$img.Dispose()
Write-Output "Successfully cropped all avatars."
