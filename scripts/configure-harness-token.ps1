param([Parameter(Mandatory=$true)][string]$TokenFile)
$ErrorActionPreference = 'Stop'
$token = Read-Host 'Enterprise platform user token' -AsSecureString
$cipher = ConvertFrom-SecureString $token
[System.IO.File]::WriteAllText([System.IO.Path]::GetFullPath($TokenFile), $cipher)
$acl = Get-Acl -LiteralPath $TokenFile
$acl.SetAccessRuleProtection($true, $false)
$principal = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($principal, 'FullControl', 'Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $TokenFile -AclObject $acl
Write-Output 'Encrypted token saved with a current-user ACL.'
