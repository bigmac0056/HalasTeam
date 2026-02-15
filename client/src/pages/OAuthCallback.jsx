import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const exchangedRef = useRef(false);

    useEffect(() => {
        // Guard against React Strict Mode double-invocation
        if (exchangedRef.current) return;

        const code = searchParams.get('code');
        const error = searchParams.get('error');

        const exchangeCode = async (code) => {
            exchangedRef.current = true;
            try {
                const API = (await import('../api/api')).default;
                const res = await API.post('/oauth/google/exchange', { code });

                localStorage.setItem('token', res.data.token);
                window.dispatchEvent(new Event('auth-changed'));
                navigate('/dashboard', { replace: true });
            } catch (err) {
                console.error('OAuth exchange failed', err);
                navigate('/login?error=exchange_failed', { replace: true });
            }
        };

        if (code) {
            exchangeCode(code);
        } else if (error) {
            navigate('/login?error=' + error, { replace: true });
        } else {
            navigate('/login', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-text-muted-light dark:text-text-muted-dark">Authenticating...</p>
            </div>
        </div>
    );
}
