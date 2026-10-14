// websocket/terminal.ts
// Interactive WebSocket shell terminal (EC2 Instance Connect) using node-pty and container exec

import { WebSocket } from 'ws';
import * as pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import { getInstanceById } from '../db';
import { computeDriver } from '../services/compute-driver';

export function handleTerminalConnection(ws: WebSocket, instanceId: string): void {
  const instance = getInstanceById(instanceId);
  if (!instance) {
    ws.send('\r\n\x1b[31m[Error] Instance not found.\x1b[0m\r\n');
    ws.close();
    return;
  }

  if (instance.state !== 'running') {
    ws.send(`\r\n\x1b[33m[Warning] Instance ${instance.id} is currently in '${instance.state}' state. Terminal requires instance to be 'running'.\x1b[0m\r\n`);
    ws.close();
    return;
  }

  let osUser = 'ubuntu';
  if (instance.amiId.includes('debian')) osUser = 'debian';
  if (instance.amiId.includes('alpine')) osUser = 'alpine';

  // Initial welcome banner
  const banner = [
    `\x1b[1;36m    ______ _           _   _      _____ _                 _ \x1b[0m`,
    `\x1b[1;36m   |  ____| |         | | (_)    / ____| |               | |    \x1b[0m`,
    `\x1b[1;36m   | |__  | | __ _ ___| |_ _  ___| |    | | ___  _   _  __| |    \x1b[0m`,
    `\x1b[1;36m   |  __| | |/ _\` / __| __| |/ __| |    | |/ _ \\| | | |/ _\` |    \x1b[0m`,
    `\x1b[1;36m   | |____| | (_| \\__ \\ |_| | (__| |____| | (_) | |_| | (_| |    \x1b[0m`,
    `\x1b[1;36m   |______|_|\\__,_|___/\\__|_|\\___|\\_____|_|\\___/ \\__,_|\\__,_|    \x1b[0m`,
    `\x1b[1;33m   ElasticCloud EC2 Instance Connect - Zero-Setup Cloud Terminal\x1b[0m`,
    `\x1b[90m   Instance ID: ${instance.id} | Private IP: ${instance.privateIp} | OS: ${instance.amiId}\x1b[0m`,
    `\x1b[90m   Logged in as: \x1b[32m${osUser}\x1b[90m (sudo privileges enabled)\x1b[0m`,
    `----------------------------------------------------------------------\r\n`,
  ].join('\r\n');

  ws.send(banner);

  let ptyProcess: pty.IPty | null = null;

  try {
    // If running in container with containerId
    if (instance.containerId && !instance.containerId.startsWith('sim-')) {
      const shellCmd = instance.amiId.includes('alpine') ? '/bin/sh' : '/bin/bash';
      const runtimeCmd = computeDriver.getRuntimeCommand();
      ptyProcess = pty.spawn(runtimeCmd, ['exec', '-it', '-u', osUser, '-w', `/home/${osUser}`, instance.containerId, shellCmd], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
      });
    } else {
      // Simulation mode: spawn inside isolated instance sandbox directory
      const sandboxDir = path.join('/tmp', 'elastic-sandboxes', instance.id, 'home', osUser);
      fs.mkdirSync(sandboxDir, { recursive: true });

      const readmePath = path.join(sandboxDir, 'README.txt');
      if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(
          readmePath,
          `======================================================\n` +
          `  ElasticCloud Virtual Micro-VM Instance\n` +
          `  Instance ID: ${instance.id}\n` +
          `  AMI:         ${instance.amiId}\n` +
          `  Private IP:  ${instance.privateIp}\n` +
          `  User:        ${osUser}\n` +
          `======================================================\n`
        );
      }

      const shell = fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';
      const shellArgs = shell === '/bin/bash' ? ['--norc'] : [];
      ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: sandboxDir,
        env: {
          PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          HOME: sandboxDir,
          USER: osUser,
          HOSTNAME: instance.id,
          TERM: 'xterm-256color',
          PS1: `\\[\\e[1;32m\\]${osUser}@${instance.id}\\[\\e[0m\\]:\\[\\e[1;34m\\]~\\$ \\[\\e[0m\\]`,
        },
      });
    }

    ptyProcess.onData((data: string) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      } catch {
        // ignore write after close
      }
    });

    ptyProcess.onExit(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('\r\n\x1b[33m[Connection closed by remote host]\x1b[0m\r\n');
        ws.close();
      }
    });

    ws.on('message', (message: any) => {
      try {
        const msgStr = message.toString();
        // Check for JSON resize message
        if (msgStr.startsWith('{') && msgStr.includes('"type":"resize"')) {
          const parsed = JSON.parse(msgStr);
          if (parsed.cols && parsed.rows && ptyProcess) {
            ptyProcess.resize(parsed.cols, parsed.rows);
          }
        } else if (ptyProcess) {
          ptyProcess.write(msgStr);
        }
      } catch {
        if (ptyProcess) ptyProcess.write(message.toString());
      }
    });

    ws.on('close', () => {
      if (ptyProcess) {
        try {
          ptyProcess.kill();
        } catch {
          // ignore
        }
      }
    });
  } catch (err: any) {
    console.error('[TerminalWebSocket] Spawn error:', err);
    ws.send(`\r\n\x1b[31m[Terminal Error] Could not start shell: ${err.message}\x1b[0m\r\n`);
    ws.close();
  }
}
