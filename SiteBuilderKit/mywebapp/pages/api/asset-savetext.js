import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from "path";
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';

let username;

async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    username = token.name;

    if(req.method === 'POST') {

        const { fileName, text, folderPath } = req.body;

        if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

            // User's path
            const $prefix = path.join(process.env.SPACES_PREFIX?process.env.SPACES_PREFIX:'', username);
            
            const filePath = path.join($prefix, folderPath, fileName);

            try {
                const params = {
                    Bucket: process.env.SPACES_BUCKET,
                    Key: filePath,
                    Body: text,
                    ACL: 'public-read',
                    ContentType: getContentType(fileName),
                };

                await s3Client.send(new PutObjectCommand(params));
        
                res.status(200).json({ ok:true, message: 'File saved successfully.' });
            } catch(error) {
                res.status(200).json({ status: 500, error: 'Failed to save the file.' });
            }

        } else {

            // User's path
            const $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 
    
            const filePath = path.join($path, folderPath, fileName);
    
            fs.writeFile(filePath, text, (error) => {
                if (error) {
                    res.status(200).json({ status: 500, error: 'Something went wrong.' });
                } else {
                    res.status(200).json({ ok:true, status: 200 });
                }
            });

        }

    }
}

function getContentType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const contentTypeMap = {
        txt: 'text/plain',
        css: 'text/css',
        js: 'text/javascript',
        html: 'text/html',
        md: 'text/markdown',
        svg: 'text/image/svg+xml',
        csv: 'text/csv',
        json: 'application/json',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        tiff: 'image/tiff',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        mp3: 'audio/mpeg',
        pdf: 'application/pdf',
        zip: 'application/zip',
        rar: 'application/x-rar-compresseddf',
        // Add more mappings as needed
    }
    return contentTypeMap[extension] || 'application/octet-stream';
};

export default handler;