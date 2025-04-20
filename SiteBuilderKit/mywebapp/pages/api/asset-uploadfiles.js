import { getToken } from "next-auth/jwt";
import fs from 'fs';
import path from 'path';
import formidable from 'formidable-serverless';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../src/s3client';

export const config = {
    api: {
      bodyParser: false,
    },
};

let username;

async function handler(req, res) {

    const token = await getToken({ req })
    if (!token) {
        res.status(200).json({ ok:true, status: 401, error: 'Not authenticated!' });
        return;
    }
    username = token.name;

    if(req.method !== 'POST') return;

    const form = new formidable.IncomingForm();
    form.multiples = true;

    form.parse(req, async (err, fields, files) => {
        if (err) {
            res.status(500).json({ ok: false, error: "File upload error" });
            return;
        }

        let folderPath = fields.folderPath;

        if (process.env.SPACES_URL) { // If using DigitalOcean Spaces

            // User's path
            let $prefix = path.join(process.env.SPACES_PREFIX?process.env.SPACES_PREFIX:'', username);

            if (folderPath && !folderPath.endsWith('/')) folderPath += '/';

            if (!Array.isArray(files['file[]'])) {
                files['file[]'] = [files['file[]']];
            }

            await Promise.all(files['file[]'].map(file => {
                return new Promise(async (resolve, reject) => {

                    const allowedTypes = ['txt', 'css', 'js', 'html', 'md', 'svg', 'csv', 'json', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'mp4', 'mov', 'mp3', 'pdf', 'zip', 'rar'];

                    let extension = path.extname(file.name).toLowerCase(); // '.jpeg'

                    // Remove the period from the extension for accurate comparison
                    extension = extension.substring(1);

                    if (allowedTypes.includes(extension)) {

                        let imageFile = fs.createReadStream(file.path);

                        // // No resize for uploads in the Asset Manager
                        // if(extension  === '.jpeg' || extension === '.jpg') {
                        //     imageFile = await sharp(file.path).resize(1920, 1920, {
                        //         fit: sharp.fit.inside,
                        //         withoutEnlargement: true, 
                        //     })
                        //     .jpeg({ quality: 70, progressive: true, force: false })
                        //     .toBuffer();
                        // }

                        const bucketParams = {
                            Bucket: process.env.SPACES_BUCKET,
                            ACL: 'public-read',
                            Key: `${$prefix}/${folderPath}${file.name}`, 
                            Body: imageFile,
                            ContentType: file.type//contentType
                        };
                        try {
                            await s3Client.send(new PutObjectCommand(bucketParams));
                        } catch(e) {
                            res.status(500).json({ ok:true, status: 500, error: 'Something went wrong.' });
                        }
                        resolve();

                    } else {
                        resolve();
                    }

                });
            }));

            res.status(200).json({ ok: true, status: 200, message: 'Upload complete.' });

        } else {
            
            // User's path
            let $path = process.env.WEB_ASSETS_PATH + 'uploads/' + username + '/'; 

            if (!Array.isArray(files['file[]'])) {
                files['file[]'] = [files['file[]']];
            }
            
            const uploadedFileNames = [];

            await Promise.all(files['file[]'].map(async (file) => {
    
                uploadedFileNames.push(file.name);
                
                const allowedTypes = ['txt', 'css', 'js', 'html', 'md', 'svg', 'csv', 'json', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'mp4', 'mov', 'mp3', 'pdf', 'zip', 'rar'];
    
                let extension = path.extname(file.name).toLowerCase().substring(1);
    
                if (allowedTypes.includes(extension)) {
                    const newPath = path.join($path, folderPath, file.name);
                    try {
                        // await fs.promises.rename(file.path, newPath);
                        await fs.promises.copyFile(file.path, newPath);
                        await fs.promises.unlink(file.path);
                    } catch (err) {
                        res.status(500).json({ error: err.message, files: uploadedFileNames, path: $path });
                        return;
                    }
                }
            }));
    
            res.status(200).json({ ok: true, status: 200, message: 'Upload complete.', files: uploadedFileNames });
        }
    });
}

export default handler;