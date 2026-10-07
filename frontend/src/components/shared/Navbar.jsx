import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({
    user = null,
    onLogout = null,
    title = 'OSTUDIO'
}) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            if (onLogout) {
                await onLogout();
            } else {
                localStorage.removeItem('ostudio_user');
                localStorage.removeItem('ostudioUser');
                localStorage.removeItem('ostudio_active_project');
                localStorage.removeItem('ostudio_coord_active_proj');

                navigate('/login', { replace: true });
            }
        } catch (error) {
            console.error('❌ Logout Error:', error);
        }
    };

    const getRoleName = (role) => {
        switch (role) {
            case 'admin':
                return 'Admin';

            case 'manager':
                return 'Manager';

            case 'account_manager':
                return 'Account Manager';

            case 'coordinator':
                return 'Coordinator';

            case 'designer':
                return 'Designer';

            default:
                return 'User';
        }
    };

    const handleLogoClick = () => {
        if (!user?.role) {
            navigate('/login');
            return;
        }

        switch (user.role) {
            case 'admin':
                navigate('/admin/dashboard');
                break;

            case 'manager':
                navigate('/manager/dashboard');
                break;

            case 'account_manager':
                navigate('/account-manager/dashboard');
                break;

            case 'coordinator':
                navigate('/coordinator/dashboard');
                break;

            case 'designer':
                navigate('/designer/dashboard');
                break;

            default:
                navigate('/login');
        }
    };

    return (
        <>
            <nav className="ostudio-navbar">
                <div className="ostudio-navbar-left">
                    <button
                        type="button"
                        className="ostudio-logo-button"
                        onClick={handleLogoClick}
                        aria-label="Go to dashboard"
                    >
                        {title}
                    </button>
                </div>

                <div className="ostudio-navbar-right">
                    {user && (
                        <div className="ostudio-user-info">
                            <div className="ostudio-user-text">
                                <span className="ostudio-user-name">
                                    {user.name || 'User'}
                                </span>

                                <span className="ostudio-user-role">
                                    {getRoleName(user.role)}
                                </span>
                            </div>

                            <div className="ostudio-user-avatar">
                                {(user.name || 'U')
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="ostudio-logout-button"
                        onClick={handleLogout}
                    >
                        تسجيل الخروج
                    </button>
                </div>
            </nav>

            <style>{`
                .ostudio-navbar {
                    width: 100%;
                    min-height: 70px;
                    padding: 0 32px;
                    box-sizing: border-box;

                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    background: #ffffff;
                    border-bottom: 1px solid #e5e7eb;

                    position: sticky;
                    top: 0;
                    z-index: 1000;

                    direction: rtl;
                }

                .ostudio-navbar-left {
                    display: flex;
                    align-items: center;
                }

                .ostudio-logo-button {
                    border: none;
                    background: transparent;
                    padding: 0;

                    font-size: 24px;
                    font-weight: 800;
                    letter-spacing: 1px;

                    color: #111827;
                    cursor: pointer;
                }

                .ostudio-logo-button:hover {
                    opacity: 0.75;
                }

                .ostudio-navbar-right {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                }

                .ostudio-user-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .ostudio-user-text {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    line-height: 1.25;
                }

                .ostudio-user-name {
                    font-size: 14px;
                    font-weight: 700;
                    color: #111827;
                }

                .ostudio-user-role {
                    margin-top: 3px;
                    font-size: 12px;
                    color: #6b7280;
                }

                .ostudio-user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background: #111827;
                    color: #ffffff;

                    font-size: 15px;
                    font-weight: 700;

                    flex-shrink: 0;
                }

                .ostudio-logout-button {
                    border: 1px solid #e5e7eb;
                    background: #ffffff;
                    color: #111827;

                    padding: 9px 16px;
                    border-radius: 8px;

                    font-size: 13px;
                    font-weight: 600;

                    cursor: pointer;
                    transition:
                        background 0.2s ease,
                        color 0.2s ease,
                        border-color 0.2s ease;
                }

                .ostudio-logout-button:hover {
                    background: #111827;
                    color: #ffffff;
                    border-color: #111827;
                }

                @media (max-width: 700px) {
                    .ostudio-navbar {
                        min-height: 64px;
                        padding: 0 16px;
                    }

                    .ostudio-logo-button {
                        font-size: 20px;
                    }

                    .ostudio-user-text {
                        display: none;
                    }

                    .ostudio-navbar-right {
                        gap: 10px;
                    }

                    .ostudio-user-avatar {
                        width: 36px;
                        height: 36px;
                    }

                    .ostudio-logout-button {
                        padding: 8px 11px;
                        font-size: 12px;
                    }
                }
            `}</style>
        </>
    );
};

export default Navbar;