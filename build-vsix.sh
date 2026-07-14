#!/usr/bin/env bash
set -e

NAME="branch-diff-view"
VERSION="0.1.0"
VSIX="${NAME}-${VERSION}.vsix"
STAGE="/tmp/vsix-stage-$$"

rm -rf "$STAGE"
mkdir -p "$STAGE/extension/dist"

# Copy required files
cp package.json README.md CHANGELOG.md LICENSE icon.png "$STAGE/extension/"
cp dist/extension.js dist/webview.js dist/webview.css "$STAGE/extension/dist/"

# [Content_Types].xml
cat > "$STAGE/[Content_Types].xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Default Extension="json"         ContentType="application/json" />
  <Default Extension="js"           ContentType="application/javascript" />
  <Default Extension="css"          ContentType="text/css" />
  <Default Extension="md"           ContentType="text/markdown" />
  <Default Extension="png"          ContentType="image/png" />
</Types>
EOF

# extension.vsixmanifest
cat > "$STAGE/extension.vsixmanifest" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0"
  xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"
  xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${NAME}" Version="${VERSION}" Publisher="local" />
    <DisplayName>Branch Diff View</DisplayName>
    <Description xml:space="preserve">GitHub-style Files Changed panel for local branch comparison</Description>
    <Tags>git,diff,review</Tags>
    <Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Icon>extension/icon.png</Icon>
    <Badges></Badges>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.85.0" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[1.85.0,)" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>
EOF

# Build the zip
cd "$STAGE"
zip -r "$OLDPWD/$VSIX" . -x "*.DS_Store"
cd "$OLDPWD"

rm -rf "$STAGE"
echo "Created: $VSIX"
ls -lh "$VSIX"
