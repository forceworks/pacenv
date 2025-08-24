# Build VSIX manually for PAC Environment extension
$extensionName = "pac-environment"
$version = "1.0.0"
$publisher = "Forceworks"
$vsixName = "$publisher.$extensionName-$version.vsix"

Write-Host "Building VSIX package: $vsixName" -ForegroundColor Green

# Create temp directory for packaging
$tempDir = "vsix-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy necessary files
Copy-Item -Path "package.json" -Destination $tempDir
Copy-Item -Path "README.md" -Destination $tempDir
Copy-Item -Path ".vscodeignore" -Destination $tempDir -ErrorAction SilentlyContinue
Copy-Item -Path "out" -Destination $tempDir -Recurse

# Create extension manifest
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$extensionName" Version="$version" Publisher="$publisher"/>
    <DisplayName>PAC Environment per Project</DisplayName>
    <Description xml:space="preserve">Pin and auto-apply Power Platform CLI profiles per VS Code workspace</Description>
    <Tags>Power Platform,PAC,CLI,Environment</Tags>
    <Categories>Other</Categories>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
"@

$manifest | Out-File -FilePath "$tempDir\extension.vsixmanifest" -Encoding UTF8

# Create [Content_Types].xml - use literal path to handle special characters
$contentTypes = @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".map" ContentType="application/json"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
'@

$contentTypesPath = Join-Path $tempDir '[Content_Types].xml'
[System.IO.File]::WriteAllText($contentTypesPath, $contentTypes)

# Create extension subfolder
New-Item -ItemType Directory -Path "$tempDir\extension" | Out-Null
Move-Item "$tempDir\package.json" "$tempDir\extension\"
Move-Item "$tempDir\README.md" "$tempDir\extension\"
Move-Item "$tempDir\out" "$tempDir\extension\"

# Create the VSIX (ZIP file)
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $vsixName)

# Clean up
Remove-Item -Recurse -Force $tempDir

Write-Host "Successfully created: $vsixName" -ForegroundColor Green
Write-Host "You can install this extension by running:" -ForegroundColor Yellow
Write-Host "  code --install-extension $vsixName" -ForegroundColor Cyan