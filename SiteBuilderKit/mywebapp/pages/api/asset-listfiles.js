import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';

let username;
let $folderTree = [];

export default async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    username = token.name;

    if(req.method !== 'POST') return;

    if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

        if(req.method === 'POST') {
            const folderPath = req.body.folderPath; //path.join($prefix, req.body.folderPath);

            let fileList = await getFilesAndFoldersS3(folderPath); // This will also set the $folderTree

            res.status(200).json({ contents: fileList, folders: $folderTree}); // Add the $folderTree
        }

    } else {

        // User's path
        let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

        // check
        if (!fs.existsSync($path)){
            fs.mkdirSync($path, { recursive: true });
        }

        const folderPath = req.body.folderPath;

        const fileList = getFilesAndFolders(folderPath);

        res.status(200).json({ ok:true, status: 200, contents:  fileList});
    }

}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        // return stats.size; // Return size in bytes

        const fileSizeInBytes = stats.size;
        let fileSizeFormatted = '';

        if (fileSizeInBytes >= 1024 * 1024) {
            fileSizeFormatted = (fileSizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
        } else {
            fileSizeFormatted = (fileSizeInBytes / 1024).toFixed(0) + ' KB';
        }

        return fileSizeFormatted;

    } catch (error) {
        console.error('Error getting file size:', error);
        return null;
    }
}

function getFilesAndFolders(folderPath) {

    // User's path
    let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 
    let $urlpath = process.env.WEB_ASSETS_URL + '/uploads/' + username + '/';

    folderPath = folderPath===''?'' : folderPath.endsWith('/') ? folderPath : folderPath + '/';

    let items;
    try {
        items = fs.readdirSync($path + folderPath);
    } catch(e) {
        items = fs.readdirSync($path + folderPath);
    }

    const folders = [];
    const files = [];

    items.forEach((item) => {
        const itemPath = path.join($path + folderPath, item);

        const stats = fs.statSync(itemPath);

        const isDirectory = stats.isDirectory();

        const fileSize = getFileSize(itemPath);

        let url = $urlpath + folderPath + item;

        const itemObj = {
            name: item,
            type: isDirectory ? 'folder' : 'file',
            url: url,     
            modified: stats.mtime, 
            created: stats.birthtime,
            size: fileSize
        };

        if (isDirectory) {
            folders.push(itemObj);
        } else {
            files.push(itemObj);
        }
    });

    // Sort files by creation date in descending order (newest first)
    files.sort((a, b) => b.modified - a.modified);

    const fileList = [...folders, ...files];

    return fileList;
}

// S3


async function getFilesAndFoldersS3(folderPath) {

    // User's path
    let $prefix = path.join(process.env.SPACES_PREFIX?process.env.SPACES_PREFIX:'', username);
    
    try {
        let folderSet = new Set();

        let continuationToken = undefined;

        const subContents = [];
        const folders = [];
        const files = [];

        let urlPath = process.env.SPACES_URL;

        if (folderPath && !folderPath.endsWith('/')) folderPath += '/';

        while (true) {
            const bucketParams = { 
                Bucket: process.env.SPACES_BUCKET,
                // Prefix: $prefix,
                Prefix: path.join($prefix, folderPath), // Instead of using $prefix only, applying folderPath will improve the performance
                ContinuationToken: continuationToken
            };
            const data = await s3Client.send(new ListObjectsV2Command(bucketParams));

            if(data.Contents) data.Contents.forEach(item => {

                const key = item.Key;
                const _folders = key.split('/');
                // Skip the actual object itself
                if (_folders.length > 1) {
                    folderSet.add(_folders.slice(0, -1).join('/'));
                } 

                let currentPath = path.join($prefix, folderPath);
                // Append a '/' to the end of the currentPath if it's missing
                if(currentPath!=='') if (!currentPath.endsWith('/')) {
                    currentPath += '/';
                }

                if (item.Key.startsWith(currentPath)) {
          
                    // Extract the remaining part of the Key after currentPath
                    const subKey = item.Key.slice(currentPath.length);
                    
                    // Check if the remaining part contains any additional slashes
                    if (subKey.includes('/')) {
                        // Extract the first part before the next slash (folder name)
                        const subFolder = subKey.split('/')[0];
                        
                        // Add the folder name to folders if not already present
                        const hasFolder = folders.some(folder => folder.name === subFolder && folder.type === 'folder');
                        if (!hasFolder) {
                            // Folders
                            let itemObj = {};
                            itemObj.name = subFolder;
                            itemObj.type = 'folder';
                            itemObj.url = subFolder;
                            folders.push(itemObj);
                            // console.log(subFolder)
                        }
                    } else {
                        // Files
                        let itemObj = {};
                        itemObj.name = subKey;
                        itemObj.type = 'file';
                        itemObj.url = urlPath ? urlPath + '/' + item.Key : item.Key;
                        itemObj.created = item.LastModified;
                        itemObj.modified = item.LastModified;
                        itemObj.size = getFileSizeS3(item.Size);
                        if(subKey!=='') files.push(itemObj);
                    }
                }

            });
    
            if (!data.IsTruncated) {
                break;
            }
            continuationToken = data.NextContinuationToken;
        }

        // Sort the folders array alphabetically
        // folders.sort((a, b) => a.name.localeCompare(b.name));
        // Sort the files array by the 'modified' date
        files.sort((a, b) => new Date(b.modified) - new Date(a.modified));

        subContents.push(...folders, ...files);

        const structuredFolders = restructureFolders(folderSet);
        // console.log(JSON.stringify(structuredFolders, null, 2));
        $folderTree = structuredFolders;

        if($folderTree.length>0) {
            if($prefix!=='') $folderTree = $folderTree[0].subfolders; // Do not show the root (prefix)

            if($folderTree.length>0) {
                // If $prefix = 'myfiles/Building';
                if($folderTree[0].path === $prefix ) $folderTree = $folderTree[0].subfolders; // Do not show the root (prefix) 
            }
        }

        return subContents;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function getFileSizeS3(fileSizeInBytes) {
    let fileSizeFormatted = '';

    if (fileSizeInBytes >= 1024 * 1024) {
        fileSizeFormatted = (fileSizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
        fileSizeFormatted = (fileSizeInBytes / 1024).toFixed(0) + ' KB';
    }

    return fileSizeFormatted;
}

function restructureFolders(flatFolders) {
    const folderMap = new Map();
    const rootFolders = [];

    // Create a mapping of folder paths to folder objects
    flatFolders.forEach(folderPath => {
        const parts = folderPath.split('/');
        let currentPath = '';
        let currentParent = null;

        parts.forEach(part => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            let path;
            // if($prefix!=='') path = currentPath.replace(`${$prefix}/`,''); // Do not show the root (prefix)
            // else path = currentPath;
            path = currentPath; // Shows prefix

            if (!folderMap.has(currentPath)) {
                const folder = {
                    name: part,
                    // path: currentPath,
                    path: path, 
                    subfolders: []
                };

                folderMap.set(currentPath, folder);

                if (currentParent) {
                    currentParent.subfolders.push(folder);
                } else {
                    rootFolders.push(folder);
                }
            }

            currentParent = folderMap.get(currentPath);
        });
    });

    return rootFolders;
}
