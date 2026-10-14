"use strict";
// ElasticCloud Shared Types
// Shared between server and client
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_AMIS = exports.INSTANCE_TYPES = void 0;
exports.INSTANCE_TYPES = [
    { name: 't3.nano', vcpus: 0.5, memory: 512, label: 't3.nano – 0.5 vCPU, 512 MB', category: 'General Purpose' },
    { name: 't3.micro', vcpus: 1, memory: 1024, label: 't3.micro – 1 vCPU, 1 GB', category: 'General Purpose' },
    { name: 't3.small', vcpus: 1, memory: 2048, label: 't3.small – 1 vCPU, 2 GB', category: 'General Purpose' },
    { name: 't3.medium', vcpus: 2, memory: 4096, label: 't3.medium – 2 vCPU, 4 GB', category: 'General Purpose' },
    { name: 'm6i.large', vcpus: 2, memory: 8192, label: 'm6i.large – 2 vCPU, 8 GB', category: 'General Purpose' },
    { name: 'm6i.xlarge', vcpus: 4, memory: 16384, label: 'm6i.xlarge – 4 vCPU, 16 GB', category: 'General Purpose' },
    { name: 'c6i.large', vcpus: 2, memory: 4096, label: 'c6i.large – 2 vCPU, 4 GB', category: 'Compute Optimized' },
    { name: 'c6i.xlarge', vcpus: 4, memory: 8192, label: 'c6i.xlarge – 4 vCPU, 8 GB', category: 'Compute Optimized' },
    { name: 'c6i.2xlarge', vcpus: 8, memory: 16384, label: 'c6i.2xlarge – 8 vCPU, 16 GB', category: 'Compute Optimized' },
    { name: 'r6i.large', vcpus: 2, memory: 16384, label: 'r6i.large – 2 vCPU, 16 GB', category: 'Memory Optimized' },
    { name: 'r6i.xlarge', vcpus: 4, memory: 32768, label: 'r6i.xlarge – 4 vCPU, 32 GB', category: 'Memory Optimized' },
];
exports.AVAILABLE_AMIS = [
    {
        id: 'ami-ubuntu2404',
        name: 'Ubuntu 24.04 LTS (Noble Numbat)',
        os: 'Ubuntu',
        version: '24.04',
        arch: 'x86_64',
        description: 'Canonical Ubuntu 24.04 LTS with HWE kernel, ideal for general purpose workloads.',
        defaultUser: 'ubuntu',
        dockerImage: 'elastic-ubuntu:24.04',
        icon: 'ubuntu',
        rootDeviceName: '/dev/sda1',
    },
    {
        id: 'ami-debian12',
        name: 'Debian 12 (Bookworm)',
        os: 'Debian',
        version: '12',
        arch: 'x86_64',
        description: 'Debian 12 Bookworm stable release, rock-solid server foundation.',
        defaultUser: 'debian',
        dockerImage: 'elastic-debian:12',
        icon: 'debian',
        rootDeviceName: '/dev/xvda',
    },
    {
        id: 'ami-alpine320',
        name: 'Alpine Linux 3.20',
        os: 'Alpine',
        version: '3.20',
        arch: 'x86_64',
        description: 'Alpine Linux 3.20 – ultra-lightweight, musl-based, minimal attack surface.',
        defaultUser: 'alpine',
        dockerImage: 'elastic-alpine:3.20',
        icon: 'alpine',
        rootDeviceName: '/dev/vda1',
    },
];
//# sourceMappingURL=types.js.map