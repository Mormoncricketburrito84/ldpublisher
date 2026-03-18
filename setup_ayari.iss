[Setup]
AppId={{9F821A4B-3D2E-4712-B981-LDPUBLISHER123}
AppName=LDPUBLISHER
AppVersion=1.0.0
AppPublisher=Alp
DefaultDirName={autopf}\LDPUBLISHER
DisableProgramGroupPage=yes
LicenseFile=license.txt
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=LDPUBLISHER_Setup
SetupIconFile=ldpublisherlogo.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Masaüstü kýsayolu oluþtur"; GroupDescription: "Ek Simgeler:"; Flags: unchecked

[Files]
Source: "Uygulama_Dosyalari\LDPUBLISHER-win32-x64\LDPUBLISHER.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Uygulama_Dosyalari\LDPUBLISHER-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\LDPUBLISHER"; Filename: "{app}\LDPUBLISHER.exe"
Name: "{autodesktop}\LDPUBLISHER"; Filename: "{app}\LDPUBLISHER.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\LDPUBLISHER.exe"; Description: "LDPUBLISHER'ý Baþlat"; Flags: nowait postinstall skipifsilent