import { getSession } from 'next-auth/react';
import { useEffect,useState,useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { connectDatabase } from '../src/db';
import AddConfirm from '../src/addconfirm';
import ContentBox from '@innovastudio/contentbox';
// import ContentBox from '../src/contentbox/contentbox.js';
import { getSiteByDomain } from '../src/domain';
import Notif from '../src/notif';
import { RenderCssIncludes, RenderJsIncludes } from '../src/render';

export default function Home(props) {

    let intervalId, previousHtml; //Used for Auto Save

    const builderRef = useRef(null);

    const [notif, setNotif] = useState({});
    const [searchParams, setSearchParams] = useState(null);
    const [confirmShow, setConfirmShow] = useState(false);
    const [pageName, setPageName] = useState('');
    const [pageHtml, sePagetHtml] = useState('');

    useEffect(()=>{
        edit();

        return () => {
            if (builderRef.current) {
                builderRef.current.destroy();
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // https://stackoverflow.com/questions/55840294/how-to-fix-missing-dependency-warning-when-using-useeffect-react-hook

    async function edit() {
        /*
        let enableAiAssistantOnAllSites = false; //false => AI Assistant will be enabled on main site only
        let enableAiImageGenerationOnAllSites = false; //false => AI Image Generation will be enabled on main site only

        let mainHost = props.mainHost; //true/false
        let enableAiAssistant = props.aiAssistant;
        let enableImageGeneration = props.aiImageGeneration;
        if(!enableAiAssistantOnAllSites) {
            if(!mainHost) {
                enableAiAssistant=false;
            }
        }
        if(!enableAiImageGenerationOnAllSites) {
            if(!mainHost) {
                enableImageGeneration=false;
            }
        }
        */
        let enableAiAssistant = props.aiAssistant;
        let enableImageGeneration = props.aiImageGeneration;

        const session = await getSession();
        if(!session) return;
        addExternalStyles([
            '/contentbox/contentbox.css',
            '/contentbuilder/contentbuilder.css'
        ]);

        const obj = new ContentBox({
            wrapper: '.is-wrapper',

            canvas: true,
            
            controlPanel: true,
            iframeSrc: 'blank.html',
            zoom: 1,
            screenMode: 'desktop', // or fullview
            topSpace: true, // to give a space on top for custom toolbar
            iframeCentered: true,

            toggleDeviceButton: false,
            deviceButtons: false,

            // To enable AI Assistant
            sendCommandUrl: enableAiAssistant?'/api/sendcommand':'',
            AIToolbar: false,
            // showDisclaimer: false,
            // startAIAssistant: true, // Auto open 'AI Assistant' panel
            // enableShortCommands: false,
            speechRecognitionLang: 'en-US', 
            triggerWords: {
                send: ['send', 'okay', 'ok', 'execute', 'run'],
                abort: ['abort', 'cancel'],
                clear: ['clear', 'erase']
            },

            // If using DeepGram for speech recognition, specify the speechTranscribeUrl.
            // speechTranscribeUrl: `ws://${props.domainName.replace(':3000','')}:3002`,
            // The server implementation for ws://localhost:3002 can be found in server.js (Node.js code)

            enableAnimation: true,

            // Enabling AI image generation
            textToImageUrl: enableImageGeneration?'/api/asset-texttoimage':'', 
            upscaleImageUrl: '/api/asset-upscaleimage',
            imageModel: 'flux-schnell',
            // imageAutoUpscale: false,

            // imageSelectWidth: '90vw',
            // imageSelectHeight: '70vh',
            // fileSelectWidth: '90vw',
            // fileSelectHeight: '70vh',
            // videoSelectWidth: '90vw',
            // videoSelectHeight: '70vh',
            // audioSelectWidth: '90vw',
            // audioSelectHeight: '70vh',
            // mediaSelectWidth: '90vw',
            // mediaSelectHeight: '70vh',

            // imageSelectMaxWidth: '850px',
            // fileSelectMaxWidth: '850px',
            // videoSelectMaxWidth: '850px',
            // audioSelectMaxWidth: '850px',
            // mediaSelectMaxWidth: '850px',

            /*
            TIPS:
            oAdd event parameter is triggered when a snippet is dropped into the page.
            This event can be used to modify the snippet being dropped, for example, replacing custom tag with value from the server.
            For example, here we replace Google reCaptcha Site Key {recaptchakey} with a value stored from the server.
            With this you can create custom snippets with your own custom tags. Then you can replace custom tags
            inside the onAdd function.
            */
            onAdd: (html)=>{
                html = html.replace(new RegExp(encodeURIComponent('{recaptchakey}'), 'g'), props.captchaSiteKey);
                return html;
            },

            // framework: 'tailwind', (also include assets/frameworks/tailwindcss/styles.css)

            imageSelect: '/files.html',
            videoSelect: '/files.html',
            audioSelect: '/files.html',
            fileSelect: '/files.html',
            mediaSelect: '/files.html',

            listFilesUrl: '/api/asset-listfiles',
            listFoldersUrl: '/api/asset-listfolders', // not needed when using S3
            deleteFilesUrl: '/api/asset-deletefiles',
            moveFilesUrl: '/api/asset-movefiles',
            createFolderUrl: '/api/asset-createfolder',
            uploadFilesUrl: '/api/asset-uploadfiles',
            renameFileUrl: '/api/asset-renamefile',
            getMmodelsUrl: '/api/asset-getmodels', // Currently not use
            textToImageUrl: '/api/asset-texttoimage', // Enabling AI image generation
            upscaleImageUrl: '/api/asset-upscaleimage', // Enabling AI image generation
            controlNetUrl: '/api/asset-controlnet',
            saveTextUrl: '/api/asset-savetext',
            // viewUrl: '/api/asset-view', // Used if using S3 (for secure bucket)
            viewFileUrl: '/api/asset-viewfile', // Used if using S3 (for public bucket)

            assetFolderTree: true, 
            assetFilesOnly: enableImageGeneration?false:true, 

            previewPage: '/preview.html',

            //-- New Template System:
            templates: [
                {   
                    url: 'assets/templates-simple/templates.js',
                    path: 'assets/templates-simple/', 
                    pathReplace: [],
                    numbering: true,
                    showNumberOnHover: true,
                },
                {   
                    url: 'assets/templates-quick/templates.js',
                    path: 'assets/templates-quick/', 
                    pathReplace: [],
                    numbering: true,
                    showNumberOnHover: true,
                },
                {   
                    url: 'assets/templates-animated/templates.js',
                    path: 'assets/templates-animated/', 
                    pathReplace: [],
                    numbering: true,
                    showNumberOnHover: true,
                },
            ],

            contentStylePath: '/assets/styles/',
    
            snippetUrl: '/assets/minimalist-blocks/content.js',
            snippetPath: '/assets/minimalist-blocks/', 
            snippetPathReplace: ['assets/','/assets/'], /* for snippets */
            modulePath: '/assets/modules/',
            assetPath: '/assets/', // Used for the location of ionicons/
            fontAssetPath: '/assets/fonts/',

            slider: 'glide',
            navbar: true,
            onChange: ()=>{
                // Auto save
                clearInterval(intervalId);
                intervalId = setInterval(()=>{
                    // Check for change every 3s
                    let html = obj.htmlCheck();
                    if(previousHtml!==html) { // Save only if content changed
                        if(previousHtml) {// empty previousHtml means the current is initial content (no need to save)
                            save(); 
                        }
                        previousHtml=html;
                    } 
                }, 3000);
            },
            onUploadCoverImage: (e) => {
                uploadFile(e, (response)=>{
                    if(!response.error) {
                        const uploadedImageUrl = response.url;
                        if(uploadedImageUrl) obj.boxImage(uploadedImageUrl);
                    }
                });
            },
            onMediaUpload: (e)=>{
                uploadFile(e, (response)=>{
                    if(!response.error) {
                        const uploadedImageUrl = response.url; 
                        if(uploadedImageUrl) obj.returnUrl(uploadedImageUrl);
                    }
                });
            },
            onVideoUpload: (e)=>{
                uploadFile(e, (response)=>{
                    if(!response.error) {
                        const uploadedFileUrl = response.url;
                        if(uploadedFileUrl) obj.returnUrl(uploadedFileUrl);
                    }
                });
            },  
            onAudioUpload: (e)=>{
                uploadFile(e, (response)=>{
                    if(!response.error) {
                        const uploadedFileUrl = response.url;
                        if(uploadedFileUrl) obj.returnUrl(uploadedFileUrl);
                    }
                });
            },  
        });

        // Adding custom buttons
        obj.addButton({ 
            'pos': 2,
            'title': 'Animation',
            'html': '<svg class="is-icon-flex" style="fill:rgba(0, 0, 0, 0.7);width:14px;height:14px;"><use xlink:href="#icon-wand"></use></svg>', 
            'onClick': ()=>{
                obj.openAnimationPanel();
            }
        });
        obj.addButton({ 
            'pos': 3,
            'title': 'Timeline Editor',
            'html': '<svg><use xlink:href="#icon-anim-timeline"></use></svg>', 
            'onClick': ()=>{
                obj.openAnimationTimeline();
            }
        });
        // obj.addButton({ 
        //     'pos': 5,
        //     'title': 'Settings',
        //     'html': '<svg class="is-icon-flex" style="width:15px;height:15px;"><use xlink:href="#icon-settings"></use></svg>', // icon
        //     'onClick': (e)=>{
        //         obj.openSettings(e);
        //     }
        // });
        obj.addButton({ 
            'pos': 5,
            'title': 'Clear Content',
            'html': '<svg class="is-icon-flex"><use xlink:href="#icon-eraser"></use></svg>', 
            'onClick': (e)=>{
                obj.clear();
            }
        });
        if(enableAiAssistant) {
            obj.addButton({ 
                'pos': 6,
                'title': 'AI Assistant',
                'html': '<svg class="is-icon-flex" style="width:16px;height:16px;"><use xlink:href="#icon-message"></use></svg>', 
                'onClick': (e)=>{
            
                    obj.openAIAssistant();
            
                }
            });
        }

        //Get slug from query string ?page=slug
        let search = window.location.search;
        let params = new URLSearchParams(search);
        setSearchParams(params);
        let slug = params.get('page');
        if(!slug) slug = '';
        setPageName(slug);

        const reqBody = { slug };
        let result = await fetch('/api/content', {
            method:'POST',
            body: JSON.stringify(reqBody),
            header: {
                'Content-Type': 'application/json'
            }
        });
        result = await result.json();
        if(!result.error) { 
            //Load content
            let contentHtml = result.content.html || '';
            const mainCss = result.content.mainCss || '';
            const sectionCss = result.content.sectionCss || '';

            sePagetHtml(contentHtml);

            let generateOk = params.get('generate');
            if(generateOk==='ok') {
                if(contentHtml.trim()!=='') {
                    // alert(`Existing content exists on the '${slug?slug:'home'}' page. The generated page will be added to the existing content.`);
                    setConfirmShow(true);
                } else {
                    contentHtml = localStorage.getItem('mypage');
                    obj.loadHtml(contentHtml); // Load html
                }
            } else {
                obj.loadHtml(contentHtml); // Load html
            }

            obj.loadStyles(mainCss, sectionCss); // Load styles
        }

        document.querySelector('.custom-topbar').style.opacity = '';
        document.querySelector(`.custom-topbar [data-device=${obj.screenMode}]`).classList.add('on');

        builderRef.current = obj;

    }

    function handleAdd() {
        let html = localStorage.getItem('mypage') + pageHtml;
        builderRef.current.loadHtml(html); // Load html

        setConfirmShow(false)
    }
    
    function handleReplace() {
        let html = localStorage.getItem('mypage');
        builderRef.current.loadHtml(html); // Load html

        setConfirmShow(false)
    }

    async function uploadFile(e, callback) {

        const selectedFile = e.target.files[0];

        const formData = new FormData();
        formData.append('file', selectedFile);
        await fetch('/api/asset-upload', {
          method: 'POST',
          body: formData,
        })
        .then(response=>response.json())
        .then(data=>{
            if(callback) callback(data);
        });
    }

    function back() {

        // let generateOk = searchParams.get('generate');
        // if(generateOk==='ok') {
        //     window.history.back();
        // }

        // window.close();
        window.location.href = '/dashboard';
    }

    function generate() {
       window.location.href = '/generate?page='+searchParams.get('page');
    }

    function undo(e) {
        builderRef.current.undo();
    }

    function redo(e) {
        builderRef.current.redo();
    }

    function preview() {
        let html = builderRef.current.html();
        localStorage.setItem('preview-html', html); 
        let mainCss = builderRef.current.mainCss(); 
        localStorage.setItem('preview-maincss', mainCss); 
        let sectionCss = builderRef.current.sectionCss();
        localStorage.setItem('preview-sectioncss', sectionCss);

        window.open('/preview.html', '_blank').focus();
    }

    function togglePanel() {
        builderRef.current.toggleEditPanel();
    }

    function download() {
        builderRef.current.download();
    }

    function viewHtml() {
        builderRef.current.viewHtml();
    }

    function setScreenMode(e) {
        document.querySelectorAll('.custom-topbar [data-device]').forEach(btn=>btn.classList.remove('on'));

        const btn = e.target.closest('button');
        const screenMode = btn.getAttribute('data-device');

        // if(screenMode==='fullview' && builderRef.current.screenMode==='fullview') {
        //     // toggle
        //     builderRef.current.setScreenMode('desktop');
        //     document.querySelector('.custom-topbar [data-device=desktop]').classList.add('on');
        // } else {
        //     builderRef.current.setScreenMode(screenMode);
        //     btn.classList.add('on');
        // }
        builderRef.current.setScreenMode(screenMode);
        btn.classList.add('on');
    }

    async function save(e) {
     
        if(e) {
            e.preventDefault();
    
            setNotif({mode: 'wait', text: 'Saving..'});
        }

        builderRef.current.saveImages('', async ()=>{

            //Save content
            let html = builderRef.current.html();
            let mainCss = builderRef.current.mainCss(); // Default typography style for the page
            let sectionCss = builderRef.current.sectionCss(); // Typography styles for the sections

            //To update preview
            localStorage.setItem('preview-html', html); 
            localStorage.setItem('preview-maincss', mainCss); 
            localStorage.setItem('preview-sectioncss', sectionCss);

            //Get slug from query string ?page=slug
            let search = window.location.search;
            let params = new URLSearchParams(search);
            let slug = params.get('page');
            if(!slug) slug = '';

            const reqBody = { action: 'save', slug: slug, html: html, mainCss: mainCss, sectionCss: sectionCss };
            let result = await fetch('/api/content', {
                method:'POST',
                body: JSON.stringify(reqBody),
                header: {
                    'Content-Type': 'application/json'
                }
            });
            result = await result.json();
            if(!result.error) { 
                setNotif({});
            } else {
                setNotif({mode: 'error', text: result.error});
                setTimeout(()=>{
                    setNotif({});
                }, 2000);
            }

        }, async (img, base64, filename)=>{

            // Upload base64 images
            const reqBody = { image: base64, filename: filename };
            let result = await fetch('/api/asset-uploadbase64', {
                method:'POST',
                body: JSON.stringify(reqBody),
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            result = await result.json();
            if(!result.error) { 
                const uploadedImageUrl = result.url;
                img.setAttribute('src', uploadedImageUrl); // Update image src
            }
            
        });
    }

    async function publish(e) {
        e.preventDefault();
        
        setNotif({mode: 'wait', text: 'Publishing..'});

        //Save content
        let html = builderRef.current.html();
        let mainCss = builderRef.current.mainCss(); // Default typography style for the page
        let sectionCss = builderRef.current.sectionCss(); // Typography styles for the sections

        //To update preview
        localStorage.setItem('preview-html', html); 
        localStorage.setItem('preview-maincss', mainCss); 
        localStorage.setItem('preview-sectioncss', sectionCss);

        //Get slug from query string ?page=slug
        let search = window.location.search;
        let params = new URLSearchParams(search);
        let slug = params.get('page');
        if(!slug) slug = '';

        const reqBody = { slug: slug, html: html, mainCss: mainCss, sectionCss: sectionCss };
        let result = await fetch('/api/contentpublish', {
            method:'POST',
            body: JSON.stringify(reqBody),
            header: {
                'Content-Type': 'application/json'
            }
        });
        result = await result.json();
        if(!result.error) { 
            setNotif({});
        } else {
            setNotif({mode: 'error', text: result.error});
            setTimeout(()=>{
                setNotif({});
            }, 2000);
        }
    }

    function addExternalStyles(arrStyle) {
        const includes = document.head.querySelectorAll('[data-my-css-link]');
        includes.forEach((link) => {
            link.parentNode.removeChild(link); // Remove existing
        });
        for(let i=0;i<=arrStyle.length-1;i++){
            const url = arrStyle[i];
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.setAttribute('data-my-css-link','');
            link.href = url;
            document.head.appendChild(link);
        }
    }

    if(props.invalidDomain) {
        return <>Invalid Domain</>;
    }

    return (
        <>
            <Head>
                <title>Edit Content</title>
                <meta name="description" content="Edit Content" />
                <link rel="icon" href="/images/favicon.ico" />
            </Head>

            <AddConfirm show={confirmShow} slug={pageName} onAdd={handleAdd} onReplace={handleReplace} />

            <div className="builder-ui keep-selection custom-topbar" style={{opacity:'0'}} data-tooltip>
                <div>
                    
                </div>
                <div>
                    <button className="btn-back" onClick={back} title="Back">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-back"></use></svg>
                        ` }} />
                        <span>Dashboard</span>
                    </button>

                    {/* <button className="btn-back" onClick={generate} title="Generate">
                        <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  strokeWidth="2"  strokeLinecap="round"  strokeLinejoin="round"  className="w-4 h-4"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" /></svg>
                        
                        <span>Generate</span>
                    </button> */}

                    <div className="separator"></div>

                    <button className="btn-undo" onClick={undo} title="Undo">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-undo"></use></svg>
                        ` }} />
                    </button>

                    <button className="btn-redo" onClick={redo} title="Redo">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-redo"></use></svg>
                        ` }} />
                    </button>

                    <button className='button-normal bg-white hover:bg-white/60' onClick={save} title="Save">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-save"></use></svg>
                        ` }} />
                        <span>Save</span>
                    </button>
                    
                    <button className='button-normal bg-white hover:bg-white/60' style={{marginLeft:'7px'}} onClick={publish} title="Publish">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-publish"></use></svg>
                        ` }} />
                        <span>Publish</span>
                    </button>
                </div>
                <div>

                    <button className="btn-device-desktop-large" data-device="desktop-lg" onClick={setScreenMode} title="Desktop - Large Screen">
                        <div dangerouslySetInnerHTML={{ __html: `
                            <svg style="width:18px;height:18px;"><use xlink:href="#icon-device-desktop"></use></svg>
                        ` }} />
                    </button>
                    <button className="btn-device-desktop" data-device="desktop" onClick={setScreenMode} title="Desktop / Laptop">
                        <div dangerouslySetInnerHTML={{ __html: `
                            <svg style="width:18px;height:18px;"><use xlink:href="#icon-device-laptop"></use></svg>
                        ` }} />
                    </button>
                    <button className="btn-device-tablet-landscape" data-device="tablet-landscape" onClick={setScreenMode} title="Tablet - Landscape">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg style="width:18px;height:18px;transform:rotate(-90deg)"><use xlink:href="#icon-device-tablet"></use></svg>
                        ` }} />
                    </button>
                    <button className="btn-device-tablet" data-device="tablet" onClick={setScreenMode} title="Tablet - Portrait">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg  style="width:18px;height:18px;"><use xlink:href="#icon-device-tablet"></use></svg>
                        ` }} />
                    </button>
                    <button className="btn-device-mobile" data-device="mobile" onClick={setScreenMode} title="Mobile">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg  style="width:18px;height:18px;"><use xlink:href="#icon-device-mobile"></use></svg>
                        ` }} />
                    </button>
                    <button className="btn-fullview" data-device="fullview" onClick={setScreenMode} title="Full View">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg  style="width:18px;height:18px;"><use xlink:href="#icon-fullview"></use></svg>
                        ` }} />
                    </button>

                    <div className="separator"></div>

                    {/* <button className="btn-download" onClick={download} title="Download">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-code"></use></svg>
                        ` }} />
                    </button> */}

                    <button className="btn-html" onClick={viewHtml} title="HTML">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-code"></use></svg>
                        ` }} />
                    </button>

                    <button className="btn-preview" onClick={preview} title="Preview">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-eye"></use></svg>
                        ` }} />
                    </button>
                    
                    <div className="separator"></div>

                    <button className="btn-togglepanel" data-button="togglepanel" onClick={togglePanel} title="Toggle Edit Panel">
                        <div dangerouslySetInnerHTML={{ __html: `
                        <svg><use xlink:href="#icon-pencil"></use></svg>
                        ` }} />
                    </button>
                </div>
            </div>

            <RenderCssIncludes cssIncludes={[
              { css: "/assets/minimalist-blocks/content.css" }, // tailwind: content-tailwind.css
              { css: "/box/box-flex.css" },
              { css: "/assets/scripts/glide/css/glide.core.css" },
              { css: "/assets/scripts/glide/css/glide.theme.css" },
              { css: "/assets/scripts/navbar/navbar.css" }]}/>

            <RenderCssIncludes cssIncludes={props.cssIncludes}/>

            <div className="is-wrapper" style={{opacity: 0}}>
            </div>

            {/* <div className='fixed top-7 right-7 flex'>
                <button className='button-normal bg-white hover:bg-white/60' onClick={save}>Save</button>
                <button className='button-normal bg-white hover:bg-white/60' style={{marginLeft:'7px'}} onClick={publish}>Publish</button>
            </div> */}

            <RenderJsIncludes jsIncludes={props.jsIncludes}/>
            <Script src="assets/scripts/glide/glide.js" />
            <Script src="/assets/scripts/navbar/navbar.min.js" />
            <Notif mode={notif.mode} text={notif.text} duration={notif.duration} />


        </>
    )
}

export async function getServerSideProps(context) {
    const site = await getSiteByDomain(context);
    const mainHost = site.props.mainHost;
    const domainName = site.props.domainName;
    const owner = site.props.owner;
    const slug = context.query.page;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const GETIMG_API_KEY = process.env.GETIMG_API_KEY;
    const aiAssistant = OPENAI_API_KEY?true:false;
    const aiImageGeneration = GETIMG_API_KEY?true:false;

    let client = await connectDatabase();
    const db = client.db();
    const page = await db.collection('pages').findOne({
        username: owner,
        slug: slug
    });

    await client.close();
    
    return { 
        props: { 
            mainHost: mainHost,
            domainName: domainName,
            owner: owner,
            cssIncludes: page?page.cssIncludes?page.cssIncludes:'':'',
            jsIncludes: page?page.jsIncludes?page.jsIncludes:'':'',
            captchaSiteKey: site.props.captchaSiteKey,
            aiAssistant,
            aiImageGeneration
        } 
    };
}