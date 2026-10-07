import React from 'react';

const Loading = ({
    message = 'جاري التحميل...',
    fullScreen = false
}) => {
    return (
        <div
            style={{
                minHeight: fullScreen ? '100vh' : '200px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '14px',
                padding: '30px',
                boxSizing: 'border-box',
                background: fullScreen ? '#ffffff' : 'transparent'
            }}
        >
            <div
                style={{
                    width: '42px',
                    height: '42px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #111827',
                    borderRadius: '50%',
                    animation: 'ostudio-loading-spin 0.8s linear infinite'
                }}
            />

            <p
                style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#4b5563',
                    textAlign: 'center'
                }}
            >
                {message}
            </p>

            <style>
                {`
                    @keyframes ostudio-loading-spin {
                        from {
                            transform: rotate(0deg);
                        }

                        to {
                            transform: rotate(360deg);
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default Loading;