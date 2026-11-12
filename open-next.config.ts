import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Every page is dynamic (tenant per hostname), so no incremental cache is set up.
export default defineCloudflareConfig({});
