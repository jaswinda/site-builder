import https from 'https';
import http from 'http'; // Import the 'http' module

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).end(); // Method Not Allowed
        return;
    }

    const fileUrl = req.query.url; // Get the image URL from the query parameter

    if (!fileUrl) {
        res.status(400).send('Bad Request');
        return;
    }

    const httpOrHttps = fileUrl.startsWith('https://') ? https : http; // Use 'http' or 'https' module based on the URL

    httpOrHttps.get(fileUrl, (response) => {
        const { statusCode, headers } = response;

        if (statusCode !== 200) {
            res.status(statusCode).send('File not found');
            return;
        }

        // res.setHeader('Content-Type', headers['content-type']);
        // response.pipe(res);

        const getFilenameFromUrl = (fileUrl) => fileUrl.split('/').pop();
        const filename = getFilenameFromUrl(fileUrl);
        const contentType = getContentType(filename);

        res.setHeader('Content-Type', contentType);
        response.pipe(res);

    }).on('error', (error) => {
        console.error(error);
        res.status(500).send('Server error');
    });
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