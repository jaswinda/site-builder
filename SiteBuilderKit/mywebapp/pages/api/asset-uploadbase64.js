import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';
import sharp from 'sharp';

let $path =  process.env.WEB_ASSETS_PATH;
let $urlpath = process.env.WEB_ASSETS_URL;
let username;

async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    username = token.name;

    if(req.method === 'POST') {
        // const username = session.user.name;
        const base64Data = req.body.image;
        const filename = req.body.filename;

        if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

            const fileData = new Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');

            let extension = path.extname(filename).toLowerCase();
            if(extension  !== '.jpeg' && extension !== '.jpg' && extension !== '.png' && extension !== '.gif' && extension  !== '.mp4') {
                res.status(500).json({ ok:true, status: 500, error: 'File type not allowed.' });
                return;
            }

            let contentType = 'application/octet-stream';
            if(extension  === '.jpeg' || extension === '.jpg') {
                contentType='image/jpeg';
            } else if (extension === '.png') {
                contentType='image/png';
            } else if (extension === '.gif') {
                contentType='image/gif';
            } else if(extension  === '.mp4') {
                contentType='video/mp4';
            }

            let imageFile=fileData;
            if(extension  === '.jpeg' || extension === '.jpg') {
                let img = new Buffer.from(base64Data, 'base64');
                imageFile = await sharp(img).resize(1920, 1920, {
                    fit: sharp.fit.inside,
                    withoutEnlargement: true, 
                })
                .jpeg({ quality: 70, progressive: true, force: false })
                .toBuffer();
            }

            const bucketParams = {
                Bucket: process.env.SPACES_BUCKET,
                ACL: 'public-read',
                Key: `${username}/${filename}`, 
                Body: imageFile, 
                ContentEncoding: 'base64', 
                ContentType: contentType
            };

            try {
                await s3Client.send(new PutObjectCommand(bucketParams));

                res.status(200).json({ ok:true, status: 200, url:  process.env.SPACES_URL + '/' + username + '/' + filename});
            } catch (e) {
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

            let extension = path.extname(filename).toLowerCase();

            const directoryPath = $path;

            let imageFile=base64Data;
            if(extension  === '.jpeg' || extension === '.jpg') {
                let img = new Buffer.from(base64Data, 'base64');
                imageFile = await sharp(img).resize(1920, 1920, {
                    fit: sharp.fit.inside,
                    withoutEnlargement: true, 
                })
                .jpeg({ quality: 70, progressive: true, force: false })
                .toBuffer();
            }
    
            fs.writeFileSync(path.join(directoryPath,filename), imageFile, 'base64');
            
            res.status(200).json({ ok:true, status: 200, url:  $urlpath + filename});
        }

    }
}

export default handler;