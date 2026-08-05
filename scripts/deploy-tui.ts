import {createInterface} from 'node:readline';
import type {
  DiscoveredApp,
  FirebaseHostingSite,
  FirebaseProject,
} from './deploy-lib';

export interface PromptAdapter {
  selectApp(
    apps: DiscoveredApp[],
    defaultSlug?: string,
  ): Promise<DiscoveredApp>;
  confirmDeploy(appTitle: string, destination: string): Promise<boolean>;
  selectProject(projects: FirebaseProject[]): Promise<FirebaseProject>;
  confirmSetup(projectId: string): Promise<boolean>;
  confirmLogin(): Promise<boolean>;
}

export class CliPromptAdapter implements PromptAdapter {
  private ask(question: string): Promise<string> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise(res => {
      rl.question(question, ans => {
        rl.close();
        res(ans.trim());
      });
    });
  }

  async selectApp(
    apps: DiscoveredApp[],
    defaultSlug?: string,
  ): Promise<DiscoveredApp> {
    console.log('\nSelect an app:');
    apps.forEach((app, idx) => {
      const isDefault = defaultSlug === app.slug;
      const prefix = isDefault ? '❯' : ' ';
      let statusStr = 'Not deployed';
      if (app.status === 'deployed') {
        statusStr = 'Deployed & verified';
      } else if (app.status === 'site_exists') {
        statusStr = 'Site exists';
      } else if (app.status === 'site_missing') {
        statusStr = 'Site missing';
      } else if (app.status === 'not_configured') {
        statusStr = 'Not configured';
      } else if (app.siteId) {
        statusStr = app.siteId;
      }
      const paddedTitle = app.title.padEnd(24, ' ');
      console.log(`${prefix} ${idx + 1}) ${paddedTitle} ${statusStr}`);
    });

    const defaultIdx = apps.findIndex(a => a.slug === defaultSlug);
    const defaultNum = defaultIdx >= 0 ? defaultIdx + 1 : 1;

    const answer = await this.ask(
      `\nChoice [1-${apps.length}] (default ${defaultNum}): `,
    );
    if (!answer) {
      return apps[defaultNum - 1]!;
    }

    const num = Number.parseInt(answer, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= apps.length) {
      return apps[num - 1]!;
    }

    const matched = apps.find(
      a => a.slug.toLowerCase() === answer.toLowerCase(),
    );
    if (matched) return matched;

    console.log('Invalid selection, selecting default.');
    return apps[defaultNum - 1]!;
  }

  async confirmDeploy(appTitle: string, destination: string): Promise<boolean> {
    const answer = await this.ask(
      `\nBuild and deploy ${appTitle} to ${destination}? (Y/n) `,
    );
    if (!answer) return true;
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  async selectProject(projects: FirebaseProject[]): Promise<FirebaseProject> {
    console.log('\nSelect a Firebase project:');
    projects.forEach((proj, idx) => {
      console.log(`  ${idx + 1}) ${proj.displayName} (${proj.projectId})`);
    });

    const answer = await this.ask(
      `\nChoice [1-${projects.length}] (default 1): `,
    );
    if (!answer) return projects[0]!;

    const num = Number.parseInt(answer, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= projects.length) {
      return projects[num - 1]!;
    }

    const matched = projects.find(p => p.projectId === answer);
    if (matched) return matched;

    return projects[0]!;
  }

  async confirmSetup(projectId: string): Promise<boolean> {
    const answer = await this.ask(
      `\nConnect shared configuration to project "${projectId}"? (Y/n) `,
    );
    if (!answer) return true;
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  async confirmLogin(): Promise<boolean> {
    const answer = await this.ask(
      '\nFirebase CLI authentication is missing. Start login flow now? (Y/n) ',
    );
    if (!answer) return true;
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }
}

export function printDeployHeader(): void {
  console.log('Deploy a Firebase app\n');
}

export function printProjectInfo(
  displayName: string,
  projectId: string,
  protectedSite?: FirebaseHostingSite,
): void {
  console.log('Project');
  console.log(`  ${displayName}`);
  console.log(`  ${projectId}\n`);

  if (protectedSite) {
    console.log('Protected existing site');
    console.log(
      `  ${protectedSite.defaultUrl ?? `${protectedSite.siteId}.web.app`}`,
    );
    console.log('  This deployment will not modify it.\n');
  }
}

export function printDestination(siteId: string): void {
  console.log('Destination');
  console.log(`  ${siteId}.web.app\n`);
}

export function printSuccessReceipt(receipt: {
  deployedUrl: string;
  firebaseConsoleUrl: string;
  verified: boolean;
}): void {
  console.log('✓ Build passed');
  console.log('✓ Hosting site verified');
  console.log('✓ Deployment completed');
  if (receipt.verified) {
    console.log('✓ Live URL verified\n');
  } else {
    console.log('⚠ Live URL verification pending or unverified\n');
  }

  console.log('Live site:');
  console.log(receipt.deployedUrl);
  console.log('\nFirebase dashboard:');
  console.log(receipt.firebaseConsoleUrl);
}
