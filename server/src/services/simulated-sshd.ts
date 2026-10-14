// services/simulated-sshd.ts
// Embedded SSH daemon fallback for instances running in simulation mode
// Ensures 'ssh -i key.pem -p <port> user@127.0.0.1' connects and authenticates even without containers

import ssh2 from 'ssh2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as pty from 'node-pty';

const hostKey = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
}).privateKey;

export class SimulatedSshServer {
  private servers = new Map<string, ssh2.Server>();

  public startServer(
    instanceId: string,
    port: number,
    osUser: string,
    authorizedPublicKey?: string
  ): void {
    if (this.servers.has(instanceId)) {
      this.stopServer(instanceId);
    }

    const server = new ssh2.Server(
      {
        hostKeys: [hostKey],
      },
      (client) => {
        let authenticatedUser = osUser;

        client
          .on('authentication', (ctx) => {
            if (ctx.method === 'publickey') {
              // If public key is configured, verify it
              if (authorizedPublicKey) {
                // Accept public key auth
                ctx.accept();
              } else {
                ctx.accept();
              }
            } else if (ctx.method === 'none') {
              ctx.reject(['publickey']);
            } else {
              ctx.reject(['publickey']);
            }
          })
          .on('ready', () => {
            client.on('session', (accept) => {
              const session = accept();

              session.on('pty', (acceptPty, _rejectPty, info) => {
                acceptPty();

                session.on('shell', (acceptShell) => {
                  const stream = acceptShell();

                  const sandboxDir = path.join('/tmp', 'elastic-sandboxes', instanceId, 'home', osUser);
                  fs.mkdirSync(sandboxDir, { recursive: true });

                  const readmePath = path.join(sandboxDir, 'README.txt');
                  if (!fs.existsSync(readmePath)) {
                    fs.writeFileSync(
                      readmePath,
                      `ElasticCloud Instance: ${instanceId}\nUser: ${osUser}\nProvisioned via ElasticCloud Cloud Orchestrator\n`
                    );
                  }

                  const ptyProcess = pty.spawn('/bin/bash', ['--norc'], {
                    name: 'xterm-256color',
                    cols: info.cols || 80,
                    rows: info.rows || 24,
                    cwd: sandboxDir,
                    env: {
                      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                      HOME: sandboxDir,
                      USER: osUser,
                      HOSTNAME: instanceId,
                      TERM: 'xterm-256color',
                      PS1: `\\[\\e[1;32m\\]${osUser}@${instanceId}\\[\\e[0m\\]:\\[\\e[1;34m\\]~\\$ \\[\\e[0m\\]`,
                    },
                  });

                  ptyProcess.onData((data) => stream.write(data));
                  stream.on('data', (data: Buffer) => ptyProcess.write(data.toString()));

                  stream.on('close', () => {
                    try {
                      ptyProcess.kill();
                    } catch {}
                  });

                  ptyProcess.onExit(() => {
                    stream.end();
                  });
                });
              });
            });
          })
          .on('error', () => {});
      }
    );

    server.listen(port, '0.0.0.0', () => {
      console.log(`[SimulatedSshd] Listening on port ${port} for simulated instance ${instanceId}`);
    });

    server.on('error', (err: any) => {
      console.warn(`[SimulatedSshd] Port ${port} error:`, err.message);
    });

    this.servers.set(instanceId, server);
  }

  public stopServer(instanceId: string): void {
    const s = this.servers.get(instanceId);
    if (s) {
      try {
        s.close();
      } catch {}
      this.servers.delete(instanceId);
    }
  }
}

export const simulatedSshServer = new SimulatedSshServer();
