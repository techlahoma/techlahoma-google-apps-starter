export type DoctorStatus = 'pass' | 'info' | 'warning' | 'fail';

export interface PlatformAssessment {
  status: DoctorStatus;
  summary: string;
}

export function pinnedBunVersion(packageManager: string): string | null {
  const match = /^bun@([^\s]+)$/.exec(packageManager.trim());
  return match?.[1] ?? null;
}

export function windowsBuild(release: string): number | null {
  const build = Number(release.split('.')[2]);
  return Number.isInteger(build) ? build : null;
}

export function assessPlatform(
  platform: NodeJS.Platform,
  architecture: string,
  release: string,
): PlatformAssessment {
  if (platform === 'win32') {
    const build = windowsBuild(release);
    if (architecture !== 'x64' && architecture !== 'arm64') {
      return {
        status: 'fail',
        summary: `Windows architecture ${architecture} is not 64-bit`,
      };
    }
    if (build === null || build < 17763) {
      return {
        status: 'fail',
        summary: `Windows build ${release} is older than Windows 10 1809`,
      };
    }
    return {
      status: 'pass',
      summary: `native Windows ${release} (${architecture}) is supported`,
    };
  }

  if (platform === 'darwin') {
    const darwinMajor = Number(release.split('.')[0]);
    if (!Number.isInteger(darwinMajor) || darwinMajor < 22) {
      return {
        status: 'fail',
        summary: `macOS kernel ${release} is older than the Bun-supported macOS 13 baseline`,
      };
    }
    if (architecture !== 'arm64') {
      return {
        status: 'warning',
        summary: `macOS ${architecture} can run the repository, but the Antigravity workshop path requires Apple Silicon`,
      };
    }
    return {
      status: 'pass',
      summary: `Apple Silicon macOS kernel ${release} is supported`,
    };
  }

  if (platform === 'linux') {
    return {
      status: 'pass',
      summary: `Linux ${release} (${architecture}) is supported for development and CI`,
    };
  }

  return {
    status: 'warning',
    summary: `${platform} ${release} (${architecture}) has no documented workshop support contract`,
  };
}
