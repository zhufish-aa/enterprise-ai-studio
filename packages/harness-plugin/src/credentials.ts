import { readFile, lstat, realpath } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
export async function readToken(file: string): Promise<string> {
  if (!isAbsolute(file)) throw new Error('TOKEN_STORE_REJECTED');
  const path = await realpath(file);
  const st = await lstat(path);
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1 || st.size > 16384)
    throw new Error('TOKEN_STORE_REJECTED');
  let token: string;
  if (process.platform === 'win32') {
    // DPAPI CurrentUser ciphertext; the file path is an argument, never interpolated as script.
    const command =
      '$s=Get-Content -LiteralPath $env:EAS_TOKEN_STORE -Raw | ConvertTo-SecureString; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }';
    const { stdout } = await run(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(command, 'utf16le').toString('base64'),
      ],
      {
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 16384,
        env: { ...process.env, EAS_TOKEN_STORE: path },
      },
    );
    token = stdout.trim();
  } else {
    if ((st.mode & 0o077) !== 0 || (process.getuid && st.uid !== process.getuid()))
      throw new Error('TOKEN_STORE_PERMISSIONS');
    token = (await readFile(path, 'utf8')).trim();
  }
  if (!token || token.length > 8192 || /[\r\n]/.test(token)) throw new Error('TOKEN_STORE_INVALID');
  return token;
}
