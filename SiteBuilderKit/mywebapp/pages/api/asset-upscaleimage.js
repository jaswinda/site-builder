// import { getSession } from 'next-auth/react';
import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';
import sharp from 'sharp';

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}

function generateRandomFileName(s) {
    const randomLength = 5;
    const randomString = generateRandomString(randomLength);
    if(s) return `ai-${randomString}-${s}`;
    else return `ai-${randomString}`;
}

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

    if(req.method !== 'POST') return;

    let { image, folder_path } = req.body;

    const upscaleImageUrl = 'https://api.getimg.ai/v1/enhacements/upscale';

    const GETIMG_API_KEY = process.env.GETIMG_API_KEY;

    const messages = { 
        model: 'real-esrgan-4x',
        image: image,
        scale: 4,
        output_format: "jpeg"
    };
    
    const jsonPayload = JSON.stringify(messages);
    const config = {
        headers: {
            Authorization: `Bearer ${GETIMG_API_KEY}`,
            'Content-Type': 'application/json',
        },
    };
    const response = await axios.post(upscaleImageUrl, jsonPayload, config);
    if(!response.data.error){

        let base64Data=response.data.image;

        let contentType='image/jpeg';

        const fileData = new Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        let imageFile=fileData;
        let randomFileName = generateRandomFileName('lg');
        let filename = randomFileName + '.jpg';

        if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

            let filePath = path.join(username, folder_path, filename);

            if (folder_path && !folder_path.endsWith('/')) folder_path += '/';
            let fileUrl = process.env.SPACES_URL + '/' + username + '/' + folder_path + filename

            const bucketParams = {
                Bucket: process.env.SPACES_BUCKET,
                ACL: 'public-read',
                Key: filePath, 
                Body: imageFile,
                ContentEncoding: 'base64', 
                ContentType: contentType
            };

            try {
                await s3Client.send(new PutObjectCommand(bucketParams));
                
                let img = new Buffer.from(base64Data, 'base64');
                let thumbnail = await sharp(img).resize(100, 100, {
                    fit: sharp.fit.inside,
                    withoutEnlargement: true, 
                }).toBuffer();
                await s3Client.send(new PutObjectCommand({
                    Bucket: process.env.SPACES_BUCKET,
                    ACL: 'public-read',
                    Key: `${username}/thumbs/${filename}`, 
                    Body: thumbnail,
                    ContentType: contentType
                }));

                res.status(200).json({ ok:true, status: 200, url: fileUrl});
            } catch (e) {
                res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });
            }

        } else {
    
            // User's path
            $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 
            $urlpath = process.env.WEB_ASSETS_URL + '/uploads/' + username + '/';

            return new Promise((resolve, reject) => {

                const directoryPath = $path;

                if (!fs.existsSync(directoryPath)){
                    fs.mkdirSync(directoryPath, { recursive: true });
                }
    
                let imageFile=base64Data;

                let filePath = path.join(directoryPath, folder_path, filename);
                let fileUrl = $urlpath + folder_path + filename;
    
                fs.writeFile(filePath, imageFile, 'base64', async (err)=>{
                    if (err) {
                        res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });
                        resolve(); 
                        return;
                    } 
    
                    res.status(200).json({ ok:true, status: 200, url: fileUrl});
                    resolve();
                });

            });

        }

    } else {
        res.json({ error: 'Something went wrong.' });
    }

}

export default handler;
