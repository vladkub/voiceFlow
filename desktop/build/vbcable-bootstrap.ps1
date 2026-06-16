$ErrorActionPreference = 'Stop'

function Test-VbCableInstalled {
    try {
        $pnp = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue |
            Where-Object {
                $_.FriendlyName -match 'CABLE Input|CABLE Output|VB-Audio'
            }
        if ($pnp) { return $true }
    } catch {
        # Ignore PnP check errors and fallback to uninstall registry check.
    }

    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($root in $roots) {
        try {
            $hit = Get-ItemProperty $root -ErrorAction SilentlyContinue |
                Where-Object { $_.DisplayName -match 'VB-Audio Virtual Cable|VB-CABLE' } |
                Select-Object -First 1
            if ($hit) { return $true }
        } catch {
            # ignore
        }
    }
    return $false
}

if (Test-VbCableInstalled) {
    Write-Host 'VB-Cable already installed.'
    exit 0
}

Write-Host 'VB-Cable not found. Installing...'

$tempDir = Join-Path $env:TEMP 'talkpilot-vbcable'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$zipPath = Join-Path $tempDir 'VBCABLE_Driver_Pack.zip'
$extractDir = Join-Path $tempDir 'extract'

# Official VB-Audio download page host. Update URL here if vendor changes package name.
$downloadUrl = 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip'

Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$setup64 = Get-ChildItem -Path $extractDir -Recurse -Filter 'VBCABLE_Setup_x64.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$setup32 = Get-ChildItem -Path $extractDir -Recurse -Filter 'VBCABLE_Setup.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$setup = if ([Environment]::Is64BitOperatingSystem -and $setup64) { $setup64.FullName } elseif ($setup32) { $setup32.FullName } else { $null }

if (-not $setup) {
    Write-Host 'VB-Cable installer executable not found in archive.'
    exit 0
}

$argsList = @(
    @('-i', '-h'),
    @('/S'),
    @('/silent')
)

$installed = $false
foreach ($args in $argsList) {
    try {
        $proc = Start-Process -FilePath $setup -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 2
        if (Test-VbCableInstalled) {
            $installed = $true
            break
        }
        Write-Host "VB-Cable attempt exit code: $($proc.ExitCode), args: $($args -join ' ')"
    } catch {
        Write-Host "VB-Cable install attempt failed: $($_.Exception.Message)"
    }
}

if ($installed) {
    Write-Host 'VB-Cable installed successfully.'
} else {
    Write-Host 'VB-Cable auto-install did not confirm. User may need manual driver install and reboot.'
}

exit 0
