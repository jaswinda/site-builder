import { useState, useEffect } from 'react';
import { hasCookie, setCookie } from "cookies-next";

const CookieConsent = (props) => {
    const [showConsent, setShowConsent] = useState(true);

    useEffect(() => {
        setShowConsent(hasCookie('localConsent'));
    }, []);

    const acceptCookie = () => {
        setShowConsent(true);
        setCookie('localConsent', 'true', {});
    };

    if (showConsent) {
        return null;
    }

    return (
            <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center px-4 py-8 bg-white border-t border-gray-400">
                <span className="text-dark text-base mr-16">
                This website uses cookies to enhance the user experience.
                </span>
                <button className="bg-gray-800 py-2 px-8 rounded text-white whitespace-nowrap" onClick={() => acceptCookie()}>
                I understand
                </button>
            </div>
    );
};

export default CookieConsent;