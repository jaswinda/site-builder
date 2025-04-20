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

        let { selectedItems, folderPath, targetPath } = req.body;
        
        if(targetPath==='') targetPath=$prefix; // Means root. Add $prefix.

        const movePromises = selectedItems.map(async (item) => {
            const hasExtension = /\.[^/.]+$/.test(item); // Checks for filename with extension
            const isFolder = !hasExtension;

            const sourcePath = path.join($prefix, folderPath, item);
            const destinationPath = path.join(targetPath, item); // targetPath already includes $prefix

            if (isFolder) {
                await copyFolderRecursively(sourcePath, destinationPath);
            } else {
                await copyObjectAndDelete(sourcePath, destinationPath);
            }
        });
        await Promise.all(movePromises);

    } else {

        // User's path
        let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

        const { selectedItems, folderPath, targetPath } = req.body;
        
        const movePromises = selectedItems.map(async (item) => {
            const sourcePath = path.join($path, folderPath, item);
            const destinationPath = path.join($path, targetPath, item);
            moveFile(sourcePath, destinationPath);
        });
        await Promise.all(movePromises);
    }


    res.status(200).json({ ok:true, status: 200, message: 'Selected files moved successfully.' });
}

function moveFile(sourcePath,destinationPath) {
    fs.rename(sourcePath, destinationPath, (err) => {
        if (err) {
            console.error('Error moving the file:', err);
        } 
    });
}

// S3

async function copyFolderRecursively(sourcePath, destinationPath) {

    let listObjectsResponse = await s3Client.send(
        new ListObjectsCommand({
            Bucket: process.env.SPACES_BUCKET, // Replace with your bucket name
            Prefix: sourcePath,
        })
    );

    for (const object of listObjectsResponse.Contents) {
        const relativePath = object.Key.substring(sourcePath.length);
        const newDestinationPath = `${destinationPath}${relativePath}`;

        if (object.Size === 0) {
            // It's a subfolder
            await copyObject(object.Key, newDestinationPath);
        } else {
            // It's a file
            await copyObjectAndDelete(object.Key, newDestinationPath);
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

async function copyObject(sourcePath, destinationPath) {
    const bucketParams = {
        Bucket: process.env.SPACES_BUCKET,
        CopySource: path.join(process.env.SPACES_BUCKET, sourcePath),
        Key: destinationPath,
        ACL: 'public-read'
    };
    await s3Client.copyObject(bucketParams);
}

async function copyObjectAndDelete(sourcePath, destinationPath) {
    const bucketParams = {
        Bucket: process.env.SPACES_BUCKET,
        CopySource: path.join(process.env.SPACES_BUCKET, sourcePath),
        Key: destinationPath,
        ACL: 'public-read'
    };
    await s3Client.copyObject(bucketParams);

    await s3Client.deleteObject({
        Bucket: process.env.SPACES_BUCKET,
        Key: sourcePath
    });
}