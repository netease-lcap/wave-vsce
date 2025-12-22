import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class KnowledgeBaseService {
    public async getKbItems(level: string, kbId: string | number | undefined, folderId: string | number | undefined, backendLink: string) {
        if (!backendLink) {
            throw new Error('未配置后台连接');
        }

        // Remove trailing slash if present
        const baseLink = backendLink.endsWith('/') ? backendLink.slice(0, -1) : backendLink;
        
        let url = '';
        if (level === 'root') {
            url = `${baseLink}/api/knowledge-base?page=1&pageSize=10`;
        } else if (level === 'kb') {
            url = `${baseLink}/api/knowledge-base/${kbId}/categories?page=1&pageSize=10`;
        } else if (level === 'folder') {
            url = `${baseLink}/api/knowledge-base/categories/${folderId}/files?page=1&pageSize=10`;
        }

        console.log(`[KnowledgeBase] 正在请求数据: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    public async downloadKbFile(fileId: string | number, fileName: string, backendLink: string): Promise<string> {
        if (!backendLink) {
            throw new Error('未配置后台连接');
        }

        // Remove trailing slash if present
        const baseLink = backendLink.endsWith('/') ? backendLink.slice(0, -1) : backendLink;
        const url = `${baseLink}/api/knowledge-base/files/${fileId}/download`;
        
        console.log(`[KnowledgeBase] 正在从知识库下载文件: ${fileName} (ID: ${fileId}), URL: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Determine download directory: system temp dir
        const downloadDir = path.join(os.tmpdir(), 'wave-artifacts');

        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }
        
        // Handle potential file name conflicts
        let finalPath = path.join(downloadDir, fileName);
        let counter = 1;
        while (fs.existsSync(finalPath)) {
            const ext = path.extname(fileName);
            const baseName = path.basename(fileName, ext);
            finalPath = path.join(downloadDir, `${baseName}_${counter}${ext}`);
            counter++;
        }
        
        fs.writeFileSync(finalPath, buffer);
        console.log(`[KnowledgeBase] 文件已下载到: ${finalPath}`);
        
        return finalPath;
    }
}
