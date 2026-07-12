import Dockerode from 'dockerode';

let _docker: Dockerode | null = null;

function getDocker(): Dockerode {
  if (!_docker) {
    const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
    _docker = new Dockerode({ socketPath });
  }
  return _docker;
}

export const OS_IMAGES: Record<string, { image: string; label: string }> = {
  'ubuntu-22':   { image: 'reemote-os/ubuntu-2204:latest',  label: 'Ubuntu 22.04 LTS' },
  'ubuntu-20':   { image: 'reemote-os/ubuntu-2004:latest',  label: 'Ubuntu 20.04 LTS' },
  'debian-12':   { image: 'reemote-os/debian-12:latest',    label: 'Debian 12 Bookworm' },
  'centos-9':    { image: 'reemote-os/centos-9:latest',     label: 'CentOS Stream 9' },
  'fedora-39':   { image: 'reemote-os/fedora-39:latest',    label: 'Fedora 39' },
  'alpine-3':    { image: 'reemote-os/alpine-3:latest',     label: 'Alpine Linux 3' },
};

export interface ContainerInfo {
  id: string;
  fullId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  vmId: string;
  osType: string;
  vncPort: number | null;
}

export async function provisionContainer(
  vmId: string,
  osType: string,
  vncPassword = 'reemote'
): Promise<{ containerId: string; hostPort: number }> {
  const d = getDocker();
  const osInfo = OS_IMAGES[osType];
  if (!osInfo) throw new Error(`No container image for OS type: ${osType}`);

  const name = `reemote-vm-${vmId}`;

  // Remove any existing container with the same name
  try {
    const existing = d.getContainer(name);
    await existing.remove({ force: true });
  } catch {}

  const container = await d.createContainer({
    Image: osInfo.image,
    name,
    Hostname: name,
    Env: [
      `VNC_PASSWORD=${vncPassword}`,
      'VNC_RESOLUTION=1280x720',
      'VNC_DEPTH=24',
    ],
    ExposedPorts: { '6080/tcp': {} },
    HostConfig: {
      PortBindings: { '6080/tcp': [{ HostPort: '' }] },
      RestartPolicy: { Name: 'unless-stopped' },
      NetworkMode: 'reemote-os-net',
    },
    Labels: {
      'reemote.managed': 'true',
      'reemote.vm-id': vmId,
      'reemote.os-type': osType,
    },
  });

  await container.start();

  const info = await container.inspect();
  const binding = info.NetworkSettings.Ports['6080/tcp'];
  if (!binding || !binding[0]) throw new Error('No port binding found after container start');

  const hostPort = parseInt(binding[0].HostPort, 10);
  return { containerId: container.id, hostPort };
}

export async function listManagedContainers(): Promise<ContainerInfo[]> {
  const d = getDocker();
  const containers = await d.listContainers({
    all: true,
    filters: JSON.stringify({ label: ['reemote.managed=true'] }),
  });

  return containers.map(c => {
    const portBinding = c.Ports.find(p => p.PrivatePort === 6080);
    return {
      id: c.Id.slice(0, 12),
      fullId: c.Id,
      name: (c.Names[0] || '').replace('/', ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      vmId: c.Labels['reemote.vm-id'] || '',
      osType: c.Labels['reemote.os-type'] || '',
      vncPort: portBinding?.PublicPort || null,
    };
  });
}

export async function startContainer(containerId: string): Promise<void> {
  const d = getDocker();
  await d.getContainer(containerId).start();
}

export async function stopContainer(containerId: string): Promise<void> {
  const d = getDocker();
  await d.getContainer(containerId).stop({ t: 10 });
}

export async function removeContainer(containerId: string): Promise<void> {
  const d = getDocker();
  const c = d.getContainer(containerId);
  try { await c.stop({ t: 5 }); } catch {}
  await c.remove({ force: true });
}

export async function getContainerPort(containerId: string): Promise<number | null> {
  const d = getDocker();
  const info = await d.getContainer(containerId).inspect();
  const binding = info.NetworkSettings.Ports['6080/tcp'];
  return binding?.[0] ? parseInt(binding[0].HostPort, 10) : null;
}
