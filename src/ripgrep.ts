import * as path from 'path';

export const rgPath = path.join(__dirname, '..', 'bin', `rg${process.platform === 'win32' ? '.exe' : ''}`);
