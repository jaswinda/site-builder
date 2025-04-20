// import { getSession } from 'next-auth/react';
import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import formidable from 'formidable-serverless';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';
import sharp from 'sharp';

export const config = {
    api: {
      bodyParser: false,
    },
};

let $path =  process.env.WEB_ASSETS_PATH;
let $urlpath = process.env.WEB_ASSETS_URL;
let username;

export default async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    username = token.name;

    if(req.method === 'POST') {

        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {

            if (err) return res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });

            let extension = path.extname(files.file.name).toLowerCase();
            if(extension  !== '.jpeg' && extension !== '.jpg' && extension !== '.png' && extension !== '.gif' && extension !== '.ico' && extension  !== '.webp' && extension  !== '.webm' && extension  !== '.mp4' && extension  !== '.mp3') {
                res.status(500).json({ ok:true, status: 500, error: 'File type not allowed.' });
                return;
            }
            
            const file = fs.readFileSync(files.file.path);

            // File will be uploaded in /username/date/
            // Thumbnail will be created in /username/date/thumbs/

            if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

                let imageFile = file;
                if(extension  === '.jpeg' || extension === '.jpg') {
                    imageFile = await sharp(files.file.path).resize(1920, 1920, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true, 
                    })
                    .jpeg({ quality: 70, progressive: true, force: false })
                    .toBuffer();
                }

                const bucketParams = {
                    Bucket: process.env.SPACES_BUCKET,
                    ACL: 'public-read',
                    Key: `${username}/${files.file.name}`, 
                    Body: imageFile,
                    ContentType: files.file.type//contentType
                };
                try {
                    await s3Client.send(new PutObjectCommand(bucketParams));
                    
                    res.status(200).json({ ok:true, status: 200, url:  process.env.SPACES_URL + '/' + username + '/' + files.file.name});
                } catch(e) {
                    res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });
                }

            } else {
                
                // User's path
                $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/';
                $urlpath = process.env.WEB_ASSETS_URL + '/uploads/' + username + '/';
                
                // check
                if (!fs.existsSync($path)){
                    fs.mkdirSync($path, { recursive: true });
                }

                const directoryPath = $path;

                let imageFile = file;
                if(extension  === '.jpeg' || extension === '.jpg') {
                    imageFile = await sharp(files.file.path).resize(1920, 1920, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true, 
                    })
                    .jpeg({ quality: 80, progressive: true, force: false })
                    .toBuffer();
                }

                fs.writeFile(path.join(directoryPath, files.file.name), imageFile, async (err)=>{
                    if (err) {
                        res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });
                        return 
                    } 
                    res.status(200).json({ ok:true, status: 200, url: $urlpath + files.file.name});
                });

            }

        });
         
    }
}