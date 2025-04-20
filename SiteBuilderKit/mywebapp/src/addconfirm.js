import { useEffect, useRef } from 'react';
import styles from '../styles/Dashboard.module.css';

function AddConfirm(props) {
    const replaceButtonRef = useRef(null);

    useEffect(() => {
        if (props.show) {
            replaceButtonRef.current?.focus();
        }
    }, [props.show]);

    return (<>
        {props.show && (
            <div className="fixed inset-0 bg-white/40 z-[10005]">
                <div className={`${styles.dashboard} fixed inset-0 z-10 overflow-y-auto flex justify-center items-center`}>
                    <div className={`${styles.modal}`}>
                        <p className="text-2xl font-semibold">
                            There is existing content on the '{props.slug ? props.slug : "home"}' page. 
                        </p>
                        <p className="text-xl">
                            Do you want to replace the existing content, or should the new content be added?
                        </p>
                        <div className="flex">
                            <button className="focus:ring-2 focus:ring-offset-2 text-base px-8 py-3 bg-gray-200 p-2 px-3 text-sm rounded-full focus:outline-none mt-6 m-4 flex items-center" onClick={props.onReplace} title="Replace" style={{ 
                                        ring: `4px solid #3e93f7`
                                    }}>
                                Replace
                            </button>
                            <button ref={replaceButtonRef} className="focus:ring-2 focus:ring-offset-2 text-base px-8 py-3 bg-gray-200 p-2 px-3 text-sm rounded-full focus:outline-none mt-6 m-4 flex items-center" onClick={props.onAdd} title="Add" style={{ 
                                        ring: `4px solid #3e93f7`
                                    }}>
                                Add to Existing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </>
    )
}

export default AddConfirm;