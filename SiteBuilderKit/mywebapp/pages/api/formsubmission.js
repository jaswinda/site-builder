import { connectDatabase } from '../../src/db';
import { getSiteInfo } from '../../src/domain';
import nodemailer from 'nodemailer';
import formidable from 'formidable-serverless';

const fetch = require('isomorphic-fetch');

export const config = {
    api: {
      bodyParser: false,
    },
};

async function parseForm(req) {
    return new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

async function handler(req, res) {

    if(req.method === 'POST') {
        let fields, files;

        try {
            const result = await parseForm(req);
            fields = result.fields;
            files = result.files;
        } catch (err) {
            return res.status(500).json({ error: "Failed to parse form data" });
        }

        if(fields.reference_code!=='') {
            if(data.reference_code && data.reference_code!=='') { //protection
                res.status(200).json({ ok:true, status: 500, error: 'failed to send email..' });
                return;
            }
        }

        let token = fields['g-recaptcha-response'];

        // console.log(fields); // Logs the name-value pairs
        // console.log(files);  // Logs any uploaded files

        const message = Object.entries(fields)
            .filter(([key]) => !['g-recaptcha-response', 'reference_code'].includes(key)) // Exclude specific fields
            .map(([key, value]) => `${key}: ${value || 'Not provided'}`)
            .join('<br>');

        let client;
        try {
            client = await connectDatabase();
        } catch (error) {
            res.status(200).json({ ok:true, status: 500, error: 'Connecting to the database failed.' });
            return;
        }

        try {
            const db = client.db();

            let siteOwnerEmail;
            let secretKey;
            let mailSmtp = process.env.EMAIL_SMTP?process.env.EMAIL_SMTP:'';
            let mailPort = process.env.EMAIL_PORT?process.env.EMAIL_PORT:'';
            let mailUser = process.env.EMAIL_USER?process.env.EMAIL_USER:'';
            let mailPassword = process.env.EMAIL_PASSWORD?process.env.EMAIL_PASSWORD:'';
            let mailFrom = process.env.EMAIL_FROM?process.env.EMAIL_FROM:'';
            let mailName = process.env.EMAIL_NAME?process.env.EMAIL_NAME:'';

            const site = await getSiteInfo(req.headers.host)
            if(site) {
                if(site.mailSmtp) mailSmtp = site.mailSmtp;
                if(site.mailPort) mailPort = site.mailPort;
                if(site.mailUser) mailUser = site.mailUser;
                if(site.mailPassword) mailPassword = site.mailPassword;
                if(site.mailFrom) mailFrom = site.mailFrom;
                if(site.mailName) mailName = site.mailName;
                siteOwnerEmail = site.email;

                secretKey = site.captchaSecretKey; 

                const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
                let response = await fetch(url);
                response = await response.json();
                if(response.success !== undefined && !response.success) {
                    await client.close();
                    res.status(200).json({ ok:true, status: 401, error: 'Failed captcha verification.' });
                    return;
                }

                let transporter = nodemailer.createTransport({
                    host: mailSmtp,
                    port: mailPort,
                    auth: {
                        user: mailUser,
                        pass: mailPassword
                    }
                });

                const mailOptions = {
                    from: mailName?`${mailName} <${mailFrom}>`: mailFrom,
                    to: siteOwnerEmail,
                    subject: 'Incoming Form Submission',
                    html: `
                    <p>
                        ${message}
                    </p>
                    `,
                };

                // console.log(message);
                // res.status(200).json({ ok:true, status: 200 });
                // return;
                
                try {
                    await transporter.sendMail(mailOptions);
                    await client.close();
                    res.status(200).json({ ok: true, status: 200 });
                } catch (emailError) {
                    await client.close();
                    res.status(200).json({ ok: true, status: 500, error: 'failed to send email.' });
                }

            } else {
                await client.close();
                res.status(200).json({ ok:true, status: 500, error: 'Something went wrong.' });
            }

        } catch(e) {
            await client.close();
            res.status(200).json({ ok:true, status: 500, error: 'Something went wrong.' });
        }


    }
}

export default handler;
