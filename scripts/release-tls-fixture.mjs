import forge from 'node-forge';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
export async function createReleaseTlsFixture() {
  const host = Object.values(networkInterfaces())
    .flat()
    .find(
      (address) =>
        address &&
        address.family === 'IPv4' &&
        !address.internal &&
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address),
    )?.address;
  if (!host)
    throw new Error(
      'Release acceptance requires a private IPv4 interface; no production network is used.',
    );
  const directory = resolve(process.env.EAS_TEST_WORK_DIR ?? 'work', 'release-tls-' + randomUUID());
  await mkdir(directory, { recursive: true });
  const make = (name, ca) => {
    const keys = forge.pki.rsa.generateKeyPair(2048),
      cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + randomUUID().replaceAll('-', '');
    cert.validity.notBefore = new Date(Date.now() - 60000);
    cert.validity.notAfter = new Date(Date.now() + 86400000);
    cert.setSubject([{ name: 'commonName', value: name }]);
    cert.setIssuer(ca ? ca.cert.subject.attributes : cert.subject.attributes);
    cert.setExtensions(
      ca
        ? [
            { name: 'basicConstraints', cA: false },
            { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
            { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
            {
              name: 'subjectAltName',
              altNames: [
                { type: 7, ip: '127.0.0.1' },
                { type: 7, ip: host },
                { type: 2, value: 'localhost' },
              ],
            },
          ]
        : [
            { name: 'basicConstraints', cA: true },
            { name: 'keyUsage', keyCertSign: true, cRLSign: true },
          ],
    );
    cert.sign(ca ? ca.keys.privateKey : keys.privateKey, forge.md.sha256.create());
    return { keys, cert };
  };
  const ca = make('EAS isolated acceptance CA'),
    leaf = make('EAS isolated acceptance service', ca),
    pem = {
      ca: forge.pki.certificateToPem(ca.cert),
      cert: forge.pki.certificateToPem(leaf.cert),
      key: forge.pki.privateKeyToPem(leaf.keys.privateKey),
    };
  const files = {};
  for (const [name, value] of Object.entries(pem)) {
    files[name] = resolve(directory, name + '.pem');
    await writeFile(files[name], value, { mode: 0o600 });
  }
  return {
    host,
    directory,
    files,
    tls: Object.fromEntries(Object.entries(pem).map(([name, value]) => [name, Buffer.from(value)])),
  };
}
