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

        let { currentName, newName, folderPath } = req.body;

        const hasExtension = /\.[^/.]+$/.test(currentName); // Checks for filename with extension
        const isFolder = !hasExtension;

        const sourcePath = path.join($prefix, folderPath, currentName);
        const destinationPath = path.join($prefix, folderPath, newName);

        if (isFolder) {
            await renameFolder(sourcePath, destinationPath);
        } else {
            await renameFile(sourcePath, destinationPath);
        }

    } else {

        // User's path
        let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

        const { currentName, newName, folderPath } = req.body;

        const currentItemPath = path.join($path, folderPath, currentName);
        const newItemPath = path.join($path, folderPath, newName);

        fs.renameSync(currentItemPath, newItemPath);
    }
    
    res.status(200).json({ ok:true, status: 200, message: 'File renamed successfully.' });
}

// S3

async function renameFolder(sourcePath, destinationPath) {

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
            await copyFolder(object.Key, newDestinationPath);
        } else {
            // It's a file
            await renameFile(object.Key, newDestinationPath);
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

async function copyFolder(sourcePath, destinationPath) {
    const bucketParams = {
        Bucket: process.env.SPACES_BUCKET,
        CopySource: path.join(process.env.SPACES_BUCKET, sourcePath),
        Key: destinationPath,
        ACL: 'public-read'
    };
    await s3Client.copyObject(bucketParams);
}

async function renameFile(sourcePath, destinationPath) {
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

