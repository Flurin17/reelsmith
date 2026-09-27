import { Config } from '@remotion/cli/config';

// Settings for `pnpm studio` / `npx remotion render`. The reelsmith CLI passes
// its own options. Remotion bundles Chrome + ffmpeg: no system installs needed.
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setConcurrency(4);

export {};
