import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import { PutObjectCommand, HeadObjectCommand} from '@aws-sdk/client-s3';
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

        const folderName = req.body.folderName;
        const folderPath = req.body.folderPath;

        const itemPath = path.join($prefix, folderPath, folderName);
        await createFolderIfNotExist(itemPath)

        res.status(200).json({ ok:true, status: 200, message:  'Folder created successfully.' })

    } else {

        // User's path
        let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

        const folderName = req.body.folderName;
        const folderPath = req.body.folderPath;

        const itemPath = path.join($path, folderPath, folderName);

        if (fs.existsSync(itemPath)) {
            res.status(400).json({ error: 'Folder already exists.' });
            return;
        }
        try {
            fs.mkdirSync(itemPath); // Create the new folder
            res.status(200).json({ ok:true, status: 200, message:  'Folder created successfully.' });
        } catch (error) {
            res.status(200).json({ error:'Error creating folder.', status: 500 });
        }
    }
}

// S3

async function createFolderIfNotExist(Key) {
    if (!(await existsFolder(Key))) {
        return await createFolder(Key);
    }
}

async function existsFolder(Key) {
    try {
        const bucketParams = { 
            Bucket: process.env.SPACES_BUCKET,
            Key: Key
        };
        await s3Client.send(new HeadObjectCommand(bucketParams));
        return true;
    } catch (error) {
        if (error.name === "NotFound") {
            return false;
        } else {
            throw error;
        }
    }
}

async function createFolder(Key) {
    if (!Key.endsWith('/')) {
        Key += '/';
    }
    const bucketParams = { 
        Bucket: process.env.SPACES_BUCKET,
        Key: Key
    };
    await s3Client.send(new PutObjectCommand(bucketParams));
}
