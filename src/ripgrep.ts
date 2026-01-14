import * as path from 'path';
import * as os from 'os';

const platform = os.platform();
const arch = os.arch();
const isWin = platform === 'win32';
const binaryName = `rg-${platform}-${arch}${isWin ? '.exe' : ''}`;

export const rgPath = path.join(__dirname, '..', 'bin', binaryName);
