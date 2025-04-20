
import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from "path";
import { ListObjectsCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';

let username;

export default async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    username = token.name;

    if(req.method !== 'POST') return;

    if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

        // User's path
        let $prefix = path.join(process.env.SPACES_PREFIX?process.env.SPACES_PREFIX:'', username);

        const { selectedItems, folderPath } = req.body;
        
        const deletePromises = selectedItems.map(async (item) => {
            const hasExtension = /\.[^/.]+$/.test(item); // Checks for filename with extension
            const isFolder = !hasExtension;

            const sourcePath = path.join($prefix, folderPath, item);

            if (isFolder) {
                await deleteFolderRecursively(sourcePath);
            } else {
                await deleteObject(sourcePath);
            }
        });
        await Promise.all(deletePromises);
    
    } else {

        // User's path
        let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

        const { selectedItems, folderPath } = req.body;
        
        const deletePromises = selectedItems.map(async (item) => {
            const itemPath = path.join($path, folderPath, item);
            deleteItem(itemPath);
        });
        await Promise.all(deletePromises);
    }

    res.status(200).json({ ok:true, status: 200, message: 'Selected files and folders deleted successfully.' });
}

function deleteItem(itemPath) {
    if (fs.existsSync(itemPath)) {
        const stats = fs.statSync(itemPath);

        if (stats.isFile()) {
            fs.unlinkSync(itemPath); // Delete file
        } else if (stats.isDirectory()) {
            fs.readdirSync(itemPath).forEach((file) => {
            const filePath = path.join(itemPath, file);
            deleteItem(filePath); // Recursively delete files and folders
            });
            fs.rmdirSync(itemPath); // Delete directory
        }
    }
}

// S3

async function deleteFolderRecursively(sourcePath) {

    sourcePath = sourcePath===''?'' : sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';

    let listObjectsResponse = await s3Client.send(
        new ListObjectsCommand({
            Bucket: process.env.SPACES_BUCKET, // Replace with your bucket name
            Prefix: sourcePath,
        })
    );

    for (const object of listObjectsResponse.Contents) {
        const relativePath = object.Key.substring(sourcePath.length);

        if (object.Size === 0) {
            // It's a subfolder. Will be deleted later.
            // Do Nothing
        } else {
            // It's a file
            await deleteObject(object.Key);
        }
    }

    // Delete empty folders
    listObjectsResponse = await s3Client.send(
        new ListObjectsCommand({
            Bucket: process.env.SPACES_BUCKET,
            Prefix: sourcePath,
        })
    );
    for (const object of listObjectsResponse.Contents) {
        if (object.Size === 0) {
            await s3Client.deleteObject({
                Bucket: process.env.SPACES_BUCKET,
                Key: object.Key
            });
        }
    }
}

async function deleteObject(sourcePath) {
    await s3Client.deleteObject({
        Bucket: process.env.SPACES_BUCKET,
        Key: sourcePath
    });
}
