import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from "path";

let $path =  process.env.WEB_ASSETS_PATH;

export default async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    const username = token.name;

    // User's path
    $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

    if(req.method === 'GET') {

        const folderStructure = generateFolderStructure($path);

        res.status(200).json({ ok:true, status: 200, folders:  folderStructure});
    }
}

function generateFolderStructure(directoryPath, parentPath = '') {
    const folders = [];
  
    const items = fs.readdirSync(directoryPath);
  
    items.forEach(item => {
        const itemPath = path.join(directoryPath, item);
        const relativePath = path.join(parentPath, item);
    
        const stat = fs.statSync(itemPath);
    
        if (stat.isDirectory()) {
            const subfolders = generateFolderStructure(itemPath, relativePath);
            folders.push({
            name: item,
            path: relativePath, 
            subfolders: subfolders
            });
        }
    });
    return folders;
}