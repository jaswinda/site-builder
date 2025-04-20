import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import axios from 'axios';
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

    if(req.method !== 'POST') return;

    let { prompt, negative_prompt, model, width, height, steps, guidance, seed, scheduler, output_format, folder_path } = req.body;

    let textToImageUrl = 'https://api.getimg.ai/v1/stable-diffusion/text-to-image';

    const GETIMG_API_KEY = process.env.GETIMG_API_KEY;

    let messages = { 
        model: model||'realistic-vision-v3',
        prompt: prompt,
        negative_prompt: negative_prompt,
        width: width||512,
        height: height||512,
        steps: steps||75,
        guidance: guidance||9,
        // seed: seed ? seed:undefined,
        scheduler: scheduler||'dpmsolver++',
        output_format: output_format||'jpeg'
    };

    if(model==='flux-schnell') {
        textToImageUrl = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';

        messages = { 
            prompt: prompt,
            width: width||512,
            height: height||512,
            output_format: output_format||'jpeg'
        };
    }

    if(model==='realvis-xl-v4') {
        textToImageUrl = 'https://api.getimg.ai/v1/stable-diffusion-xl/text-to-image';

        messages = { 
            model,
            prompt: prompt,
            negative_prompt: negative_prompt,
            width: width||512,
            height: height||512,
            steps: steps||30,
            guidance: guidance||7.5,
            seed: seed ? seed:undefined,
            output_format: output_format||'jpeg'
        };
    }

    const jsonPayload = JSON.stringify(messages);
    const config = {
        headers: {
            Authorization: `Bearer ${GETIMG_API_KEY}`,
            'Content-Type': 'application/json',
        },
    };
    const response = await axios.post(textToImageUrl, jsonPayload, config);
    if(!response.data.error){

        let base64Data=response.data.image;

        let contentType='image/jpeg';

        const fileData = new Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        let imageFile=fileData;
        let randomFileName = generateRandomFileName();
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

                res.status(200).json({ ok:true, status: 200, url: fileUrl});
            } catch (e) {
                res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });
            }

        } else {

            // User's path
            let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 
            let $urlpath = process.env.WEB_ASSETS_URL + '/uploads/' + username + '/';
            
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
        res.status(200).json({ ok:true, status: 500, error: 'Something went wrong.' });
    }
}

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

export default handler;
